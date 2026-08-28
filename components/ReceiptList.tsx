"use client";

import { ReceiptCard } from "./ReceiptCard";
import type { ReceiptEntry } from "@/lib/types";

export function ReceiptList({
  receipts,
  undoingId,
  onUndo,
}: {
  receipts: ReceiptEntry[];
  undoingId: string | null;
  onUndo: (id: string) => void;
}) {
  if (receipts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-5 py-10 text-center">
        <p className="text-sm font-medium text-white">No actions yet</p>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-400">
          Run the agent and every tool call will appear here as a readable receipt.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {receipts.map((entry) => (
        <ReceiptCard
          key={entry.id}
          entry={entry}
          undoing={undoingId === entry.id}
          onUndo={onUndo}
        />
      ))}
    </div>
  );
}
