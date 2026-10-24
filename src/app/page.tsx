'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { AgentCanvas } from '@/components/AgentCanvas';
import { MemoryModal } from '@/components/MemoryModal';
import { CommandPalette } from '@/components/CommandPalette';
import { McpInspector } from '@/components/McpInspector';
import { 
  StudioMode, 
  Session, 
  ChatMessage, 
  KnowledgeMemoryItem,
  ModelProvider,
  Attachment 
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import { sound } from '@/lib/sound';

export default function Home() {
  const [currentMode, setCurrentMode] = useState<StudioMode>('research');
  const [currentModel, setCurrentModel] = useState<ModelProvider>('gemini-2.0-flash');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Modals state
  const [isMemoryOpen, setIsMemoryOpen] = useState<boolean>(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);
  const [isMcpOpen, setIsMcpOpen] = useState<boolean>(false);
  
  const [memoryItems, setMemoryItems] = useState<KnowledgeMemoryItem[]>([]);

  // Keyboard shortcut listener (⌘K for palette, ⌘J for context memory)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsMemoryOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // Load saved memory and sessions from localStorage on mount
  useEffect(() => {
    try {
      const savedMem = localStorage.getItem('nova_memory');
      if (savedMem) {
        setMemoryItems(JSON.parse(savedMem));
      } else {
        const initialMem: KnowledgeMemoryItem[] = [
          {
            id: 'mem-1',
            title: 'Preferred Architecture',
            content: 'Local-first, modular, TypeScript + Python, zero telemetry, high agency.',
            category: 'preference',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'mem-2',
            title: 'Core Philosophy',
            content: 'Always provide tangible visual deliverables, not just plain chat walls.',
            category: 'project_context',
            createdAt: new Date().toISOString(),
          },
        ];
        setMemoryItems(initialMem);
        localStorage.setItem('nova_memory', JSON.stringify(initialMem));
      }

      const savedSessions = localStorage.getItem('nova_sessions');
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, []);

  // Save memory changes
  const handleSaveMemoryItem = (item: KnowledgeMemoryItem) => {
    sound.playCheck();
    const updated = [item, ...memoryItems];
    setMemoryItems(updated);
    try {
      localStorage.setItem('nova_memory', JSON.stringify(updated));
    } catch {}
  };

  const handleDeleteMemoryItem = (id: string) => {
    sound.playCheck();
    const updated = memoryItems.filter(m => m.id !== id);
    setMemoryItems(updated);
    try {
      localStorage.setItem('nova_memory', JSON.stringify(updated));
    } catch {}
  };

  // Active session helper
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentMessages = activeSession ? activeSession.messages : [];

  const handleNewSession = () => {
    sound.playStart();
    const newSession: Session = {
      id: generateId(),
      title: 'New Goal Workspace',
      mode: currentMode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    try {
      localStorage.setItem('nova_sessions', JSON.stringify(updated));
    } catch {}
  };

  const handleSelectSession = (id: string) => {
    sound.playCheck();
    setActiveSessionId(id);
    const s = sessions.find(sess => sess.id === id);
    if (s) {
      setCurrentMode(s.mode);
    }
  };

  const handlePromptSubmit = async (promptText: string, attachments?: Attachment[]) => {
    let sessId = activeSessionId;
    let currentSess = sessions.find(s => s.id === sessId);

    // Create session if none exists
    if (!currentSess) {
      const newSession: Session = {
        id: generateId(),
        title: (promptText || attachments?.[0]?.name || 'Workspace').slice(0, 36),
        mode: currentMode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      sessId = newSession.id;
      currentSess = newSession;
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(sessId);
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: promptText || 'Attached documents for analysis',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: currentMode,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    };

    const updatedWithUser = {
      ...currentSess,
      title: currentSess.messages.length === 0 ? (promptText || 'Workspace').slice(0, 36) : currentSess.title,
      messages: [...currentSess.messages, userMsg],
      updatedAt: new Date().toISOString(),
    };

    setSessions(prev => prev.map(s => (s.id === sessId ? updatedWithUser : s)));
    setIsLoading(true);

    try {
      const contextStr = memoryItems.map(m => `[${m.title}]: ${m.content}`).join('\n');

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          mode: currentMode,
          context: contextStr,
          model: currentModel,
          attachments,
        }),
      });

      const data = await res.json();
      sound.playSuccess();

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.content || 'Autonomous loop completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: currentMode,
        thoughts: data.thoughts,
        artifact: data.artifact,
        telemetry: data.telemetry,
      };

      const finalSess = {
        ...updatedWithUser,
        messages: [...updatedWithUser.messages, assistantMsg],
      };

      setSessions(prev => {
        const next = prev.map(s => (s.id === sessId ? finalSess : s));
        try {
          localStorage.setItem('nova_sessions', JSON.stringify(next));
        } catch {}
        return next;
      });
    } catch (err) {
      console.error('Agent execution error:', err);
      const fallbackMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'I encountered an offline condition. Switched automatically to resilient local execution mode.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: currentMode,
      };
      setSessions(prev =>
        prev.map(s =>
          s.id === sessId
            ? { ...s, messages: [...s.messages, fallbackMsg] }
            : s
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreset = (presetPrompt: string, mode: StudioMode) => {
    setCurrentMode(mode);
    handlePromptSubmit(presetPrompt);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Top Navigation */}
      <Navbar
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenMcp={() => setIsMcpOpen(true)}
        onOpenPalette={() => setIsPaletteOpen(true)}
        onNewSession={handleNewSession}
        memoryCount={memoryItems.length}
        currentModel={currentModel}
        onSelectModel={setCurrentModel}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentMode={currentMode}
          onSelectMode={setCurrentMode}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onApplyPrompt={handleApplyPreset}
        />

        <AgentCanvas
          messages={currentMessages}
          currentMode={currentMode}
          isLoading={isLoading}
          onSubmitPrompt={handlePromptSubmit}
          onSelectMode={setCurrentMode}
        />
      </div>

      {/* Modern Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelectMode={setCurrentMode}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenMcp={() => setIsMcpOpen(true)}
        onNewSession={handleNewSession}
      />

      {/* Model Context Protocol (MCP) Tools Registry Modal */}
      <McpInspector
        isOpen={isMcpOpen}
        onClose={() => setIsMcpOpen(false)}
      />

      {/* Personal Context Memory Modal */}
      <MemoryModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memoryItems={memoryItems}
        onSaveItem={handleSaveMemoryItem}
        onDeleteItem={handleDeleteMemoryItem}
      />
    </div>
  );
}
