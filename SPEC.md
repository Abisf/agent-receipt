# Agent Receipt — Product Spec

**Status:** Hackathon MVP, working end-to-end  
**Stack:** Next.js, TypeScript, Tailwind, Gemini API (optional)  
**Host:** Deployable on Vercel / any Node host

## 1. Problem

AI agents take actions on a user’s behalf and usually leave no readable record of:

- which tool ran
- with what input
- what changed
- why
- whether it can be reversed

The product is **not** a CRM, PDF editor, or real Gmail/Docs integration. Those would change the story. The product is an **action-audit layer** between an agent and its tools.

## 2. Product thesis

> The workspace is simulated. Agent Receipt is tool-agnostic. Files, tasks, and calendar actions all pass through the same interception layer. Read-only actions are logged. State-changing actions capture enough prior state to be reversed. Deleting a resource does not delete its receipt.

## 3. What we built

A demo dashboard called **Agent Workspace**.

**Left:** simulated computer (files with real contents, tasks, calendar).  
**Right (the product):** prompt → agent reply → planner trace → **receipts** with Undo / Restore.

Gemini chooses tools when `GEMINI_API_KEY` is set. If the model is missing, slow, or skips the demo sequence, a deterministic planner still runs so the demo cannot die.

## 4. Agent workspace (simulated)

Three resource types only. No customers.

### Files

| Field | Meaning |
|---|---|
| id | Internal id |
| name | e.g. `launch-plan.md` |
| folder | Drafts / Ready |
| content | Full text (visible in the UI) |

Seeded files: `launch-plan.md`, `budget.txt`, `old-notes.txt`, `demo-script.md`, `customer-list.csv`.

### Tasks

| Field | Meaning |
|---|---|
| id | Internal id |
| title | e.g. Final QA |
| status | todo / in_progress / done |
| priority | low / medium / high |

### Calendar

| Field | Meaning |
|---|---|
| id | Internal id |
| title | e.g. Launch Review |
| date | Today / Tomorrow |
| time | e.g. 2:00 PM |

“With my lead developer” is stored in the **title**. No attendees or Zoom fields.

## 5. Tools (all go through the interceptor)

**Files:** `readFile`, `createFile`, `editFile`, `renameFile`, `moveFile`, `deleteFile`  
**Tasks:** `createTask`, `updateTask`, `completeTask`, `deleteTask`  
**Calendar:** `createEvent`, `rescheduleEvent`, `deleteEvent`

Undo is **not** a tool. Undo reverses a receipt using a stored snapshot.

| Tool | State change? | Undo |
|---|---|---|
| readFile | No | Not applicable |
| editFile / renameFile / moveFile | Yes | Undo restores previous snapshot |
| deleteFile / deleteTask / deleteEvent | Yes | **Restore** recreates the object from `before` |
| createFile / createTask / createEvent | Yes | Undo deletes the created item |
| rescheduleEvent / updateTask / completeTask | Yes | Undo restores previous fields |

Deleting a file removes it from the workspace. The receipt **stays**, including the full previous file (id, name, folder, content). Restore uses that snapshot.

## 6. Receipt shape

Every tool call, including reads, produces:

- id, timestamp
- tool, input, result
- humanAction, reason
- before, after
- stateChanged
- undoable, undone
- undoPayload (when reversible)
- triggeredBy (user prompt)
- plannerMode (gemini / deterministic)

The UI does not dump raw JSON by default. Technical details are expandable.

## 7. Architecture

```
User prompt
    │
    ▼
runAgent()  →  Gemini  or  deterministic fallback
    │
    ▼
executePlannedAction()     ← interceptor
    │
    ├── capture before
    ├── mutate workspace (unless read)
    ├── capture after
    └── append receipt
    │
    ▼
Agent Workspace state     +     Receipt log
                                │
                                ▼
                         Undo / Restore
```

API routes: `POST /api/agent`, `POST /api/undo`, `GET /api/state`, `POST /api/reset`.

State is in-memory (and a JSON file locally, `/tmp` on serverless). Fine for a demo. Not a multi-instance database.

## 8. Demo (under 60 seconds)

Preset prompt:

> Clean up the launch workspace, update the launch plan to say we ship Friday, remove obsolete files, and move tomorrow's launch review to 9 AM.

Expected sequence:

1. **readFile** `launch-plan.md` — logged, no undo  
2. **editFile** Monday → Friday — Undo  
3. **moveFile** `demo-script.md` Drafts → Ready — Undo  
4. **deleteFile** `old-notes.txt` — Restore  
5. **rescheduleEvent** Launch Review 2:00 PM → 9:00 AM — Undo

Judges should see the file contents change, the file disappear, then Restore bring it back while the receipt remains.

This preset uses the **deterministic** planner on purpose so the story always lands. Other prompts (meetings, one-off edits) can use Gemini.

## 9. Out of scope (intentionally)

- OAuth, Gmail, Google Docs, real company APIs
- PDF editing as the product
- Multi-user auth
- Durable production database
- True model “inner thoughts” (we log stated reasons, not neural activations)

## 10. Run and deploy

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

Optional: `.env.local` with `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.6-flash`. Never commit secrets.

Deploy: Vercel or any Node host. Set the same env vars in the host dashboard.
