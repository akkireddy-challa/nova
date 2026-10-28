"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  TrendingUp,
  Cpu,
  GraduationCap,
  DollarSign,
  Sparkles,
  Shield,
  Zap,
  Search,
  BarChart3,
  Database,
  Layers,
  Globe,
  Terminal,
  X,
  Download,
  UploadCloud,
  Check,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Plus,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { sound } from "@/lib/sound";
import {
  AgentPersona,
  loadPersonasFromStorage,
  savePersonaToStorage,
  deletePersonaFromStorage,
  getActivePersonaId,
  setActivePersonaId,
  downloadPersonasBundle,
  importPersonasBundle,
} from "@/lib/agent-personas";
import type { ThinkingBudget } from "@/lib/types";

export interface PersonaStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPersona?: (persona: AgentPersona) => void;
}

// Icon dictionary for rendering recognized Lucide icons
const LUCIDE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Bot,
  TrendingUp,
  Cpu,
  GraduationCap,
  DollarSign,
  Sparkles,
  Shield,
  Zap,
  Search,
  BarChart3,
  Database,
  Layers,
  Globe,
  Terminal,
};

// Preset icons for quick selection in the builder
const PRESET_ICONS = [
  { type: "lucide", value: "Bot", label: "Agent" },
  { type: "lucide", value: "TrendingUp", label: "Market" },
  { type: "lucide", value: "Cpu", label: "Tech" },
  { type: "lucide", value: "GraduationCap", label: "Academic" },
  { type: "lucide", value: "DollarSign", label: "Finance" },
  { type: "lucide", value: "Sparkles", label: "Creative" },
  { type: "lucide", value: "Shield", label: "Security" },
  { type: "lucide", value: "Zap", label: "Fast" },
  { type: "lucide", value: "Database", label: "Data" },
  { type: "lucide", value: "Layers", label: "Architecture" },
  { type: "emoji", value: "🤖", label: "Robot" },
  { type: "emoji", value: "📊", label: "Stats" },
  { type: "emoji", value: "🏗️", label: "Construct" },
  { type: "emoji", value: "🔬", label: "Research" },
  { type: "emoji", value: "💼", label: "Executive" },
  { type: "emoji", value: "🧠", label: "Cognition" },
];

export function PersonaStudioModal({
  isOpen,
  onClose,
  onSelectPersona,
}: PersonaStudioModalProps) {
  const [activeTab, setActiveTab] = useState<"browse" | "create">("browse");
  const [personas, setPersonas] = useState<AgentPersona[]>(() =>
    isOpen ? loadPersonasFromStorage() : [],
  );
  const [activePersonaId, setActivePersonaIdState] = useState<string>(() =>
    isOpen ? getActivePersonaId() : "",
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Synchronize personas and active persona on open without triggering cascading effect render
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setPersonas(loadPersonasFromStorage());
      setActivePersonaIdState(getActivePersonaId());
      setFeedback(null);
    }
  }

  // Form State for creating custom persona
  const [customName, setCustomName] = useState("");
  const [customRoleTitle, setCustomRoleTitle] = useState("");
  const [customIcon, setCustomIcon] = useState("Bot");
  const [customDescription, setCustomDescription] = useState("");
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [customBudget, setCustomBudget] =
    useState<ThinkingBudget>("analytical");
  const [customThreshold, setCustomThreshold] = useState<number>(80);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Helper to render icon component or emoji
  const renderIcon = (iconName: string, className = "w-4 h-4") => {
    const Component = LUCIDE_ICONS[iconName];
    if (Component) {
      return <Component className={className} />;
    }
    return (
      <span className="text-base leading-none select-none">{iconName}</span>
    );
  };

  const handleActivate = (persona: AgentPersona) => {
    sound.playSuccess();
    setActivePersonaId(persona.id);
    setActivePersonaIdState(persona.id);
    setFeedback({
      type: "success",
      message: `Activated '${persona.name}' persona.`,
    });
    onSelectPersona?.(persona);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDelete = (id: string, name: string) => {
    sound.playCheck();
    deletePersonaFromStorage(id);
    const updated = loadPersonasFromStorage();
    setPersonas(updated);
    if (activePersonaId === id && updated.length > 0) {
      setActivePersonaId(updated[0].id);
      setActivePersonaIdState(updated[0].id);
      onSelectPersona?.(updated[0]);
    }
    setFeedback({
      type: "success",
      message: `Deleted custom persona '${name}'.`,
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleExport = () => {
    sound.playSuccess();
    downloadPersonasBundle(personas);
    setFeedback({
      type: "success",
      message: "Exported personas bundle (.json).",
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== "string") return;

      const result = importPersonasBundle(content);
      if (!result.valid) {
        sound.playCheck();
        setFeedback({
          type: "error",
          message: `Import failed: ${result.error}`,
        });
        return;
      }

      // Save imported personas into storage
      for (const p of result.personas) {
        try {
          savePersonaToStorage(p);
        } catch {
          // ignore built-in duplicates
        }
      }

      const refreshed = loadPersonasFromStorage();
      setPersonas(refreshed);
      sound.playSuccess();
      setFeedback({
        type: "success",
        message: `Successfully imported and validated ${result.personas.length} persona(s).`,
      });
      setTimeout(() => setFeedback(null), 3000);
    };

    reader.onerror = () => {
      sound.playCheck();
      setFeedback({
        type: "error",
        message: "Failed to read imported file.",
      });
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = customName.trim();
    const roleTitle = customRoleTitle.trim();
    const description = customDescription.trim();
    const systemPrompt = customSystemPrompt.trim();

    if (!name) {
      setFormError("Persona name is required.");
      return;
    }
    if (!description) {
      setFormError("Description is required.");
      return;
    }
    if (!systemPrompt) {
      setFormError("System prompt is required.");
      return;
    }

    // Generate safe alphanumeric ID based on name and timestamp
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 30);
    const id = `${slug || "agent"}-${Date.now().toString(36)}`;

    const newPersona: AgentPersona = {
      id,
      name,
      icon: customIcon,
      roleTitle: roleTitle || "Specialist Agent",
      description,
      systemPrompt,
      defaultBudget: customBudget,
      verificationThreshold: customThreshold,
      isCustom: true,
    };

    try {
      savePersonaToStorage(newPersona);
      const updated = loadPersonasFromStorage();
      setPersonas(updated);
      handleActivate(newPersona);

      // Reset form
      setCustomName("");
      setCustomRoleTitle("");
      setCustomDescription("");
      setCustomSystemPrompt("");
      setCustomIcon("Bot");
      setCustomBudget("analytical");
      setCustomThreshold(80);

      setActiveTab("browse");
      sound.playSuccess();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save persona.";
      setFormError(msg);
      sound.playCheck();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="persona-studio-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="persona-studio-title"
                className="text-sm font-semibold text-slate-100 flex items-center gap-2"
              >
                Custom Agent Persona Studio
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-700/50">
                  Specialist v1.0
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Architect, activate, and customize institutional-grade AI
                personas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              title="Export Personas Bundle (.json)"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Import Personas Bundle (.json)"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-teal-400" />
              <span>Import</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json,application/json"
              className="hidden"
            />

            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/40 flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                sound.playCheck();
                setActiveTab("browse");
              }}
              className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition cursor-pointer flex items-center gap-2 ${
                activeTab === "browse"
                  ? "border-teal-400 text-teal-300 bg-slate-900/60"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Specialist Personas ({personas.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playCheck();
                setActiveTab("create");
              }}
              className={`px-3.5 py-2.5 text-xs font-medium border-b-2 transition cursor-pointer flex items-center gap-2 ${
                activeTab === "create"
                  ? "border-teal-400 text-teal-300 bg-slate-900/60"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Custom Agent</span>
            </button>
          </div>

          {feedback && (
            <div
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md animate-in fade-in ${
                feedback.type === "success"
                  ? "bg-teal-950/60 text-teal-300 border border-teal-800/60"
                  : "bg-red-950/60 text-red-300 border border-red-800/60"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "browse" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Select an active persona for institutional research, planning,
                  or code synthesis.
                </span>
                <span className="font-mono text-[11px] text-teal-400">
                  Active ID: {activePersonaId}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personas.map((persona) => {
                  const isActive = persona.id === activePersonaId;

                  return (
                    <div
                      key={persona.id}
                      className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                        isActive
                          ? "bg-slate-950/90 border-teal-500/70 shadow-lg shadow-teal-950/40 ring-1 ring-teal-500/40"
                          : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60"
                      }`}
                    >
                      {/* Top bar with icon and name */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`p-2 rounded-lg border ${
                                isActive
                                  ? "bg-teal-500/20 border-teal-500/40 text-teal-300"
                                  : "bg-slate-900 border-slate-800 text-slate-300"
                              }`}
                            >
                              {renderIcon(persona.icon, "w-5 h-5")}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-slate-100">
                                  {persona.name}
                                </h4>
                                {persona.isCustom && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/50 text-amber-300 border border-amber-800/40">
                                    Custom
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-teal-400 font-medium">
                                {persona.roleTitle}
                              </p>
                            </div>
                          </div>

                          {persona.isCustom && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(persona.id, persona.name)
                              }
                              title="Delete custom persona"
                              className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                          {persona.description}
                        </p>
                      </div>

                      {/* Bottom parameters and action button */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 capitalize">
                            {persona.defaultBudget}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            {persona.verificationThreshold}% Verify
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleActivate(persona)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                            isActive
                              ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 cursor-default"
                              : "bg-slate-800 hover:bg-teal-500/20 text-slate-200 hover:text-teal-300 border border-slate-700 hover:border-teal-500/40"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
                              <span>Active</span>
                            </>
                          ) : (
                            <span>Activate Persona</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Create Custom Agent Form */
            <form
              onSubmit={handleCreateSubmit}
              className="space-y-4 max-w-2xl mx-auto"
            >
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  Define Custom Agent Architecture
                </h4>

                {formError && (
                  <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Name & Role Title */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Agent Name <span className="text-teal-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Security Posture Auditor"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Role Title
                    </label>
                    <input
                      type="text"
                      value={customRoleTitle}
                      onChange={(e) => setCustomRoleTitle(e.target.value)}
                      placeholder="e.g. Lead AppSec & Zero-Trust Specialist"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Icon Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Icon & Avatar
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                    {PRESET_ICONS.map((ico) => {
                      const isSelected = customIcon === ico.value;
                      return (
                        <button
                          key={ico.value}
                          type="button"
                          onClick={() => setCustomIcon(ico.value)}
                          title={ico.label}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-center transition cursor-pointer ${
                            isSelected
                              ? "bg-teal-500/20 border-teal-500 text-teal-300 ring-1 ring-teal-500"
                              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                          }`}
                        >
                          {renderIcon(ico.value, "w-4 h-4")}
                        </button>
                      );
                    })}

                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">
                        Custom:
                      </span>
                      <input
                        type="text"
                        value={customIcon}
                        onChange={(e) => setCustomIcon(e.target.value)}
                        placeholder="Bot / 🚀"
                        className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 text-center focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Short Description <span className="text-teal-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Brief summary of duties and analytical domain..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>

                {/* System Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      System Directives & Core Prompt{" "}
                      <span className="text-teal-400">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {customSystemPrompt.length} chars
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    placeholder="Provide operational directives, analytical standards, methodologies, and output constraints..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none"
                  />
                </div>

                {/* Default Thinking Budget & Verification Threshold */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Default Thinking Budget
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["quick", "analytical", "deep"] as const).map(
                        (budget) => (
                          <button
                            key={budget}
                            type="button"
                            onClick={() => setCustomBudget(budget)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-medium border capitalize transition cursor-pointer ${
                              customBudget === budget
                                ? "bg-teal-500/20 text-teal-300 border-teal-500/50"
                                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                            }`}
                          >
                            {budget}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-slate-300">
                        Critic Verification Threshold
                      </label>
                      <span className="text-xs font-mono text-teal-400 font-semibold">
                        {customThreshold}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={customThreshold}
                      onChange={(e) =>
                        setCustomThreshold(Number(e.target.value))
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>50% (Permissive)</span>
                      <span>80% (Standard)</span>
                      <span>100% (Zero-Defect)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("browse")}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition cursor-pointer shadow-md shadow-teal-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Activate Agent</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
