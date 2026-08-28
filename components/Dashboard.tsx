"use client";

import { useState } from "react";
import { AgentPanel } from "./AgentPanel";
import { AgentReply } from "./AgentReply";
import { PlannerTraceView } from "./PlannerTrace";
import { ReceiptList } from "./ReceiptList";
import { Workspace } from "./Workspace";
import { DEMO_PROMPT } from "@/lib/format";
import type { AgentMessage, PlannerTrace, ReceiptEntry, Snapshot } from "@/lib/types";

function idsFromReceipts(receipts: ReceiptEntry[]) {
  const ids: string[] = [];
  for (const r of receipts) {
    if (typeof r.after?.id === "string") ids.push(r.after.id);
    if (typeof r.before?.id === "string") ids.push(r.before.id);
  }
  return ids;
}

export function Dashboard({ initial }: { initial: Snapshot }) {
  const [workspace, setWorkspace] = useState(initial.workspace);
  const [receipts, setReceipts] = useState(initial.receipts);
  const [conversation, setConversation] = useState<AgentMessage[]>(initial.conversation ?? []);
  const [latestRun, setLatestRun] = useState<PlannerTrace | null>(initial.latestRun ?? null);
  const [prompt, setPrompt] = useState(DEMO_PROMPT);
  const [running, setRunning] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modeUsed, setModeUsed] = useState(initial.agentMode);
  const [geminiConfigured, setGeminiConfigured] = useState(initial.geminiConfigured);
  const [flashIds, setFlashIds] = useState<string[]>([]);

  function applySnapshot(snapshot: Snapshot) {
    setWorkspace(snapshot.workspace);
    setReceipts(snapshot.receipts);
    setConversation(snapshot.conversation ?? []);
    setLatestRun(snapshot.latestRun ?? null);
    setGeminiConfigured(snapshot.geminiConfigured);
  }

  async function runAgent() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Agent failed");
      applySnapshot(data.snapshot);
      setModeUsed(data.modeUsed);
      setFlashIds(idsFromReceipts(data.receipts ?? []));
      window.setTimeout(() => setFlashIds([]), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent failed");
    } finally {
      setRunning(false);
    }
  }

  async function undo(receiptId: string) {
    setUndoingId(receiptId);
    setError(null);
    try {
      const res = await fetch("/api/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Undo failed");
      applySnapshot(data.snapshot);
      const restoredId =
        typeof data.receipt?.before?.id === "string"
          ? data.receipt.before.id
          : typeof data.receipt?.after?.id === "string"
            ? data.receipt.after.id
            : null;
      if (restoredId) {
        setFlashIds([restoredId]);
        window.setTimeout(() => setFlashIds([]), 1800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Undo failed");
    } finally {
      setUndoingId(null);
    }
  }

  async function resetWorkspace() {
    setResetting(true);
    setError(null);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      applySnapshot(data);
      setModeUsed(data.agentMode);
      setFlashIds([]);
      setPrompt(DEMO_PROMPT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-start justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-[13px] font-bold text-emerald-300">
                AR
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Agent Receipt
              </h1>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              See exactly what your AI agent did, why it did it, and undo anything you disagree
              with.
            </p>
          </div>
          <button
            type="button"
            onClick={resetWorkspace}
            disabled={resetting}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {resetting ? "Resetting…" : "Reset workspace"}
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-5 py-6 lg:flex-row lg:items-start sm:px-8">
        <section className="min-w-0 flex-1">
          <Workspace workspace={workspace} flashIds={flashIds} />
        </section>

        <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-[460px]">
          <div className="receipt-rail">
            <AgentPanel
              prompt={prompt}
              running={running}
              error={error}
              modeUsed={modeUsed}
              geminiConfigured={geminiConfigured}
              fallbackReason={latestRun?.fallbackReason ?? null}
              onPromptChange={setPrompt}
              onRun={runAgent}
            />
            <AgentReply messages={conversation} running={running} />
            <PlannerTraceView trace={latestRun} />
            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Receipt</h2>
                <span className="text-[11px] text-slate-400">
                  {receipts.length === 0
                    ? "Empty"
                    : `${receipts.length} action${receipts.length === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="max-h-[min(42vh,420px)] overflow-y-auto pr-1">
                <ReceiptList receipts={receipts} undoingId={undoingId} onUndo={undo} />
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
