import type { PlannedAction, ToolName, WorkspaceState } from "./types";
import { isToolName } from "./tools";

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
].filter((m): m is string => Boolean(m));

export type GeminiPlanResult = {
  actions: PlannedAction[];
  reply: string;
  model: string;
  plannerPrompt: string;
  rawResponse: string;
};

export function summarizeState(state: WorkspaceState) {
  return {
    tasks: state.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
    })),
    files: state.files.map((f) => ({
      id: f.id,
      name: f.name,
      folder: f.folder,
      preview: f.content.slice(0, 180),
    })),
    events: state.events.map((e) => ({
      id: e.id,
      title: e.title,
      time: e.time,
      date: e.date,
    })),
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : trimmed;
  return JSON.parse(raw);
}

function asPriorityWhy(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizePlan(raw: unknown): { reply: string; actions: PlannedAction[] } {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(obj.actions)
      ? obj.actions
      : [];
  const reply = typeof obj.reply === "string" ? obj.reply.trim() : "";

  const actions: PlannedAction[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (!isToolName(rec.tool)) continue;
    const nested =
      rec.args && typeof rec.args === "object" && !Array.isArray(rec.args)
        ? (rec.args as Record<string, unknown>)
        : {};
    const args: Record<string, unknown> = { ...nested };
    for (const [key, value] of Object.entries(rec)) {
      if (key === "tool" || key === "args" || key === "reason" || key === "priorityWhy") continue;
      if (args[key] == null && value != null && value !== "") args[key] = value;
    }
    const reason =
      typeof rec.reason === "string" && rec.reason.trim()
        ? rec.reason.trim()
        : "The agent judged this useful for the request.";
    const priorityWhy = asPriorityWhy(rec.priorityWhy);
    actions.push({
      tool: rec.tool as ToolName,
      args,
      reason,
      ...(priorityWhy ? { priorityWhy } : {}),
    });
  }
  return { reply, actions: actions.slice(0, 8) };
}

export function buildPlannerPrompt(userPrompt: string, state: WorkspaceState) {
  return `You are an operations agent inside an Agent Workspace (files, tasks, calendar).
Talk back to the user. Only take tool actions when they asked for workspace work.

Available tools:
FILES
- readFile(fileId)  inspect contents; does not change state
- createFile(name, content, folder)
- editFile(fileId, newContent)  replace entire file contents
- renameFile(fileId, newName)
- moveFile(fileId, newFolder)
- deleteFile(fileId)
TASKS
- createTask(title, priority)  priority: low | medium | high
- updateTask(taskId, priority?, status?, title?)
- completeTask(taskId)
- deleteTask(taskId)
CALENDAR
- createEvent(title, time, date)  time like "9:00 PM"; date like "Today" or "Tomorrow"
- rescheduleEvent(eventId, newTime)
- deleteEvent(eventId)

Return JSON only:
{"reply":"2-5 sentences","actions":[{"tool":"...","args":{},"reason":"..."}]}

Rules:
- Greetings / "what can you do" → actions: []
- Copy real IDs from the workspace snapshot. Do not invent IDs.
- For cleanup / launch-plan / ship Friday requests, use this sequence:
  1. readFile launch-plan.md
  2. editFile launch-plan.md so it says we ship Friday (keep the rest)
  3. moveFile demo-script.md to Ready
  4. deleteFile old-notes.txt
  5. rescheduleEvent Launch Review to 9:00 AM
- Booking a meeting uses createEvent with title/time/date filled in.
- editFile newContent must be the FULL new file text.
- Do not call the same tool on the same entity twice.

User request:
${userPrompt}

Workspace snapshot:
${JSON.stringify(summarizeState(state), null, 2)}`;
}

async function callGemini(model: string, prompt: string, apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? "";
  if (!text.trim()) throw new Error("Empty Gemini response");
  const parsed = normalizePlan(extractJson(text));
  return { ...parsed, rawResponse: text };
}

export async function geminiAgent(
  prompt: string,
  state: WorkspaceState,
): Promise<GeminiPlanResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const plannerPrompt = buildPlannerPrompt(prompt, state);
  for (const model of GEMINI_MODELS) {
    try {
      const result = await callGemini(model, plannerPrompt, apiKey);
      return {
        actions: result.actions,
        reply: result.reply || "Got it.",
        model,
        plannerPrompt,
        rawResponse: result.rawResponse,
      };
    } catch {
      // next model, then deterministic
    }
  }
  return null;
}
