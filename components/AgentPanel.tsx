"use client";

import { DEMO_PROMPT } from "@/lib/format";
import type { AgentMode } from "@/lib/types";

export function AgentPanel({
  prompt,
  running,
  error,
  modeUsed,
  geminiConfigured,
  fallbackReason,
  onPromptChange,
  onRun,
  onPreset,
}: {
  prompt: string;
  running: boolean;
  error: string | null;
  modeUsed: AgentMode;
  geminiConfigured: boolean;
  fallbackReason: string | null;
  onPromptChange: (value: string) => void;
  onRun: () => void;
  onPreset: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Agent control
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">What should the agent do?</h2>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            geminiConfigured
              ? "bg-emerald-400/15 text-emerald-300"
              : "bg-white/10 text-slate-300"
          }`}
        >
          {geminiConfigured ? "Gemini ready" : "Mock agent"}
        </span>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onRun();
        }}
        rows={3}
        placeholder={DEMO_PROMPT}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm leading-relaxed text-white placeholder:text-slate-500 outline-none ring-emerald-400/0 transition focus:border-emerald-400/40 focus:ring-4 focus:ring-emerald-400/10"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPreset}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10"
        >
          Use demo preset
        </button>
        <button
          type="button"
          onClick={onRun}
          disabled={running || !prompt.trim()}
          className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? "Agent working…" : "Run Agent"}
        </button>
      </div>

      {running ? (
        <p className="text-[12px] text-emerald-300">Logging every action to the receipt…</p>
      ) : (
        <p className="text-[12px] text-slate-500">
          {modeUsed === "gemini"
            ? "Last planner: Gemini."
            : geminiConfigured
              ? `Last planner: deterministic fallback.${fallbackReason ? ` ${fallbackReason}` : ""}`
              : "Last planner: deterministic. This host has no GEMINI_API_KEY — add it in Vercel Settings → Environment Variables, then Redeploy."}
        </p>
      )}

      {error ? (
        <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-[12px] text-rose-200">{error}</p>
      ) : null}
    </div>
  );
}
