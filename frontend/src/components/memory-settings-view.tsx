import React, { useEffect, useState } from "react";
import { BrainCircuit, Trash2, Plus, ArrowUpRight, ShieldCheck, Sparkles, BookOpen, AlertTriangle } from "lucide-react";
import type { DesktopMemoryItem, DesktopSettings } from "@/types";
import { desktop } from "@/lib/desktop";

interface MemorySettingsViewProps {
  settings?: DesktopSettings;
  onSettingsChange?: (input: Partial<DesktopSettings>) => void | Promise<void>;
}

export function MemorySettingsView({ settings, onSettingsChange }: MemorySettingsViewProps) {
  const [memories, setMemories] = useState<DesktopMemoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"workspace" | "global">("workspace");
  const [loading, setLoading] = useState(true);
  const [newTopic, setNewTopic] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const loadMemories = async () => {
    try {
      setLoading(true);
      const list = await desktop.getSharedMemories();
      setMemories(list);
    } catch {
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMemories();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !newSummary.trim()) return;
    await desktop.saveSharedMemory({
      id: "",
      topic: newTopic.trim(),
      category: "convention",
      tier: activeTab,
      summary: newSummary.trim(),
      confidence: 5,
      hitCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setNewTopic("");
    setNewSummary("");
    setIsAdding(false);
    await loadMemories();
  };

  const handleDelete = async (id: string) => {
    await desktop.deleteSharedMemory(id);
    await loadMemories();
  };

  const handlePromote = async (item: DesktopMemoryItem) => {
    await desktop.saveSharedMemory({
      ...item,
      tier: "global",
    });
    await loadMemories();
  };

  const filtered = memories.filter((m) => m.tier === activeTab);

  return (
    <div className="space-y-6 font-sans">
      {/* Toggles Banner */}
      <div className="p-5 bg-[var(--card)] border border-[var(--line)] rounded-xl space-y-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-[var(--primary)]" />
              Shared Workspace Memory
            </span>
            <p className="text-xs text-[var(--muted-foreground)]">
              Share learned conventions, architectural decisions, and bug lessons across all chat tabs in this repository.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSettingsChange?.({ sharedMemoryEnabled: !(settings?.sharedMemoryEnabled !== false) })}
            className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors ${
              settings?.sharedMemoryEnabled !== false
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 text-[var(--muted-dim)] border border-white/10"
            }`}
          >
            {settings?.sharedMemoryEnabled !== false ? "ENABLED" : "DISABLED"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 pt-3 border-t border-[var(--line-soft)]">
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-cyan)]" />
              Hermes Self-Reflection &amp; Mistake Learning
            </span>
            <p className="text-xs text-[var(--muted-foreground)]">
              Automatically extract actionable lessons from test failures, compiler errors, and fixes to self-improve over time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSettingsChange?.({ hermesReflectionEnabled: !(settings?.hermesReflectionEnabled !== false) })}
            className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors ${
              settings?.hermesReflectionEnabled !== false
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 text-[var(--muted-dim)] border border-white/10"
            }`}
          >
            {settings?.hermesReflectionEnabled !== false ? "ACTIVE" : "OFF"}
          </button>
        </div>
      </div>

      {/* Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
        <div className="flex items-center gap-2 border border-[var(--line-soft)] bg-[var(--card-elevated)] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("workspace")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === "workspace" ? "bg-[var(--primary)] text-white font-bold" : "text-[var(--muted-foreground)]"
            }`}
          >
            Workspace Shared ({memories.filter((m) => m.tier === "workspace").length})
          </button>
          <button
            onClick={() => setActiveTab("global")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeTab === "global" ? "bg-[var(--primary)] text-white font-bold" : "text-[var(--muted-foreground)]"
            }`}
          >
            Global Master ({memories.filter((m) => m.tier === "global").length})
          </button>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="btn-hackathon-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? "Cancel" : "Add Lesson"}</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="p-4 bg-[var(--card)] border border-[var(--line)] rounded-lg space-y-3">
          <input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Topic slug (e.g. go-test-flags, auth-header)"
            required
            className="w-full px-3 py-1.5 text-xs bg-[var(--card-elevated)] border border-[var(--line-soft)] rounded text-[var(--foreground)]"
          />
          <textarea
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            placeholder="Lesson learned or repository rule..."
            required
            rows={2}
            className="w-full px-3 py-1.5 text-xs bg-[var(--card-elevated)] border border-[var(--line-soft)] rounded text-[var(--foreground)]"
          />
          <button type="submit" className="btn-hackathon-primary px-4 py-1 text-xs font-medium">Save to {activeTab}</button>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-[var(--muted-dim)] font-mono">Loading memories...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 border border-dashed border-[var(--line-soft)] rounded-lg text-center text-xs text-[var(--muted-dim)]">
          No {activeTab} memories recorded yet. The agent automatically learns from test fixes and compiler errors.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((item) => (
            <div key={item.id} className="p-4 bg-[var(--card)] border border-[var(--line)] rounded-lg space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[0.62rem] uppercase font-mono font-bold rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                    {item.category}
                  </span>
                  <span className="text-xs font-bold font-mono text-[var(--foreground)]">{item.topic}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.tier === "workspace" && (
                    <button
                      onClick={() => handlePromote(item)}
                      title="Promote to Global Master Memory"
                      className="p-1 rounded hover:bg-white/5 text-[var(--muted-dim)] hover:text-white"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Delete Memory"
                    className="p-1 rounded hover:bg-rose-500/10 text-rose-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed font-light">{item.summary}</p>
              {item.correction && item.correction !== item.summary && (
                <div className="p-2 bg-[var(--card-elevated)] border border-[var(--line-soft)] rounded text-xs text-emerald-400 font-mono">
                  Rule: {item.correction}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
