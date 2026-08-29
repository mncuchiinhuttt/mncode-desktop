import React, { useState } from "react";
import { X, Plus, Trash2, ArrowUp, ArrowDown, Sparkles, Layers } from "lucide-react";
import type { DesktopCombo, DesktopComboMember, DesktopRoleMeta } from "@/types";

interface ComboBuilderModalProps {
  combo?: DesktopCombo | null;
  standardRoles: DesktopRoleMeta[];
  onSave: (combo: DesktopCombo) => Promise<void>;
  onClose: () => void;
}

const EXECUTION_MODES = [
  { id: "pipeline", label: "Pipeline", desc: "Step-by-step linear data handoff (A ➔ B ➔ C)" },
  { id: "debate", label: "Debate", desc: "Proposer vs Critic debate with Decider consensus" },
  { id: "fan_out", label: "Fan-Out", desc: "Concurrent execution on isolated worktrees" },
];

const AVAILABLE_MODELS = [
  { id: "auto", label: "Auto (Recommended for Role)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Thinking)" },
  { id: "claude-opus-4-6-thinking", label: "Claude Opus 4.6 (Thinking)" },
  { id: "claude-3-7-sonnet", label: "Claude 3.7 Sonnet" },
  { id: "gemini-3.7-flash-high", label: "Gemini 3.7 Flash (High)" },
  { id: "gemini-pro-agent", label: "Gemini 3.1 Pro (Agent)" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Fast)" },
  { id: "o3", label: "OpenAI o3" },
  { id: "o3-mini", label: "OpenAI o3-mini" },
  { id: "gpt-4.5", label: "GPT-4.5" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "deepseek-reasoner", label: "DeepSeek R1" },
];

export function ComboBuilderModal({ combo, standardRoles, onSave, onClose }: ComboBuilderModalProps) {
  const [name, setName] = useState(combo?.name ?? "");
  const [description, setDescription] = useState(combo?.description ?? "");
  const [mode, setMode] = useState<"pipeline" | "debate" | "fan_out">(combo?.mode ?? "pipeline");
  const [members, setMembers] = useState<DesktopComboMember[]>(
    combo?.members ?? [
      { id: "m1", role: "planner", baseAgent: "planner", model: "auto", fallbackModel: "auto" },
      { id: "m2", role: "coder", baseAgent: "coder", model: "auto", fallbackModel: "auto", isolatedWorktree: true },
      { id: "m3", role: "tester", baseAgent: "tester", model: "auto", fallbackModel: "auto" },
    ]
  );
  const [saving, setSaving] = useState(false);

  const handleAddRole = (roleKey: string) => {
    const meta = standardRoles.find((r) => r.role === roleKey);
    const newMember: DesktopComboMember = {
      id: `m-${Date.now()}-${members.length + 1}`,
      role: roleKey,
      baseAgent: meta?.defaultBaseAgent ?? "coder",
      model: "auto",
      fallbackModel: "auto",
      isolatedWorktree: meta?.requiresWorktreeBase ?? false,
    };
    setMembers([...members, newMember]);
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= members.length) return;
    const next = [...members];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setMembers(next);
  };

  const handleRemove = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, patch: Partial<DesktopComboMember>) => {
    setMembers(members.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || members.length === 0) return;
    setSaving(true);
    try {
      const slug = combo?.id || name.toLowerCase().replace(/\s+/g, "-");
      await onSave({
        id: slug,
        name: name.trim(),
        description: description.trim(),
        mode,
        members,
        isBuiltin: false,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        <div className="px-6 py-4 border-b border-[var(--line-soft)] flex items-center justify-between bg-[var(--card-elevated)]">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-base font-semibold text-[var(--foreground)]">
              {combo ? "Edit Agent Combo" : "Create Agent Combo"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-[var(--muted-dim)] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-dim)] uppercase tracking-wider">Combo Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Feature Delivery Swarm"
                required
                className="w-full px-3 py-2 text-sm bg-[var(--card-elevated)] border border-[var(--line-soft)] rounded-md text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-hidden"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-dim)] uppercase tracking-wider">Execution Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "pipeline" | "debate" | "fan_out")}
                className="w-full px-3 py-2 text-sm bg-[var(--card-elevated)] border border-[var(--line-soft)] rounded-md text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-hidden"
              >
                {EXECUTION_MODES.map((m) => (
                  <option key={m.id} value={m.id}>{m.label} ({m.desc})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-dim)] uppercase tracking-wider">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the workflow objective..."
              className="w-full px-3 py-2 text-sm bg-[var(--card-elevated)] border border-[var(--line-soft)] rounded-md text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-hidden"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted-dim)] uppercase tracking-wider">Role Roster ({members.length})</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--muted-dim)]">Quick Add:</span>
                {["planner", "coder", "tester", "advisor", "worker"].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleAddRole(role)}
                    className="px-2 py-0.5 text-xs bg-[var(--card-elevated)] hover:bg-[var(--primary)] hover:text-white border border-[var(--line-soft)] rounded transition-colors"
                  >
                    +{role}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              {members.map((m, idx) => (
                <div key={m.id} className="p-3.5 bg-[var(--card-elevated)] border border-[var(--line-soft)] rounded-lg space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-xs font-bold font-mono">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-semibold capitalize text-[var(--foreground)]">{m.role}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleMove(idx, -1)} disabled={idx === 0} className="p-1 text-[var(--muted-dim)] hover:text-white disabled:opacity-30">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleMove(idx, 1)} disabled={idx === members.length - 1} className="p-1 text-[var(--muted-dim)] hover:text-white disabled:opacity-30">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => handleRemove(idx)} className="p-1 text-rose-400 hover:text-rose-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-[var(--muted-dim)] block mb-1">Primary Model:</span>
                      <select
                        value={m.model || "auto"}
                        onChange={(e) => handleUpdate(idx, { model: e.target.value })}
                        className="w-full px-2 py-1.5 bg-[var(--card)] border border-[var(--line-soft)] rounded text-[var(--foreground)]"
                      >
                        {AVAILABLE_MODELS.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="text-[var(--muted-dim)] block mb-1">Fallback Model:</span>
                      <select
                        value={m.fallbackModel || "auto"}
                        onChange={(e) => handleUpdate(idx, { fallbackModel: e.target.value })}
                        className="w-full px-2 py-1.5 bg-[var(--card)] border border-[var(--line-soft)] rounded text-[var(--foreground)]"
                      >
                        <option value="auto">Auto (Recommended Fallback)</option>
                        <option value="none">None (No fallback)</option>
                        {AVAILABLE_MODELS.filter((o) => o.id !== "auto").map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--line-soft)] flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[var(--muted-dim)] hover:text-white">
              Cancel
            </button>
            <button type="submit" disabled={saving || members.length === 0} className="btn-hackathon-primary px-5 py-2 text-sm font-medium">
              {saving ? "Saving..." : combo ? "Save Changes" : "Create Combo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
