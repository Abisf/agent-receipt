# Agent Receipt

A general **action-audit layer** between an AI agent and its tools.

The workspace is simulated. The product is the interceptor: every tool call is logged as a human-readable receipt. Read-only calls are logged with no undo. State-changing calls capture enough prior state to reverse. Deleting a file removes it from the workspace; the receipt survives; **Restore** puts it back.

See **[SPEC.md](./SPEC.md)** for the full product spec (problem, tools, receipt shape, demo, out of scope).

## 60-second demo

1. Open the app. Left = Agent Workspace (files with contents, tasks, calendar). Right = tracker.
2. Click **Use demo preset**:
   `Clean up the launch workspace, update the launch plan to say we ship Friday, remove obsolete files, and move tomorrow's launch review to 9 AM.`
3. Click **Run Agent**.
4. Receipt should show:
   - **Read** launch-plan.md — no undo
   - **Edit** Monday → Friday — Undo
   - **Move** demo-script.md to Ready — Undo
   - **Delete** old-notes.txt — Restore
   - **Reschedule** Launch Review 2:00 PM → 9:00 AM — Undo
5. Click launch-plan.md on the left; contents should say Friday.
6. Click **Restore** on the deleted file. `old-notes.txt` reappears. The receipt stays, marked Undone.

## How to run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Works **without** an API key (deterministic planner). With `GEMINI_API_KEY` in `.env.local`, Gemini chooses tools; the cleanup demo still falls back to the scripted sequence if the model skips a step, so the 60-second story always lands.

## Deploy

```bash
npm run build
npm start
```

Or deploy the Next.js app to Vercel / any Node host.

- Set `GEMINI_API_KEY` in the host env (never commit `.env.local`).
- Optional: `GEMINI_MODEL=gemini-3.6-flash`
- State is in-memory (and `/tmp` on serverless). Fine for a demo. It is not a multi-instance database.

## Architecture

```
Gemini (or deterministic fallback)
        │
        ▼
 Agent Receipt interceptor  →  receipt (tool, input, result, before, after, reason, undo)
        │
        ├── files: read / create / edit / rename / move / delete
        ├── tasks: create / update / complete / delete
        └── calendar: create / reschedule / delete
```

Not every tool is reversible. `readFile` logs activity and does not change state.

## How undo works

Undo is **not** a tool. It reverses a receipt using a stored snapshot.

- `editFile` restores previous contents
- `moveFile` / `renameFile` restore folder / name
- `deleteFile` recreates the full file object (id, name, folder, content)
- `createFile` / `createTask` / `createEvent` delete the created item
- `rescheduleEvent` restores the old time
