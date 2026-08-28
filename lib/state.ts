import fs from "fs";
import path from "path";
import type { AppStore, Snapshot, WorkspaceState } from "./types";

const DATA_DIR = path.join(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? "/tmp" : process.cwd(),
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? "agent-receipt" : ".data",
);
const DATA_PATH = path.join(DATA_DIR, "store.json");

const g = globalThis as typeof globalThis & {
  __agentReceiptStore?: AppStore;
};

const LAUNCH_PLAN = `# Launch plan

Our launch date is Monday.

We still need final QA and a demo dry-run before we ship.
`;

const OLD_NOTES = `Scratch notes from last quarter.

Do not use these for the launch. This file is obsolete.
`;

const DEMO_SCRIPT = `# Demo script

1. Show the workspace.
2. Run the agent.
3. Undo the calendar change.
`;

const BUDGET = `Launch budget remaining: $12,400
Paid ads: $4,200
Venue: $1,800
`;

const CUSTOMER_CSV = `name,status
Acme Corp,active
Northstar Labs,follow-up
`;

export function initialWorkspace(): WorkspaceState {
  return {
    tasks: [
      { id: "task-1", title: "Prepare Demo", status: "todo", priority: "high" },
      { id: "task-2", title: "Final QA", status: "todo", priority: "medium" },
    ],
    files: [
      { id: "file-1", name: "launch-plan.md", folder: "Drafts", content: LAUNCH_PLAN },
      { id: "file-2", name: "old-notes.txt", folder: "Drafts", content: OLD_NOTES },
      { id: "file-3", name: "budget.txt", folder: "Ready", content: BUDGET },
      { id: "file-4", name: "demo-script.md", folder: "Drafts", content: DEMO_SCRIPT },
      { id: "file-5", name: "customer-list.csv", folder: "Ready", content: CUSTOMER_CSV },
    ],
    events: [
      { id: "event-1", title: "Launch Review", time: "2:00 PM", date: "Tomorrow" },
    ],
  };
}

function emptyStore(): AppStore {
  return { workspace: initialWorkspace(), receipts: [], conversation: [], latestRun: null };
}

function isCurrentShape(store: AppStore) {
  const files = store.workspace?.files;
  return Array.isArray(files) && files.every((file) => typeof file.content === "string");
}

function readFromDisk(): AppStore | null {
  try {
    if (!fs.existsSync(DATA_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) as AppStore & {
      company?: WorkspaceState;
    };
    const workspace = parsed.workspace ?? parsed.company;
    if (!workspace || !Array.isArray(parsed.receipts)) return null;
    const store: AppStore = {
      workspace,
      receipts: parsed.receipts,
      conversation: Array.isArray(parsed.conversation) ? parsed.conversation : [],
      latestRun: parsed.latestRun ?? null,
    };
    if (!isCurrentShape(store)) return null;
    return store;
  } catch {
    return null;
  }
}

function writeToDisk(store: AppStore) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));
  } catch {
    // Memory still works on read-only hosts (e.g. some serverless).
  }
}

export function getStore(): AppStore {
  if (!g.__agentReceiptStore || !isCurrentShape(g.__agentReceiptStore)) {
    g.__agentReceiptStore = readFromDisk() ?? emptyStore();
  }
  const store = g.__agentReceiptStore;
  if (!Array.isArray(store.conversation)) store.conversation = [];
  if (store.latestRun === undefined) store.latestRun = null;
  return store;
}

export function saveStore() {
  writeToDisk(getStore());
}

export function resetStore(): AppStore {
  g.__agentReceiptStore = emptyStore();
  saveStore();
  return g.__agentReceiptStore;
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getSnapshot(): Snapshot {
  const store = getStore();
  return {
    workspace: store.workspace,
    receipts: store.receipts,
    conversation: store.conversation ?? [],
    latestRun: store.latestRun ?? null,
    agentMode: isGeminiConfigured() ? "gemini" : "deterministic",
    geminiConfigured: isGeminiConfigured(),
  };
}
