import { DEMO_PROMPT } from "./format";
// Vercel git-connect probe: 2026-08-28
import { buildPlannerPrompt, geminiAgent } from "./gemini";
import { getSnapshot, getStore, saveStore } from "./state";
import { executePlannedAction } from "./tools";
import type {
  AgentMessage,
  PlannedAction,
  PlannerTrace,
  ReceiptEntry,
  Snapshot,
  ToolDecision,
  WorkspaceState,
} from "./types";

function findFile(state: WorkspaceState, name: string) {
  return state.files.find((f) => f.name.toLowerCase() === name.toLowerCase());
}

function findEvent(state: WorkspaceState, title: string) {
  return state.events.find((e) => e.title.toLowerCase() === title.toLowerCase());
}

export function isCleanupPrompt(prompt: string) {
  return /clean up the launch workspace|ship friday|remove obsolete/i.test(prompt);
}

export function cleanupPlan(state: WorkspaceState): PlannedAction[] {
  const actions: PlannedAction[] = [];
  const plan = findFile(state, "launch-plan.md");
  if (plan) {
    actions.push({
      tool: "readFile",
      args: { fileId: plan.id },
      reason: "Need the current launch plan before changing the ship date.",
    });
    const next = plan.content.replace(/Monday/g, "Friday");
    actions.push({
      tool: "editFile",
      args: { fileId: plan.id, newContent: next },
      reason: "The request said we ship Friday, not Monday.",
    });
  }

  const demo = findFile(state, "demo-script.md");
  if (demo && demo.folder !== "Ready") {
    actions.push({
      tool: "moveFile",
      args: { fileId: demo.id, newFolder: "Ready" },
      reason: "Demo script belongs with ready launch materials, not drafts.",
    });
  }

  const notes = findFile(state, "old-notes.txt");
  if (notes) {
    actions.push({
      tool: "deleteFile",
      args: { fileId: notes.id },
      reason: "Obsolete notes should not sit next to the live launch plan.",
    });
  }

  const review = findEvent(state, "Launch Review");
  if (review && review.time !== "9:00 AM") {
    actions.push({
      tool: "rescheduleEvent",
      args: { eventId: review.id, newTime: "9:00 AM" },
      reason: "Move the review earlier so issues can be fixed before launch.",
    });
  }

  return actions;
}

function parseClock(prompt: string): string | null {
  const match = prompt.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
  if (!match) return null;
  const hour = match[1];
  const minute = match[2] || "00";
  const suffix = /p/i.test(match[3]) ? "PM" : "AM";
  return `${hour}:${minute} ${suffix}`;
}

function meetingFromPrompt(prompt: string): PlannedAction | null {
  if (!/\b(meet|meeting|call|sync|sit-?down|book)\b/i.test(prompt)) return null;
  if (isCleanupPrompt(prompt)) return null;
  const time = parseClock(prompt) || "TBD";
  const date = /\btomorrow\b/i.test(prompt) ? "Tomorrow" : "Today";
  const withMatch = prompt.match(
    /\bwith\s+(?:my\s+)?(.+?)(?=\s+at\b|\s+tomorrow\b|\s+today\b|\s+for\b|$)/i,
  );
  const who = withMatch ? withMatch[1].replace(/[?.!,]+$/g, "").trim() : "";
  const title = who ? `Meeting with ${who}` : "New meeting";
  return {
    tool: "createEvent",
    args: { title, time, date },
    reason: `Booked ${title} for ${date} at ${time}, as requested.`,
  };
}

function customerNameFromPrompt(prompt: string): string | null {
  if (!/customer/i.test(prompt)) return null;
  if (!/\b(add|create|new|append|insert|put)\b/i.test(prompt)) return null;

  const patterns = [
    /\badd\s+["']?([^"'\n]+?)["']?\s+as\s+an?\s+customer/i,
    /\b(?:named|called)\s+["']?([^"'\n]+?)["']?(?:\s+with\s+|\s+as\s+|[.?!]|$)/i,
    /\b(?:add|create|put|insert|append)(?:\s+a|\s+the)?(?:\s+new)?\s+customer(?:\s+named|\s+called|\s+for)?\s+["']?([^"'\n]+?)["']?(?:\s+to\s+|\s+with\s+|\s+as\s+|[.?!]|$)/i,
    /\b(?:add|put|append)\s+["']?([^"'\n]+?)["']?\s+to\s+(?:the\s+)?customer/i,
  ];

  for (const re of patterns) {
    const match = prompt.match(re);
    if (!match?.[1]) continue;
    let name = match[1].trim().replace(/[?.!,]+$/g, "").trim();
    name = name.replace(/^(named|called|for)\s+/i, "");
    name = name.replace(/\s+(as|with)\s+.+$/i, "");
    if (!name || /^to\b/i.test(name) || name.toLowerCase() === "list") continue;
    return name.slice(0, 48).trim();
  }
  return "New Customer";
}

function customerFromPrompt(prompt: string, state: WorkspaceState): PlannedAction | null {
  const name = customerNameFromPrompt(prompt);
  if (!name) return null;
  const csv = findFile(state, "customer-list.csv");
  if (!csv) return null;

  let status = "active";
  if (/follow/i.test(prompt)) status = "follow-up";

  const lines = csv.content.replace(/\s+$/, "").split(/\r?\n/);
  const already = lines.some((line) => line.toLowerCase().startsWith(`${name.toLowerCase()},`));
  if (already) return null;

  const newContent = `${lines.join("\n")}\n${name},${status}\n`;
  return {
    tool: "editFile",
    args: { fileId: csv.id, newContent },
    reason: `Added ${name} to customer-list.csv.`,
  };
}

export function wantsWorkspaceActions(prompt: string) {
  return /launch|clean|ship|file|task|calendar|schedule|reschedule|move|delete|edit|read|create|event|folder|review|qa|meet|meeting|call|book|tomorrow|obsolete|rename|customer|csv/i.test(
    prompt,
  );
}

export function deterministicAgent(prompt: string, state: WorkspaceState): PlannedAction[] {
  if (isCleanupPrompt(prompt)) return cleanupPlan(state);
  const meeting = meetingFromPrompt(prompt);
  if (meeting) return [meeting];
  const customer = customerFromPrompt(prompt, state);
  if (customer) return [customer];
  if (!wantsWorkspaceActions(prompt)) return [];
  return cleanupPlan(state);
}

function fallbackReply(prompt: string, actions: PlannedAction[]) {
  if (actions.length === 0) {
    return `I can read, edit, move, and delete files; update tasks; and schedule events. Every call is logged on the receipt. Try: “${DEMO_PROMPT}”`;
  }
  if (
    actions.some(
      (action) =>
        action.tool === "editFile" &&
        /customer-list|name,status/i.test(
          String(action.args.newContent ?? action.args.content ?? action.reason ?? ""),
        ),
    )
  ) {
    return `I added the customer to customer-list.csv. Open that file on the left to see the new row — undo from the receipt restores the previous CSV.`;
  }
  if (isCleanupPrompt(prompt)) {
    return "I’ll inspect the launch plan, change the ship date to Friday, move the demo script to Ready, delete obsolete notes, and pull Launch Review to 9:00 AM. Reads are logged without undo; edits, moves, deletes, and reschedules can be reversed from the receipt.";
  }
  const names = actions.map((a) => a.tool).join(", ");
  return `I understood: “${prompt}”. Taking ${actions.length} action${actions.length === 1 ? "" : "s"} (${names}). Each one is on the receipt.`;
}

function toDecisions(actions: PlannedAction[]): ToolDecision[] {
  return actions.map((action) => ({
    tool: action.tool,
    args: action.args,
    reason: action.reason,
    priorityWhy: action.priorityWhy ?? null,
  }));
}

function pushMessage(role: AgentMessage["role"], text: string) {
  const store = getStore();
  store.conversation.push({
    id: crypto.randomUUID(),
    role,
    text,
    timestamp: new Date().toISOString(),
  });
  if (store.conversation.length > 12) {
    store.conversation = store.conversation.slice(-12);
  }
}

export async function runAgent(prompt: string): Promise<{
  snapshot: Snapshot;
  receipts: ReceiptEntry[];
  modeUsed: "gemini" | "deterministic";
}> {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("Prompt is required");

  const state = getStore().workspace;
  let modeUsed: "gemini" | "deterministic" = "deterministic";
  let actions: PlannedAction[] = [];
  let reply = "";
  let model: string | null = null;
  let plannerPrompt = buildPlannerPrompt(trimmed, state);
  let rawResponse: string | null = null;
  let fallbackReason: string | null = null;

  try {
    const gemini = await geminiAgent(trimmed, state);
    if (gemini) {
      actions = gemini.actions;
      reply = gemini.reply;
      model = gemini.model;
      plannerPrompt = gemini.plannerPrompt;
      rawResponse = gemini.rawResponse;
      modeUsed = "gemini";
    }
  } catch (error) {
    fallbackReason = error instanceof Error ? error.message : "Gemini failed.";
    actions = [];
  }

  if (modeUsed !== "gemini") {
    actions = isCleanupPrompt(trimmed)
      ? cleanupPlan(getStore().workspace)
      : deterministicAgent(trimmed, getStore().workspace);
    modeUsed = "deterministic";
    model = null;
    rawResponse = null;
    if (!fallbackReason) {
      fallbackReason = process.env.GEMINI_API_KEY?.trim()
        ? "Gemini returned nothing."
        : "GEMINI_API_KEY is not set on this host (Vercel env or .env.local).";
    }
    plannerPrompt = `Deterministic planner. ${fallbackReason}\n\n` + buildPlannerPrompt(trimmed, getStore().workspace);
  }

  const booked = meetingFromPrompt(trimmed);
  const hasRealEvent = actions.some(
    (action) => action.tool === "createEvent" && Boolean(action.args.title || action.args.time),
  );
  if (booked && !hasRealEvent) {
    actions = [
      ...actions.filter(
        (action) => action.tool !== "createEvent" || Boolean(action.args.title || action.args.time),
      ),
      booked,
    ];
  }

  const csv = findFile(getStore().workspace, "customer-list.csv");
  const customer = customerFromPrompt(trimmed, getStore().workspace);
  const customerName = customerNameFromPrompt(trimmed);
  const editedCsv = actions.some((action) => {
    if (action.tool !== "editFile") return false;
    const id = String(action.args.fileId ?? action.args.id ?? action.args.name ?? "");
    const content = String(action.args.newContent ?? action.args.content ?? "");
    const targetsCsv =
      id === csv?.id ||
      id.toLowerCase().includes("customer-list") ||
      /name\s*,\s*status/i.test(content);
    const hasName = !customerName || content.toLowerCase().includes(customerName.toLowerCase());
    return Boolean(content) && targetsCsv && hasName;
  });
  if (customer && !editedCsv) {
    actions = [
      ...actions.filter((action) => {
        if (action.tool !== "editFile") return true;
        const id = String(action.args.fileId ?? action.args.id ?? action.args.name ?? "");
        return id !== csv?.id && !id.toLowerCase().includes("customer-list");
      }),
      customer,
    ];
    if (reply && !/customer-list/i.test(reply)) {
      reply = `${reply} I also added the customer to customer-list.csv.`;
    }
  }

  if (!reply) reply = fallbackReply(trimmed, actions);

  const receipts: ReceiptEntry[] = [];
  for (const action of actions) {
    try {
      const entry = executePlannedAction(action);
      entry.triggeredBy = trimmed;
      entry.plannerMode = modeUsed;
      entry.model = model;
      receipts.push(entry);
    } catch {
      // skip a bad call so the demo keeps going
    }
  }
  if (receipts.length > 0) saveStore();

  const trace: PlannerTrace = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userPrompt: trimmed,
    reply,
    modeUsed,
    model,
    plannerPrompt,
    rawResponse,
    fallbackReason,
    decisions: toDecisions(actions),
  };

  const store = getStore();
  pushMessage("user", trimmed);
  pushMessage("agent", reply);
  store.latestRun = trace;
  saveStore();

  return { snapshot: getSnapshot(), receipts, modeUsed };
}
