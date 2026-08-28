import type { JsonObject } from "./types";

export function formatValue(value: unknown): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value == null || value === "") return "—";
  return String(value);
}

function snippet(value: unknown) {
  const text = formatValue(value).replace(/\s+/g, " ").trim();
  if (text.length <= 48) return text;
  return text.slice(0, 45) + "…";
}

const CHANGE_KEYS = ["content", "priority", "status", "folder", "time", "date", "title", "name"] as const;

export function formatChange(
  before: JsonObject | null,
  after: JsonObject | null,
): { from: string; to: string } | null {
  if (!before && after) {
    const created = formatValue(after.title ?? after.name);
    const when = [after.date, after.time].filter(Boolean).join(" ");
    return { from: "—", to: when ? `${created} · ${when}` : created };
  }
  if (before && !after) {
    return { from: formatValue(before.title ?? before.name), to: "Removed" };
  }
  if (!before || !after) return null;

  for (const key of CHANGE_KEYS) {
    if (before[key] !== after[key] && (before[key] !== undefined || after[key] !== undefined)) {
      return { from: snippet(before[key]), to: snippet(after[key]) };
    }
  }
  return null;
}

export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export const DEMO_PROMPT =
  "Clean up the launch workspace, update the launch plan to say we ship Friday, remove obsolete files, and move tomorrow's launch review to 9 AM.";

export const EXAMPLE_PROMPTS = [
  {
    label: "Launch cleanup",
    prompt: DEMO_PROMPT,
  },
  {
    label: "Book a meeting",
    prompt: "Add a 9pm meeting tomorrow with my lead developer.",
  },
  {
    label: "Add a customer",
    prompt: "Add customer Contoso to the customer list.",
  },
  {
    label: "Just say hi",
    prompt: "hi, what can you do?",
  },
] as const;

