"use client";

import { CalendarPanel } from "./CalendarPanel";
import { FilesPanel } from "./FilesPanel";
import { TasksPanel } from "./TasksPanel";
import type { WorkspaceState } from "@/lib/types";

export function Workspace({
  workspace,
  flashIds,
}: {
  workspace: WorkspaceState;
  flashIds: string[];
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Agent workspace
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Files, tasks, and calendar</h2>
      </div>
      <FilesPanel files={workspace.files} flashIds={flashIds} />
      <div className="grid gap-4 md:grid-cols-2">
        <TasksPanel tasks={workspace.tasks} flashIds={flashIds} />
        <CalendarPanel events={workspace.events} flashIds={flashIds} />
      </div>
    </div>
  );
}
