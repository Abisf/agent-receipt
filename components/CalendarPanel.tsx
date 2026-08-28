"use client";

import type { CalendarEvent } from "@/lib/types";

export function CalendarPanel({
  events,
  flashIds,
}: {
  events: CalendarEvent[];
  flashIds: string[];
}) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Calendar</h2>
        <span>{events.length}</span>
      </header>
      <ul className="divide-y divide-slate-100">
        {events.map((event) => (
          <li
            key={event.id}
            className={`flex items-center justify-between gap-3 px-4 py-3 ${
              flashIds.includes(event.id) ? "flash-row" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{event.title}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">{event.date || "Today"}</p>
            </div>
            <span className="shrink-0 rounded-md bg-indigo-50 px-2 py-1 font-mono text-[12px] font-semibold text-indigo-700">
              {event.time}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
