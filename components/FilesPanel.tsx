"use client";

import { useEffect, useState } from "react";
import type { FileItem } from "@/lib/types";

export function FilesPanel({
  files,
  flashIds,
}: {
  files: FileItem[];
  flashIds: string[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(files[0]?.id ?? null);
  const selected = files.find((f) => f.id === selectedId) ?? files[0] ?? null;

  useEffect(() => {
    const hit = files.find((f) => flashIds.includes(f.id));
    if (hit) setSelectedId(hit.id);
  }, [flashIds, files]);

  useEffect(() => {
    if (selectedId && !files.some((f) => f.id === selectedId)) {
      setSelectedId(files[0]?.id ?? null);
    }
  }, [files, selectedId]);

  return (
    <section className="panel">
      <header className="panel-header">
        <h2>Files</h2>
        <span>{files.length}</span>
      </header>
      <div className="grid gap-0 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
        <ul className="divide-y divide-slate-100 border-b border-slate-100 md:border-b-0 md:border-r">
          {files.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                onClick={() => setSelectedId(file.id)}
                className={`flex w-full items-start justify-between gap-2 px-4 py-3 text-left ${
                  selected?.id === file.id ? "bg-slate-50" : ""
                } ${flashIds.includes(file.id) ? "flash-row" : ""}`}
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-[13px] text-slate-900">{file.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{file.folder}</p>
                </div>
              </button>
            </li>
          ))}
          {files.length === 0 ? (
            <li className="px-4 py-6 text-[13px] text-slate-400">No files. Restore from a receipt.</li>
          ) : null}
        </ul>
        <div className="min-h-[180px] px-4 py-3">
          {selected ? (
            <>
              <p className="font-mono text-[12px] font-semibold text-slate-700">{selected.name}</p>
              <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 font-mono text-[12px] leading-relaxed text-slate-700">
                {selected.content}
              </pre>
            </>
          ) : (
            <p className="text-[13px] text-slate-400">Select a file to read its contents.</p>
          )}
        </div>
      </div>
    </section>
  );
}
