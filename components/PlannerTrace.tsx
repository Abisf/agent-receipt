"use client";

import type { PlannerTrace } from "@/lib/types";

function argSummary(args: Record<string, unknown>) {
  const parts = Object.entries(args)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${String(value)}`);
  return parts.join(" · ");
}

export function PlannerTraceView({ trace }: { trace: PlannerTrace | null }) {
  if (!trace) return null;

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">What the agent decided</h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
          {trace.modeUsed === "gemini" ? trace.model ?? "Gemini" : "Deterministic"}
        </span>
      </div>
      <p className="mb-2 text-[12px] leading-relaxed text-slate-300">
        <span className="font-semibold text-slate-400">You said. </span>
        “{trace.userPrompt}”
      </p>
      <p className="mb-3 text-[12px] leading-relaxed text-slate-400">
        {trace.modeUsed === "gemini"
          ? `Real Gemini call (${trace.model}). Tools below are what the model chose.`
          : trace.fallbackReason
            ? `Deterministic. ${trace.fallbackReason}`
            : "Deterministic fallback — Gemini was missing or failed. This is a script, not the model."}
      </p>
      {trace.decisions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 bg-white/5 px-3 py-2 text-[12px] text-slate-400">
          No tools. Chat only — nothing in the workspace changed.
        </p>
      ) : (
      <ol className="space-y-2">
        {trace.decisions.map((decision, index) => (
          <li
            key={`${decision.tool}-${index}`}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
          >
            <p className="font-mono text-[11px] text-emerald-300">
              {index + 1}. {decision.tool}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{argSummary(decision.args)}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-200">{decision.reason}</p>
            {decision.priorityWhy ? (
              <p className="mt-1.5 text-[12px] leading-relaxed text-amber-200">
                <span className="font-semibold">Priority. </span>
                {decision.priorityWhy}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-200">
          Prompt Gemini {trace.modeUsed === "gemini" ? "received" : "would receive"}
        </summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-slate-400 whitespace-pre-wrap">
          {trace.plannerPrompt}
        </pre>
      </details>
      {trace.rawResponse ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-200">
            Raw model JSON
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-slate-400 whitespace-pre-wrap">
            {trace.rawResponse}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
