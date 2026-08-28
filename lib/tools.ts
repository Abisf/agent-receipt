import { createReceipt, findReceipt, markUndone } from "./receipt";
import { getStore, saveStore } from "./state";
import type {
  CalendarEvent,
  FileItem,
  JsonObject,
  PlannedAction,
  Priority,
  ReceiptEntry,
  Task,
  TaskStatus,
  ToolName,
  UndoPayload,
} from "./types";

export const TOOL_NAMES: ToolName[] = [
  "readFile",
  "createFile",
  "editFile",
  "renameFile",
  "moveFile",
  "deleteFile",
  "createTask",
  "updateTask",
  "completeTask",
  "deleteTask",
  "createEvent",
  "rescheduleEvent",
  "deleteEvent",
];

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asPriority(value: unknown): Priority | undefined {
  if (value === "low" || value === "medium" || value === "high") return value;
  return undefined;
}

function asStatus(value: unknown): TaskStatus | undefined {
  if (value === "todo" || value === "in_progress" || value === "done") return value;
  return undefined;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function bytes(content: string) {
  return new TextEncoder().encode(content).length;
}

function fileRecord(file: FileItem) {
  return {
    id: file.id,
    name: file.name,
    folder: file.folder,
    content: file.content,
    bytes: bytes(file.content),
  };
}

export function readFile(fileId: string, reason: string): ReceiptEntry {
  const file = getStore().workspace.files.find((f) => f.id === fileId);
  if (!file) throw new Error(`File not found: ${fileId}`);
  const snapshot = fileRecord(file);
  return createReceipt({
    tool: "readFile",
    humanAction: `Read ${file.name}`,
    reason,
    input: { fileId },
    result: { file: snapshot },
    before: snapshot,
    after: snapshot,
    stateChanged: false,
    undoable: false,
    undoPayload: null,
  });
}

export function createFile(name: string, content: string, reason: string, folder = "Drafts"): ReceiptEntry {
  const store = getStore();
  const file: FileItem = {
    id: newId("file"),
    name: name.trim() || "untitled.txt",
    folder: folder.trim() || "Drafts",
    content,
  };
  store.workspace.files.push(file);
  saveStore();
  return createReceipt({
    tool: "createFile",
    humanAction: `Created ${file.name}`,
    reason,
    input: { name: file.name, content, folder: file.folder },
    result: { file: fileRecord(file) },
    before: null,
    after: fileRecord(file),
    undoable: true,
    undoPayload: { action: "deleteFile", id: file.id },
  });
}

export function editFile(fileId: string, newContent: string, reason: string): ReceiptEntry {
  const store = getStore();
  const file = store.workspace.files.find((f) => f.id === fileId);
  if (!file) throw new Error(`File not found: ${fileId}`);
  const snapshot = clone(file);
  const before = fileRecord(file);
  file.content = newContent;
  saveStore();
  return createReceipt({
    tool: "editFile",
    humanAction: `Edited ${file.name}`,
    reason,
    input: { fileId, newContent },
    result: { file: fileRecord(file) },
    before,
    after: fileRecord(file),
    undoable: true,
    undoPayload: { action: "restoreFile", id: file.id, snapshot },
  });
}

export function renameFile(fileId: string, newName: string, reason: string): ReceiptEntry {
  const store = getStore();
  const file = store.workspace.files.find((f) => f.id === fileId);
  if (!file) throw new Error(`File not found: ${fileId}`);
  const snapshot = clone(file);
  const before = { id: file.id, name: file.name };
  file.name = newName.trim() || file.name;
  saveStore();
  return createReceipt({
    tool: "renameFile",
    humanAction: `Renamed file to ${file.name}`,
    reason,
    input: { fileId, newName: file.name },
    result: { file: fileRecord(file) },
    before,
    after: { id: file.id, name: file.name },
    undoable: true,
    undoPayload: { action: "restoreFile", id: file.id, snapshot },
  });
}

export function moveFile(fileId: string, newFolder: string, reason: string): ReceiptEntry {
  const store = getStore();
  const file = store.workspace.files.find((f) => f.id === fileId);
  if (!file) throw new Error(`File not found: ${fileId}`);
  const snapshot = clone(file);
  const before = { id: file.id, name: file.name, folder: file.folder };
  file.folder = newFolder.replace(/^\//, "").trim() || file.folder;
  saveStore();
  return createReceipt({
    tool: "moveFile",
    humanAction: `Moved ${file.name} to ${file.folder}`,
    reason,
    input: { fileId, newFolder: file.folder },
    result: { file: fileRecord(file) },
    before,
    after: { id: file.id, name: file.name, folder: file.folder },
    undoable: true,
    undoPayload: { action: "restoreFile", id: file.id, snapshot },
  });
}

export function deleteFile(fileId: string, reason: string): ReceiptEntry {
  const store = getStore();
  const file = store.workspace.files.find((f) => f.id === fileId);
  if (!file) throw new Error(`File not found: ${fileId}`);
  const snapshot = clone(file);
  const before = fileRecord(file);
  store.workspace.files = store.workspace.files.filter((f) => f.id !== fileId);
  saveStore();
  return createReceipt({
    tool: "deleteFile",
    humanAction: `Deleted ${snapshot.name}`,
    reason,
    input: { fileId },
    result: { deleted: true, bytes: before.bytes },
    before,
    after: null,
    undoable: true,
    undoPayload: { action: "restoreFile", id: snapshot.id, snapshot },
  });
}

export function createTask(title: string, priority: Priority, reason: string): ReceiptEntry {
  const store = getStore();
  const task: Task = {
    id: newId("task"),
    title: title.trim() || "Untitled task",
    status: "todo",
    priority,
  };
  store.workspace.tasks.push(task);
  saveStore();
  return createReceipt({
    tool: "createTask",
    humanAction: `Created task “${task.title}”`,
    reason,
    input: { title: task.title, priority },
    result: { task },
    before: null,
    after: { ...task },
    undoable: true,
    undoPayload: { action: "deleteTask", id: task.id },
  });
}

export function updateTask(
  taskId: string,
  patch: { title?: string; priority?: Priority; status?: TaskStatus },
  reason: string,
): ReceiptEntry {
  const store = getStore();
  const task = store.workspace.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  const snapshot = clone(task);
  const before = { ...task };
  if (patch.title) task.title = patch.title;
  if (patch.priority) task.priority = patch.priority;
  if (patch.status) task.status = patch.status;
  saveStore();
  return createReceipt({
    tool: "updateTask",
    humanAction: `Updated “${task.title}”`,
    reason,
    input: { taskId, ...patch },
    result: { task },
    before,
    after: { ...task },
    undoable: true,
    undoPayload: { action: "restoreTask", id: task.id, snapshot },
  });
}

export function completeTask(taskId: string, reason: string): ReceiptEntry {
  const store = getStore();
  const task = store.workspace.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  const snapshot = clone(task);
  const before = { id: task.id, title: task.title, status: task.status };
  task.status = "done";
  saveStore();
  return createReceipt({
    tool: "completeTask",
    humanAction: `Completed “${task.title}”`,
    reason,
    input: { taskId },
    result: { task },
    before,
    after: { id: task.id, title: task.title, status: task.status },
    undoable: true,
    undoPayload: { action: "restoreTask", id: task.id, snapshot },
  });
}

export function deleteTask(taskId: string, reason: string): ReceiptEntry {
  const store = getStore();
  const task = store.workspace.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  const snapshot = clone(task);
  store.workspace.tasks = store.workspace.tasks.filter((t) => t.id !== taskId);
  saveStore();
  return createReceipt({
    tool: "deleteTask",
    humanAction: `Deleted task “${snapshot.title}”`,
    reason,
    input: { taskId },
    result: { deleted: true },
    before: snapshot,
    after: null,
    undoable: true,
    undoPayload: { action: "restoreTask", id: snapshot.id, snapshot },
  });
}

function splitWhen(timeRaw: string, dateRaw: string) {
  let time = timeRaw.trim();
  let date = dateRaw.trim();
  if (/tomorrow/i.test(time)) {
    date = date || "Tomorrow";
    time = time.replace(/tomorrow,?/gi, "").trim();
  } else if (/\btoday\b/i.test(time)) {
    date = date || "Today";
    time = time.replace(/\btoday\b,?/gi, "").trim();
  }
  time = time.replace(/^at\s+/i, "").trim();
  return { time: time || "TBD", date: date || "Today" };
}

export function createEvent(title: string, time: string, reason: string, date = ""): ReceiptEntry {
  const store = getStore();
  const when = splitWhen(time, date);
  const event: CalendarEvent = {
    id: newId("event"),
    title: title.trim() || "Untitled event",
    time: when.time,
    date: when.date,
  };
  store.workspace.events.push(event);
  saveStore();
  return createReceipt({
    tool: "createEvent",
    humanAction: `Created “${event.title}” (${event.date} ${event.time})`,
    reason,
    input: { title: event.title, time: event.time, date: event.date },
    result: { event },
    before: null,
    after: { ...event },
    undoable: true,
    undoPayload: { action: "deleteEvent", id: event.id },
  });
}

export function rescheduleEvent(eventId: string, newTime: string, reason: string): ReceiptEntry {
  const store = getStore();
  const event = store.workspace.events.find((e) => e.id === eventId);
  if (!event) throw new Error(`Event not found: ${eventId}`);
  const snapshot = clone(event);
  const before = { id: event.id, title: event.title, time: event.time, date: event.date };
  event.time = newTime.trim() || event.time;
  saveStore();
  return createReceipt({
    tool: "rescheduleEvent",
    humanAction: `Rescheduled ${event.title}`,
    reason,
    input: { eventId, newTime: event.time },
    result: { event },
    before,
    after: { id: event.id, title: event.title, time: event.time, date: event.date },
    undoable: true,
    undoPayload: { action: "restoreEvent", id: event.id, snapshot },
  });
}

export function deleteEvent(eventId: string, reason: string): ReceiptEntry {
  const store = getStore();
  const event = store.workspace.events.find((e) => e.id === eventId);
  if (!event) throw new Error(`Event not found: ${eventId}`);
  const snapshot = clone(event);
  store.workspace.events = store.workspace.events.filter((e) => e.id !== eventId);
  saveStore();
  return createReceipt({
    tool: "deleteEvent",
    humanAction: `Deleted event “${snapshot.title}”`,
    reason,
    input: { eventId },
    result: { deleted: true },
    before: snapshot,
    after: null,
    undoable: true,
    undoPayload: { action: "restoreEvent", id: snapshot.id, snapshot },
  });
}

export function executePlannedAction(action: PlannedAction): ReceiptEntry {
  const { tool, args, reason } = action;
  let entry: ReceiptEntry;
  switch (tool) {
    case "readFile":
      entry = readFile(asString(args.fileId) || asString(args.id), reason);
      break;
    case "createFile":
      entry = createFile(
        asString(args.name) || asString(args.title),
        asString(args.content),
        reason,
        asString(args.folder) || "Drafts",
      );
      break;
    case "editFile":
      entry = editFile(asString(args.fileId) || asString(args.id), asString(args.newContent) || asString(args.content), reason);
      break;
    case "renameFile":
      entry = renameFile(asString(args.fileId) || asString(args.id), asString(args.newName) || asString(args.name), reason);
      break;
    case "moveFile":
      entry = moveFile(asString(args.fileId) || asString(args.id), asString(args.newFolder) || asString(args.folder), reason);
      break;
    case "deleteFile":
      entry = deleteFile(asString(args.fileId) || asString(args.id), reason);
      break;
    case "createTask":
      entry = createTask(asString(args.title), asPriority(args.priority) ?? "medium", reason);
      break;
    case "updateTask":
      entry = updateTask(
        asString(args.taskId) || asString(args.id),
        {
          title: asString(args.title) || undefined,
          priority: asPriority(args.priority) ?? asPriority(args.newPriority),
          status: asStatus(args.status),
        },
        reason,
      );
      break;
    case "completeTask":
      entry = completeTask(asString(args.taskId) || asString(args.id), reason);
      break;
    case "deleteTask":
      entry = deleteTask(asString(args.taskId) || asString(args.id), reason);
      break;
    case "createEvent":
      entry = createEvent(
        asString(args.title) || asString(args.name),
        asString(args.time) || asString(args.when) || asString(args.newTime),
        reason,
        asString(args.date) || asString(args.day),
      );
      break;
    case "rescheduleEvent":
      entry = rescheduleEvent(
        asString(args.eventId) || asString(args.id),
        asString(args.newTime) || asString(args.time),
        reason,
      );
      break;
    case "deleteEvent":
      entry = deleteEvent(asString(args.eventId) || asString(args.id), reason);
      break;
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
  if (action.priorityWhy) {
    entry.priorityWhy = action.priorityWhy;
    saveStore();
  }
  return entry;
}

function restoreTask(id: string, snapshot: JsonObject) {
  const store = getStore();
  const restored = snapshot as unknown as Task;
  const idx = store.workspace.tasks.findIndex((t) => t.id === id);
  if (idx === -1) store.workspace.tasks.push(restored);
  else store.workspace.tasks[idx] = restored;
}

function restoreFile(id: string, snapshot: JsonObject) {
  const store = getStore();
  const restored = snapshot as unknown as FileItem;
  const idx = store.workspace.files.findIndex((f) => f.id === id);
  if (idx === -1) store.workspace.files.push(restored);
  else store.workspace.files[idx] = restored;
}

function restoreEvent(id: string, snapshot: JsonObject) {
  const store = getStore();
  const restored = snapshot as unknown as CalendarEvent;
  const idx = store.workspace.events.findIndex((e) => e.id === id);
  if (idx === -1) store.workspace.events.push(restored);
  else store.workspace.events[idx] = restored;
}

function applyUndo(payload: UndoPayload) {
  const store = getStore();
  switch (payload.action) {
    case "deleteTask":
      store.workspace.tasks = store.workspace.tasks.filter((t) => t.id !== payload.id);
      break;
    case "restoreTask":
      if (!payload.snapshot) throw new Error("Missing task snapshot");
      restoreTask(payload.id, payload.snapshot);
      break;
    case "deleteFile":
      store.workspace.files = store.workspace.files.filter((f) => f.id !== payload.id);
      break;
    case "restoreFile":
      if (!payload.snapshot) throw new Error("Missing file snapshot");
      restoreFile(payload.id, payload.snapshot);
      break;
    case "deleteEvent":
      store.workspace.events = store.workspace.events.filter((e) => e.id !== payload.id);
      break;
    case "restoreEvent":
      if (!payload.snapshot) throw new Error("Missing event snapshot");
      restoreEvent(payload.id, payload.snapshot);
      break;
    default:
      throw new Error("Unknown undo action");
  }
  saveStore();
}

export function undoReceipt(receiptId: string): ReceiptEntry {
  const entry = findReceipt(receiptId);
  if (!entry) throw new Error("Receipt not found");
  if (entry.undone) throw new Error("This action was already undone");
  if (!entry.undoable || !entry.undoPayload) throw new Error("This action cannot be undone");
  applyUndo(entry.undoPayload);
  return markUndone(receiptId);
}

export function isToolName(value: unknown): value is ToolName {
  return typeof value === "string" && TOOL_NAMES.includes(value as ToolName);
}
