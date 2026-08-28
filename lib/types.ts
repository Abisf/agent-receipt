export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
};

export type FileItem = {
  id: string;
  name: string;
  folder: string;
  content: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  time: string;
  date: string;
};

export type WorkspaceState = {
  tasks: Task[];
  files: FileItem[];
  events: CalendarEvent[];
};

export type ToolName =
  | "readFile"
  | "createFile"
  | "editFile"
  | "renameFile"
  | "moveFile"
  | "deleteFile"
  | "createTask"
  | "updateTask"
  | "completeTask"
  | "deleteTask"
  | "createEvent"
  | "rescheduleEvent"
  | "deleteEvent";

export type JsonObject = Record<string, unknown>;

export type AgentMode = "gemini" | "deterministic";

export type UndoPayload = {
  action: "deleteTask" | "restoreTask" | "deleteFile" | "restoreFile" | "deleteEvent" | "restoreEvent";
  id: string;
  snapshot?: JsonObject;
};

export type ReceiptEntry = {
  id: string;
  timestamp: string;
  tool: ToolName;
  humanAction: string;
  reason: string;
  input: JsonObject;
  result: JsonObject;
  before: JsonObject | null;
  after: JsonObject | null;
  stateChanged: boolean;
  undoable: boolean;
  undone: boolean;
  undoPayload: UndoPayload | null;
  priorityWhy?: string | null;
  triggeredBy?: string;
  plannerMode?: AgentMode;
  model?: string | null;
};

export type AppStore = {
  workspace: WorkspaceState;
  receipts: ReceiptEntry[];
  conversation: AgentMessage[];
  latestRun: PlannerTrace | null;
};

export type PlannedAction = {
  tool: ToolName;
  args: JsonObject;
  reason: string;
  priorityWhy?: string;
};

export type AgentMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: string;
};

export type ToolDecision = {
  tool: ToolName;
  args: JsonObject;
  reason: string;
  priorityWhy: string | null;
};

export type PlannerTrace = {
  id: string;
  timestamp: string;
  userPrompt: string;
  reply: string;
  modeUsed: AgentMode;
  model: string | null;
  plannerPrompt: string;
  rawResponse: string | null;
  fallbackReason: string | null;
  decisions: ToolDecision[];
};

export type Snapshot = {
  workspace: WorkspaceState;
  receipts: ReceiptEntry[];
  conversation: AgentMessage[];
  latestRun: PlannerTrace | null;
  agentMode: AgentMode;
  geminiConfigured: boolean;
};
