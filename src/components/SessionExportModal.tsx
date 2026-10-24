"use client";

import React, { useState } from "react";
import { Session } from "@/lib/types";
import { X, Download, FileText, Copy, Check, Share2, Code } from "lucide-react";
import { sound } from "@/lib/sound";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  session?: Session;
}

export function SessionExportModal({ isOpen, onClose, session }: Props) {
  const [copiedFormat, setCopiedFormat] = useState<"md" | "json" | null>(null);

  if (!isOpen || !session) return null;

  const generateMarkdown = (): string => {
    let md = `# Nova session: ${session.title}\n\n`;
    md += `*Exported from Nova on ${new Date(session.updatedAt).toLocaleString()}*\n\n`;
    md += `**Mode:** \`${session.mode}\`\n\n---\n\n`;

    session.messages.forEach((msg) => {
      const speaker = msg.role === "assistant" ? "🤖 **Nova**" : "👤 **User**";
      md += `### ${speaker} (${msg.timestamp})\n\n`;
      md += `${msg.content}\n\n`;

      if (msg.artifact) {
        md += `#### 📦 Generated Artifact: \`${msg.artifact.type.toUpperCase()}\`\n\n`;
        if (msg.artifact.type === "code") {
          md += `\`\`\`${msg.artifact.data.language}\n// ${msg.artifact.data.filename}\n${msg.artifact.data.code}\n\`\`\`\n\n`;
          md += `*Explanation:* ${msg.artifact.data.explanation}\n\n`;
        } else if (msg.artifact.type === "research") {
          md += `**${msg.artifact.data.title}**\n\n`;
          md += `> ${msg.artifact.data.executiveSummary}\n\n`;
          md += `**Key Findings:**\n`;
          msg.artifact.data.keyFindings.forEach((f) => {
            md += `- **${f.point}**: ${f.description} *(Confidence: ${f.confidence})*\n`;
          });
          md += `\n**Recommendation:** ${msg.artifact.data.recommendation}\n\n`;
        } else if (msg.artifact.type === "matrix") {
          md += `**Topic:** ${msg.artifact.data.topic}\n\n`;
          md += `| Option | Score / 10 | Pros | Cons |\n| --- | --- | --- | --- |\n`;
          msg.artifact.data.options.forEach((opt) => {
            md += `| ${opt.name} | ${opt.totalWeightedScore} | ${opt.pros.join(", ")} | ${opt.cons.join(", ")} |\n`;
          });
          md += `\n*Verdict:* ${msg.artifact.data.verdict}\n\n`;
        } else if (msg.artifact.type === "plan") {
          md += `**Goal:** ${msg.artifact.data.goal} *(Horizon: ${msg.artifact.data.timeframe})*\n\n`;
          msg.artifact.data.phases.forEach((p) => {
            md += `##### ${p.phaseName}\n`;
            p.tasks.forEach((t) => {
              md += `- [x] **${t.title}**: ${t.description}\n`;
            });
            md += "\n";
          });
        }
      }

      md += `---\n\n`;
    });

    return md;
  };

  const generateJson = (): string => {
    return JSON.stringify(session, null, 2);
  };

  const handleCopy = (format: "md" | "json") => {
    const text = format === "md" ? generateMarkdown() : generateJson();
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    sound.playCheck();
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleDownload = (format: "md" | "json") => {
    const content = format === "md" ? generateMarkdown() : generateJson();
    const filename = `${session.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${format}`;
    const mime = format === "md" ? "text/markdown" : "application/json";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    sound.playSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Export & Share Workspace
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10.5px] font-mono text-slate-500 uppercase">
              Active Workspace:
            </span>
            <p className="text-xs font-semibold text-slate-200 mt-0.5">
              {session.title}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {session.messages.length} messages •{" "}
              {session.messages.filter((m) => m.artifact).length} generative
              artifacts
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Markdown Export Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-teal-500/40 transition space-y-3">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold">
                <FileText className="w-4 h-4" />
                <span>Markdown (.md)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Formatted documentation report with executive summaries, code
                blocks, and source citations.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownload("md")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-semibold hover:bg-teal-400 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy("md")}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                  title="Copy Markdown"
                >
                  {copiedFormat === "md" ? (
                    <Check className="w-3.5 h-3.5 text-teal-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* JSON Export Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-cyan-500/40 transition space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                <Code className="w-4 h-4" />
                <span>JSON Snapshot</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Raw structured session object with full message history, steps,
                telemetry, and artifacts.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownload("json")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy("json")}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                  title="Copy JSON"
                >
                  {copiedFormat === "json" ? (
                    <Check className="w-3.5 h-3.5 text-teal-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
