"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { AgentCanvas } from "@/components/AgentCanvas";
import { MemoryModal } from "@/components/MemoryModal";
import { CommandPalette } from "@/components/CommandPalette";
import { DevHubModal } from "@/components/DevHubModal";
import { SettingsModal } from "@/components/SettingsModal";
import { IntelligenceCanvas } from "@/components/IntelligenceCanvas";
import { SpatialIntelligenceCanvas } from "@/components/SpatialIntelligenceCanvas";
import { PluginsAndApiHub } from "@/components/PluginsAndApiHub";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  StudioMode,
  Session,
  ChatMessage,
  KnowledgeMemoryItem,
  Attachment,
  UserSettings,
  ThinkingBudget,
  AgentThought,
} from "@/lib/types";
import { generateId } from "@/lib/utils";
import { sound } from "@/lib/sound";
import { sanitizeUserInput } from "@/lib/sanitizer";
import { useModels, useModelSelection } from "@/lib/client/models";
import {
  ErrorChatMessage,
  StoppedChatMessage,
  buildHistory,
  requestAgent,
  settleStoppedSteps,
  upsertStep,
} from "@/lib/client/agent";

const DEFAULT_SETTINGS: UserSettings = {
  geminiKey: "",
  anthropicKey: "",
  openAiKey: "",
  groqKey: "",
  ollamaBaseUrl: "http://localhost:11434",
  customEndpointUrl: "",
  customModelName: "",
  activeProvider: "gemini",
  enabledTools: [],
  defaultThinkingBudget: "analytical",
};

export default function Home() {
  const [currentMode, setCurrentMode] = useState<StudioMode>("research");
  const {
    models,
    status: modelsStatus,
    error: modelsError,
    refetch: refetchModels,
  } = useModels();
  const [currentModel, setCurrentModel] = useModelSelection(models);
  const noProvider = modelsStatus === "ready" && models.length === 0;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamingThoughts, setStreamingThoughts] = useState<AgentThought[]>(
    [],
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Modals state
  const [isMemoryOpen, setIsMemoryOpen] = useState<boolean>(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);
  const [isDevHubOpen, setIsDevHubOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const [memoryItems, setMemoryItems] = useState<KnowledgeMemoryItem[]>([]);
  const [userSettings, setUserSettings] =
    useState<UserSettings>(DEFAULT_SETTINGS);

  // Keyboard shortcut listener (⌘K for palette, ⌘J for context memory, ⌘D for dev hub, ⌘, for settings)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setIsMemoryOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        setIsDevHubOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  // Load saved memory, sessions, and settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("nova_settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as Partial<UserSettings>;
        // Only the thinking budget is a client setting. Provider keys live in the server's .env,
        // so drop any keys an older version of the UI stored in the browser.
        const cleaned: UserSettings = {
          ...DEFAULT_SETTINGS,
          defaultThinkingBudget:
            parsed.defaultThinkingBudget ??
            DEFAULT_SETTINGS.defaultThinkingBudget,
        };
        // localStorage is client-only, so hydrate after mount to avoid an SSR mismatch.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUserSettings(cleaned);
        localStorage.setItem("nova_settings", JSON.stringify(cleaned));
      }

      const savedMem = localStorage.getItem("nova_memory");
      if (savedMem) {
        // Older versions seeded two invented "memories" that were sent as context with every prompt.
        const seeded: Record<string, string> = {
          "mem-1": "Preferred Architecture",
          "mem-2": "Core Philosophy",
        };
        const items = (JSON.parse(savedMem) as KnowledgeMemoryItem[]).filter(
          (m) => seeded[m.id] !== m.title,
        );
        setMemoryItems(items);
        localStorage.setItem("nova_memory", JSON.stringify(items));
      }

      const savedSessions = localStorage.getItem("nova_sessions");
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      }
    } catch (e) {
      console.warn("LocalStorage error:", e);
    }
  }, []);

  // Save settings changes
  const handleSaveSettings = (newSettings: UserSettings) => {
    setUserSettings(newSettings);
    try {
      localStorage.setItem("nova_settings", JSON.stringify(newSettings));
    } catch {}
  };

  // Delete session / workspace
  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) {
      setActiveSessionId(updated[0]?.id || "");
    }
    try {
      localStorage.setItem("nova_sessions", JSON.stringify(updated));
    } catch {}
  };

  // Rename session
  const handleRenameSession = (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    const finalTitle = trimmed || "Untitled Session";
    const updated = sessions.map((s) =>
      s.id === id
        ? {
            ...s,
            title: finalTitle,
            updatedAt: new Date().toISOString(),
          }
        : s,
    );
    setSessions(updated);
    try {
      localStorage.setItem("nova_sessions", JSON.stringify(updated));
    } catch {}
  };

  // Duplicate session
  const handleDuplicateSession = (id: string) => {
    const original = sessions.find((s) => s.id === id);
    if (!original) return;
    const originalTitle = original.title || "Untitled Session";
    const now = new Date().toISOString();
    const clonedSession: Session = {
      ...original,
      id: generateId(),
      title: `${originalTitle} (Copy)`,
      createdAt: now,
      updatedAt: now,
      messages: original.messages.map((m) => ({ ...m })),
    };
    const updated = [clonedSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(clonedSession.id);
    setCurrentMode(clonedSession.mode);
    try {
      localStorage.setItem("nova_sessions", JSON.stringify(updated));
    } catch {}
  };

  const handleImportSessions = (importedSessions: Session[]) => {
    sound.playSuccess();
    const existingIds = new Set(sessions.map((s) => s.id));
    const newItems = importedSessions.filter((s) => !existingIds.has(s.id));
    const merged = [...newItems, ...sessions];
    setSessions(merged);
    if (newItems.length > 0) {
      setActiveSessionId(newItems[0].id);
      setCurrentMode(newItems[0].mode);
    }
    try {
      localStorage.setItem("nova_sessions", JSON.stringify(merged));
    } catch {}
  };

  // Save memory changes
  const handleSaveMemoryItem = (item: KnowledgeMemoryItem) => {
    sound.playCheck();
    const updated = [item, ...memoryItems];
    setMemoryItems(updated);
    try {
      localStorage.setItem("nova_memory", JSON.stringify(updated));
    } catch {}
  };

  const handleSaveMemoryItems = (items: KnowledgeMemoryItem[]) => {
    sound.playCheck();
    const newIds = new Set(items.map((i) => i.id));
    const filtered = memoryItems.filter((m) => !newIds.has(m.id));
    const updated = [...items, ...filtered];
    setMemoryItems(updated);
    try {
      localStorage.setItem("nova_memory", JSON.stringify(updated));
    } catch {}
  };

  const handleDeleteMemoryItem = (id: string) => {
    sound.playCheck();
    const updated = memoryItems.filter((m) => m.id !== id);
    setMemoryItems(updated);
    try {
      localStorage.setItem("nova_memory", JSON.stringify(updated));
    } catch {}
  };

  const handleDeleteMemoryItems = (ids: string[]) => {
    sound.playCheck();
    const idSet = new Set(ids);
    const updated = memoryItems.filter((m) => !idSet.has(m.id));
    setMemoryItems(updated);
    try {
      localStorage.setItem("nova_memory", JSON.stringify(updated));
    } catch {}
  };

  // Active session helper
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const currentMessages = activeSession ? activeSession.messages : [];

  const handleNewSession = () => {
    sound.playStart();
    const newSession: Session = {
      id: generateId(),
      title: "New session",
      mode: currentMode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    try {
      localStorage.setItem("nova_sessions", JSON.stringify(updated));
    } catch {}
  };

  const handleSelectSession = (id: string) => {
    sound.playCheck();
    setActiveSessionId(id);
    const s = sessions.find((sess) => sess.id === id);
    if (s) {
      setCurrentMode(s.mode);
    }
  };

  const appendMessage = (
    sessId: string,
    msg: ChatMessage | ErrorChatMessage | StoppedChatMessage,
  ) => {
    setSessions((prev) => {
      const next = prev.map((s) =>
        s.id === sessId
          ? {
              ...s,
              updatedAt: new Date().toISOString(),
              messages: [...s.messages, msg],
            }
          : s,
      );
      try {
        localStorage.setItem("nova_sessions", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handlePromptSubmit = async (
    promptText: string,
    attachments?: Attachment[],
    thinkingBudget?: ThinkingBudget,
    mode: StudioMode = currentMode,
  ) => {
    const sanitized = sanitizeUserInput(promptText);
    const cleanPrompt = sanitized.text;

    let sessId = activeSessionId;
    let currentSess = sessions.find((s) => s.id === sessId);

    if (!currentSess) {
      const newSession: Session = {
        id: generateId(),
        title: (cleanPrompt || attachments?.[0]?.name || "Workspace").slice(
          0,
          36,
        ),
        mode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      sessId = newSession.id;
      currentSess = newSession;
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(sessId);
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: cleanPrompt || "Attached documents for analysis",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      mode,
      attachments:
        attachments && attachments.length > 0 ? attachments : undefined,
    };

    const updatedWithUser = {
      ...currentSess,
      title:
        currentSess.messages.length === 0
          ? (cleanPrompt || "Workspace").slice(0, 36)
          : currentSess.title,
      messages: [...currentSess.messages, userMsg],
      updatedAt: new Date().toISOString(),
    };

    setSessions((prev) =>
      prev.map((s) => (s.id === sessId ? updatedWithUser : s)),
    );
    setIsLoading(true);
    setStreamingThoughts([]);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let thoughtsAccumulator: AgentThought[] = [];

    try {
      const contextStr = memoryItems
        .map((m) => `[${m.title}]: ${m.content}`)
        .join("\n");
      const history = buildHistory(currentSess.messages);

      const outcome = await requestAgent(
        {
          prompt: cleanPrompt,
          mode,
          context: contextStr,
          model: currentModel || undefined,
          attachments,
          thinkingBudget: thinkingBudget || userSettings.defaultThinkingBudget,
          history,
        },
        {
          signal: controller.signal,
          onStep: (step) => {
            thoughtsAccumulator = upsertStep(thoughtsAccumulator, step);
            setStreamingThoughts(thoughtsAccumulator);
          },
        },
      );

      if (outcome.kind === "error") {
        const { message, code } = outcome;
        // The server says nothing is configured; refresh the model list so onboarding appears.
        if (code === "NO_PROVIDER") refetchModels();
        appendMessage(sessId, {
          id: generateId(),
          role: "assistant",
          content: message,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          mode,
          errorCode: code,
          thoughts:
            thoughtsAccumulator.length > 0 ? thoughtsAccumulator : undefined,
        });
        return;
      }

      const ok = outcome.data;
      sound.playSuccess();

      appendMessage(sessId, {
        id: generateId(),
        role: "assistant",
        content: typeof ok.content === "string" ? ok.content : "",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        mode,
        thoughts: Array.isArray(ok.thoughts)
          ? ok.thoughts
          : thoughtsAccumulator.length > 0
            ? thoughtsAccumulator
            : undefined,
        artifact: ok.artifact,
        telemetry: ok.telemetry,
      });
    } catch (err: unknown) {
      if (
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === "AbortError") ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        appendMessage(sessId, {
          id: generateId(),
          role: "assistant",
          content: "The request was stopped before it finished.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          mode,
          thoughts: settleStoppedSteps(thoughtsAccumulator),
          stopped: true,
        });
        return;
      }
      console.error("Agent request failed:", err);
      appendMessage(sessId, {
        id: generateId(),
        role: "assistant",
        content:
          "Could not reach the Nova server. Check that it is still running, then try again.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        mode,
        errorCode: "NETWORK",
      });
    } finally {
      setIsLoading(false);
      setStreamingThoughts([]);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleApplyPreset = (presetPrompt: string, mode: StudioMode) => {
    setCurrentMode(mode);
    handlePromptSubmit(presetPrompt, undefined, undefined, mode);
  };

  return (
    <ErrorBoundary>
      <div className="h-screen max-h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
        {/* Top Navigation */}
        <Navbar
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
          onOpenMemory={() => setIsMemoryOpen(true)}
          onOpenPalette={() => setIsPaletteOpen(true)}
          onNewSession={handleNewSession}
          memoryCount={memoryItems.length}
          models={models}
          modelsStatus={modelsStatus}
          currentModel={currentModel}
          onSelectModel={setCurrentModel}
        />

        {/* Main Workspace Layout */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <Sidebar
            currentMode={currentMode}
            onSelectMode={setCurrentMode}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            onDuplicateSession={handleDuplicateSession}
            onApplyPrompt={handleApplyPreset}
            onOpenDevHub={() => setIsDevHubOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onImportSessions={handleImportSessions}
          />

          {currentMode === "intelligence" ? (
            <IntelligenceCanvas
              memoryItems={memoryItems}
              onSaveMemoryItems={handleSaveMemoryItems}
              onDeleteMemoryItems={handleDeleteMemoryItems}
            />
          ) : currentMode === "mcp" ? (
            <PluginsAndApiHub />
          ) : currentMode === "canvas" ? (
            <SpatialIntelligenceCanvas
              session={activeSession || null}
              onSelectMode={setCurrentMode}
              onInspectArtifact={() => {
                // If user selects an artifact from canvas, they can switch or inspect
              }}
            />
          ) : (
            <AgentCanvas
              messages={currentMessages}
              currentMode={currentMode}
              isLoading={isLoading}
              streamingThoughts={streamingThoughts}
              onStop={handleStop}
              onSubmitPrompt={handlePromptSubmit}
              onSelectMode={setCurrentMode}
              sessionTitle={activeSession?.title}
              defaultThinkingBudget={userSettings.defaultThinkingBudget}
              noProvider={noProvider}
              modelsError={modelsStatus === "error" ? modelsError : null}
              isCheckingModels={modelsStatus === "loading"}
              onCheckModels={refetchModels}
            />
          )}
        </div>

        {/* Modern Command Palette (⌘K) */}
        <CommandPalette
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          onSelectMode={setCurrentMode}
          onOpenMemory={() => setIsMemoryOpen(true)}
          onOpenPlugins={() => setCurrentMode("mcp")}
          onNewSession={handleNewSession}
        />

        {/* Settings Modal (⌘,) */}
        {/* Mounted only while open so it starts from the current settings each time. */}
        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={userSettings}
            onSaveSettings={handleSaveSettings}
            models={models}
            modelsStatus={modelsStatus}
            onCheckModels={refetchModels}
          />
        )}

        {/* Developer Hub (⌘D) */}
        <DevHubModal
          isOpen={isDevHubOpen}
          onClose={() => setIsDevHubOpen(false)}
        />

        {/* Personal Context Memory Modal (⌘J) */}
        <MemoryModal
          isOpen={isMemoryOpen}
          onClose={() => setIsMemoryOpen(false)}
          memoryItems={memoryItems}
          onSaveItem={handleSaveMemoryItem}
          onDeleteItem={handleDeleteMemoryItem}
        />
      </div>
    </ErrorBoundary>
  );
}
