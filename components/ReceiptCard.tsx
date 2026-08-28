"use client";

import { formatChange, formatClock } from "@/lib/format";
import type { ReceiptEntry } from "@/lib/types";

function undoLabel(entry: ReceiptEntry) {
  if (entry.tool === "deleteFile" || entry.tool === "deleteTask" || entry.tool === "deleteEvent") {
    return "Restore";
  }
  return "Undo";
}

export function ReceiptCard({
  entry,
  undoing,
  onUndo,
}: {
  entry: ReceiptEntry;
  undoing: boolean;
  onUndo: (id: string) => void;
}) {
  const change = formatChange(entry.before, entry.after);
  const canUndo = entry.undoable && !entry.undone;
  const readOnly = entry.stateChanged === false;

  return (
    <article className={`receipt-card ${entry.undone ? "receipt-card-undone" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {entry.undone ? (
              <span className="badge-undone">Undone</span>
            ) : readOnly ? (
              <span className="badge-undone">Logged</span>
            ) : (
              <span className="badge-ok">Done</span>
            )}
          </div>
          <h3
            className={`mt-1.5 text-[15px] font-semibold leading-snug ${
              entry.undone ? "text-slate-400 line-through" : "text-slate-900"
            }`}
          >
            {entry.humanAction}
          </h3>
        </div>
        <time className="shrink-0 font-mono text-[11px] text-slate-400">
          {formatClock(entry.timestamp)}
        </time>
      </div>

      {readOnly ? (
        <p className="mt-3 text-sm font-medium text-slate-500">No state changed</p>
      ) : change ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
            {change.from}
          </span>
          <span className="text-slate-300">→</span>
          <span
            className={`rounded-md px-2 py-1 font-semibold ${
              entry.undone ? "bg-slate-100 text-slate-400" : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {change.to}
          </span>
        </p>
      ) : null}

      <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
        <span className="font-semibold text-slate-500">Reason. </span>
        {entry.reason}
      </p>

      {entry.priorityWhy ? (
        <p className="mt-2 text-[13px] leading-relaxed text-amber-800">
          <span className="font-semibold">Priority. </span>
          {entry.priorityWhy}
        </p>
      ) : null}

      {entry.triggeredBy ? (
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
          <span className="font-semibold text-slate-400">Triggered by. </span>
          “{entry.triggeredBy}”
          {entry.plannerMode ? (
            <span className="ml-1 text-[11px] text-slate-400">
              · {entry.plannerMode === "gemini" ? entry.model || "Gemini" : "deterministic"}
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-slate-200 pt-3">
        <p className="font-mono text-[11px] text-slate-400">{entry.tool}</p>
        {canUndo ? (
          <button
            type="button"
            onClick={() => onUndo(entry.id)}
            disabled={undoing}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
          >
            {undoing ? "Working…" : undoLabel(entry)}
          </button>
        ) : entry.undone ? null : (
          <span className="text-[11px] text-slate-400">
            {readOnly ? "Undo: not applicable" : "Not undoable"}
          </span>
        )}
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-600">
          Technical details
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-md bg-slate-50 p-2 font-mono text-[10px] leading-relaxed text-slate-500">
{JSON.stringify(
  {
    triggeredBy: entry.triggeredBy ?? null,
    planner: entry.plannerMode === "gemini" ? entry.model || "gemini" : entry.plannerMode ?? null,
    tool: entry.tool,
    stateChanged: entry.stateChanged,
    undoable: entry.undoable,
    reason: entry.reason,
    before: entry.before,
    after: entry.after,
    input: entry.input,
    result: entry.result,
  },
  null,
  2,
)}
        </pre>
      </details>
    </article>
  );
}
