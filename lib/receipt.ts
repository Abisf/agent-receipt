import { getStore, saveStore } from "./state";
import type { ReceiptEntry, ToolName, JsonObject, UndoPayload } from "./types";

export function createReceipt(params: {
  tool: ToolName;
  humanAction: string;
  reason: string;
  input: JsonObject;
  result: JsonObject;
  before: JsonObject | null;
  after: JsonObject | null;
  undoable: boolean;
  undoPayload: UndoPayload | null;
  stateChanged?: boolean;
}): ReceiptEntry {
  const entry: ReceiptEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    undone: false,
    ...params,
    stateChanged: params.stateChanged ?? params.undoable,
  };
  const store = getStore();
  store.receipts.unshift(entry);
  saveStore();
  return entry;
}

export function findReceipt(id: string) {
  return getStore().receipts.find((r) => r.id === id) ?? null;
}

export function markUndone(id: string) {
  const entry = findReceipt(id);
  if (!entry) throw new Error("Receipt not found");
  entry.undone = true;
  saveStore();
  return entry;
}
