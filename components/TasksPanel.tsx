"use client";

import type { Task } from "@/lib/types";

const priorityStyle: Record<Task["priority"], string> = {
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  medium: "bg-amber-50 text-amber-800 ring-amber-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
};

const statusStyle: Record<Task["status"], string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-sky-50 text-sky-700",
  done: "bg-emerald-50 text-emerald-700",
};

function statusLabel(status: Task["status"]) {
  if (status === "in_progress") return "In progress";
  if (status === "done") return "Done";
  return "To do";
}

export function TasksPanel({
  tasks,
  flashIds,
}: {
  tasks: Task[];
  flashIds: string[];
}) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Tasks</h2>
        <span>{tasks.length}</span>
      </header>
      <ul className="divide-y divide-slate-100">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={`flex items-start justify-between gap-3 px-4 py-3 transition ${
              flashIds.includes(task.id) ? "flash-row" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
              <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle[task.status]}`}>
                {statusLabel(task.status)}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${priorityStyle[task.priority]}`}
            >
              {task.priority}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
