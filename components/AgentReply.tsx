"use client";

import { formatClock } from "@/lib/format";
import type { AgentMessage } from "@/lib/types";

export function AgentReply({
  messages,
  running,
}: {
  messages: AgentMessage[];
  running: boolean;
}) {
  const recent = messages.slice(-6);

  return (
    <div className="mt-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Agent talk-back
      </p>
      {recent.length === 0 && !running ? (
        <p className="rounded-xl border border-dashed border-white/15 bg-white/5 px-3 py-3 text-[13px] leading-relaxed text-slate-400">
          The agent will reply here — what it understood, which tools it picked, and how it chose
          priorities — then still run the actions.
        </p>
      ) : (
        <div className="flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
          {recent.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl px-3 py-2.5 text-[13px] leading-relaxed ${
                message.role === "user"
                  ? "ml-6 bg-white/10 text-slate-200"
                  : "mr-2 bg-emerald-400/12 text-emerald-50"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {message.role === "user" ? "You" : "Agent"}
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {formatClock(message.timestamp)}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
          ))}
          {running ? (
            <p className="rounded-xl bg-emerald-400/10 px-3 py-2 text-[12px] text-emerald-300">
              Thinking, then I’ll reply and take the actions…
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
