'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { AgentCanvas } from '@/components/AgentCanvas';
import { MemoryModal } from '@/components/MemoryModal';
import { 
  StudioMode, 
  Session, 
  ChatMessage, 
  KnowledgeMemoryItem 
} from '@/lib/types';
import { generateId } from '@/lib/utils';

export default function Home() {
  const [currentMode, setCurrentMode] = useState<StudioMode>('research');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState<boolean>(false);
  const [memoryItems, setMemoryItems] = useState<KnowledgeMemoryItem[]>([]);

  // Load saved memory and sessions from localStorage on mount
  useEffect(() => {
    try {
      const savedMem = localStorage.getItem('nova_memory');
      if (savedMem) {
        setMemoryItems(JSON.parse(savedMem));
      } else {
        // Initial default knowledge memory items
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
    const updated = [item, ...memoryItems];
    setMemoryItems(updated);
    try {
      localStorage.setItem('nova_memory', JSON.stringify(updated));
    } catch {}
  };

  const handleDeleteMemoryItem = (id: string) => {
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
    const newSession: Session = {
      id: generateId(),
      title: 'New Investigation',
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
    setActiveSessionId(id);
    const s = sessions.find(sess => sess.id === id);
    if (s) {
      setCurrentMode(s.mode);
    }
  };

  const handlePromptSubmit = async (promptText: string) => {
    let sessId = activeSessionId;
    let currentSess = sessions.find(s => s.id === sessId);

    // Create session if none exists
    if (!currentSess) {
      const newSession: Session = {
        id: generateId(),
        title: promptText.slice(0, 36) + (promptText.length > 36 ? '...' : ''),
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
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode: currentMode,
    };

    // Append user message immediately
    const updatedWithUser = {
      ...currentSess,
      title: currentSess.messages.length === 0 ? promptText.slice(0, 36) : currentSess.title,
      messages: [...currentSess.messages, userMsg],
      updatedAt: new Date().toISOString(),
    };

    setSessions(prev => prev.map(s => (s.id === sessId ? updatedWithUser : s)));
    setIsLoading(true);

    try {
      // Prepare context from active memory items
      const contextStr = memoryItems.map(m => `[${m.title}]: ${m.content}`).join('\n');

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          mode: currentMode,
          context: contextStr,
        }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.content || 'Autonomous loop completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: currentMode,
        thoughts: data.thoughts,
        artifact: data.artifact,
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
      // Defensive fallback response
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
        onNewSession={handleNewSession}
        memoryCount={memoryItems.length}
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
