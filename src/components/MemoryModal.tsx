"use client";

import React, { useState } from "react";
import { KnowledgeMemoryItem } from "@/lib/types";
import { Brain, X, Plus, Trash2, HardDrive } from "lucide-react";
import { generateId } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  memoryItems: KnowledgeMemoryItem[];
  onSaveItem: (item: KnowledgeMemoryItem) => void;
  onDeleteItem: (id: string) => void;
}

export function MemoryModal({
  isOpen,
  onClose,
  memoryItems,
  onSaveItem,
  onDeleteItem,
}: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] =
    useState<KnowledgeMemoryItem["category"]>("project_context");

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onSaveItem({
      id: generateId(),
      title: title.trim(),
      content: content.trim(),
      category,
      createdAt: new Date().toISOString(),
    });

    setTitle("");
    setContent("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                Saved Memories
              </h3>
              <p className="text-xs text-slate-400">
                Saved in this browser and sent as context with each question to
                the model you choose
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Add form */}
          <form
            onSubmit={handleAdd}
            className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5" />
              Add Context Memory
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Title (e.g. My Tech Stack)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as KnowledgeMemoryItem["category"])
                }
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
              >
                <option value="project_context">Project Context</option>
                <option value="preference">User Preference</option>
                <option value="personal_fact">Fact / Knowledge</option>
                <option value="document">Document Snippet</option>
              </select>
            </div>

            <textarea
              placeholder="Context content (e.g., I build open-source tools with Next.js, FastAPI, and local Ollama...)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!title.trim() || !content.trim()}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold disabled:opacity-40 transition"
              >
                Save Knowledge
              </button>
            </div>
          </form>

          {/* List of saved memory */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Saved Memories ({memoryItems.length})
            </h4>

            {memoryItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No custom context saved yet. Add facts or project rules above.
              </div>
            ) : (
              <div className="space-y-2.5">
                {memoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-start justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-200">
                          {item.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {item.content}
                      </p>
                    </div>

                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition"
                      title="Delete context"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-400">
            <HardDrive className="w-3.5 h-3.5" />
            Stored in this browser (localStorage)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
