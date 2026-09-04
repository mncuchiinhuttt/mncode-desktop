import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Sparkles, Layers, ShieldCheck, Cpu } from "lucide-react";
import type { DesktopCombo, DesktopRoleMeta } from "@/types";
import { desktop } from "@/lib/desktop";
import { ComboBuilderModal } from "./combo-builder-modal";

export function CombosSettingsView() {
  const [combosList, setCombosList] = useState<DesktopCombo[]>([]);
  const [standardRoles, setStandardRoles] = useState<DesktopRoleMeta[]>([]);
  const [editingCombo, setEditingCombo] = useState<DesktopCombo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allCombos, roles] = await Promise.all([
        desktop.getCombos(),
        desktop.getStandardRoles(),
      ]);
      setCombosList(allCombos);
      setStandardRoles(roles);
    } catch {
      setCombosList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSave = async (combo: DesktopCombo) => {
    await desktop.saveCombo(combo);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete custom combo "${id}"?`)) return;
    await desktop.deleteCombo(id);
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line-soft)] pb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[var(--primary)]" />
            Agent Combos &amp; Multi-Agent Swarms
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Group multiple specialized subagents into sequential pipelines, debate swarms, or parallel teams with per-role models and auto-failover.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCombo(null);
            setIsModalOpen(true);
          }}
          className="btn-hackathon-primary inline-flex items-center gap-2 px-3.5 py-1.5 text-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Combo</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-[var(--muted-dim)] font-mono">Loading agent combos...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {combosList.map((combo) => (
            <div
              key={combo.id}
              className="p-5 bg-[var(--card)] border border-[var(--line)] rounded-lg shadow-sm hover:border-[var(--line-strong)] transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-[var(--foreground)]">{combo.name}</span>
                  <span className="px-2 py-0.5 text-[0.65rem] uppercase font-mono font-bold tracking-wider rounded bg-[var(--card-elevated)] border border-[var(--line-soft)] text-[var(--muted-foreground)]">
                    {combo.mode}
                  </span>
                  {combo.isBuiltin && (
                    <span className="px-2 py-0.5 text-[0.62rem] uppercase font-mono font-bold tracking-wider rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                      Preset
                    </span>
                  )}
                </div>

                {!combo.isBuiltin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCombo(combo);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded hover:bg-white/5 text-[var(--muted-dim)] hover:text-white transition-colors"
                      title="Edit Combo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(combo.id)}
                      className="p-1.5 rounded hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors"
                      title="Delete Combo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed font-light">
                {combo.description}
              </p>

              {/* Members Flow */}
              <div className="pt-2 border-t border-[var(--line-soft)] flex flex-wrap items-center gap-2">
                <span className="text-[0.68rem] text-[var(--muted-dim)] font-mono uppercase tracking-wider">Roles ({combo.members.length}):</span>
                {combo.members.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--card-elevated)] border border-[var(--line-soft)] text-xs font-mono"
                  >
                    <span className="text-[var(--primary)] font-bold">{idx + 1}.</span>
                    <span className="font-semibold text-[var(--foreground)]">{m.role}</span>
                    <span className="text-[0.65rem] text-[var(--muted-dim)]">({m.model || "auto"})</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <ComboBuilderModal
          combo={editingCombo}
          standardRoles={standardRoles}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
