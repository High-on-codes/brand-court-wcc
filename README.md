# Brand Court

**WCC Launchpad 30 — Agentic AI track.** A courtroom put your brand on trial, instead of a chatbot that generates one.

## Problem

Indie founders and student startups ship with no brand critique. They can't afford a designer and can't see what's weak, so their brand ends up inconsistent and forgettable.

## How it works

1. **Brief** — you submit a brand brief, optional tagline, palette hex codes, and an optional site URL.
2. **Trial** (streamed live):
   - **Prosecutor** files charges across four categories: positioning, differentiation, accessibility, voice. Accessibility charges must cite deterministic WCAG contrast evidence computed in code — the model never estimates a contrast ratio itself.
   - **Defense** rebuts every charge, conceding the ones backed by hard evidence instead of arguing with facts.
   - **Jury** — three target-customer personas. Each gives an overall impression, but also casts an explicit sustain/dismiss ballot on every charge, which is tallied in code (not by the LLM) into a verdict per charge: sustained, dismissed, or hung on a tie.
   - **Judge** sees that deterministic tally as evidence and proposes one concrete revision per sustained or hung charge — never for a charge the jury dismissed. This is enforced twice: by instruction in the Judge's prompt, and again in code afterward, which drops any revision referencing a dismissed charge regardless of what the Judge wrote.
3. **Human gate** — you accept, reject, or lock each revision. A rejected revision goes back to the Judge for exactly one retry with your feedback attached. If every charge was dismissed there's nothing to gate — the brand stands as submitted.
4. **Brand kit** — once every revision is accepted or locked, a final kit (palette, type pairing, voice rules, tagline) is compiled and exportable as Markdown. The full trial record (evidence, every charge, rebuttal, ballot, the tally, and the final status of every revision) can also be exported as a transcript at any point once the verdict is in, independent of whether a kit is ever generated.

## Why this isn't a "generate my brand" wrapper

- **Deterministic evidence, not vibes — twice over.** `src/lib/checks/contrast.ts` computes real WCAG 2.x contrast ratios (relative luminance formula) for every palette color, handed to the Prosecutor as evidence it's told not to re-estimate. `src/lib/checks/tally.ts` does the same for the jury: every juror's per-charge sustain/dismiss ballot is counted in code, not interpreted by the Judge — a tie is explicitly "hung," never silently broken either way.
- **Structured outputs, not prompt-and-pray.** Every agent call (`src/lib/agents/client.ts`) requests `responseMimeType: "application/json"` with a `responseJsonSchema` generated directly from a zod schema (`z.toJSONSchema`) — one source of truth for the shape. The parsed response is validated against that same zod schema; a validation or parse failure triggers exactly one retry with the error fed back to the model, then throws — no silent fallback.
- **A human gate on every revision**, not just a final "approve all" button. Rejecting a revision costs the Judge exactly one retry, enforced both server-side (the retry endpoint is single-shot) and in the UI (the reject control disappears after one use).
- **Adversarial, not generative.** The four roles (Prosecutor, Defense, Jury, Judge) argue against each other over a shared, append-only record of charges → rebuttals → votes → verdict. No agent can see a later stage's output before it exists.

## Architecture

- **Next.js 16 (App Router)**, deployed on Vercel. No database — all trial state lives client-side in React state; nothing is persisted server-side.
- **Streaming**: `POST /api/trial` returns a `ReadableStream` of newline-delimited `data: {...}` events (one per completed trial phase), consumed client-side with a manual `fetch` + reader loop (not `EventSource`, since that doesn't support POST bodies).
- **Agents** (`src/lib/agents/`): one file per role (`prosecutor.ts`, `defense.ts`, `jury.ts`, `judge.ts`, `brandKit.ts`), all built on the shared `callStructuredAgent` helper in `client.ts`.
- **Schemas** (`src/lib/schemas/`): zod schemas for the brief input and every agent's output — the single source of truth for both validation and the `responseJsonSchema` sent to Gemini.
- **Checks** (`src/lib/checks/`): pure, deterministic logic with zero LLM calls — `contrast.ts` for WCAG math, `tally.ts` for jury vote-counting.
- **Orchestration** (`src/lib/trial/orchestrator.ts`): an async generator that runs the four-agent trial in sequence, computes the jury tally, filters the Judge's revisions against it, and yields an event after each phase so the API route can stream it. If the tally dismisses every charge, the Judge is skipped entirely rather than being asked to satisfy "at least one revision" against its own instruction not to revise a dismissed charge.
- **Eval** (`eval/`): 5 fixture brand briefs (`brands.json`) run end-to-end through the real agent pipeline by `npm run eval`, producing `eval/results.json` and `eval/results.md` — a results table covering charge counts, contrast failures found, rebuttal counts, jury verdicts, revision counts, and latency per brand.

### Eval results (5/5 brands, 0 schema-validation retries needed)

Revisions now reflect the post-tally filter — only sustained or hung charges, never a charge the jury dismissed:

| Brand | Charges | Contrast failures | Rebuttals | Jury votes | Revisions (post-tally) | Duration (ms) |
|---|---|---|---|---|---|---|
| Loopline (meal-prep subscription) | 4 | 6 | 4 | mixed, mixed, guilty | 1 | 34646 |
| Northstone Capital (fintech for freelancers) | 4 | 4 | 4 | guilty, mixed, guilty | 3 | 32760 |
| Verdant (indoor plant care app) | 4 | 3 | 4 | not_guilty, guilty, mixed | 2 | 23826 |
| Hearthline (senior check-in calls) | 4 | 3 | 4 | mixed, guilty, guilty | 2 | 27710 |
| Pigeon (anonymous campus feedback) | 4 | 4 | 4 | mixed, guilty, guilty | 3 | 23435 |

Full per-field output is in `eval/results.json`.

```
src/
  app/              UI (brief form, trial view, revision gate, brand kit view)
  app/api/          trial (SSE), revise (single revision retry), brand-kit (compile)
  lib/agents/       one file per role + shared structured-call client
  lib/schemas/      zod schemas (brief input, trial events, brand kit)
  lib/checks/       deterministic WCAG contrast + jury tally engines
  lib/trial/        orchestrator (async generator)
  lib/export/       pure Markdown formatters (brand kit + full trial transcript)
  lib/format/       shared display helpers (roman numerals)
eval/               fixture brands + eval runner + results
```

## Setup

```bash
npm install
cp .env.example .env.local   # add your GEMINI_API_KEY (console: aistudio.google.com/apikey)
npm run dev
```

Run the eval set (requires `GEMINI_API_KEY`, makes real API calls against the 5 fixture brands):

```bash
npm run eval
```

## Deploy (Vercel)

1. Push this repo to GitHub, then import it at [vercel.com/new](https://vercel.com/new) — Next.js is auto-detected, no build config needed.
2. In the project's Vercel settings, add an environment variable `GEMINI_API_KEY` with your key. `.env.local` is gitignored on purpose and never reaches Vercel on its own.
3. Deploy. The three API routes (`/api/trial`, `/api/revise`, `/api/brand-kit`) are forced to `runtime = "nodejs"`.

**Function timeout note:** a full trial runs 4 sequential Gemini calls and took 25-40s against the live API in local eval runs. `/api/trial` sets `export const maxDuration = 60` — the maximum Vercel's free Hobby tier allows — to cover that. If a trial still times out in production (slower cold starts, a larger brief), the real fix is either a paid plan with a higher `maxDuration` ceiling, or restructuring `/api/trial` to persist partial progress so a timeout doesn't lose completed phases — not raising the number further, since Hobby is already capped at 60.

## Responsible design

- **Human gate on every revision** — nothing reaches the final brand kit without an explicit accept or lock.
- **Visible reasoning** — every charge, rebuttal, vote, and verdict is shown in full, not summarized or hidden behind a "thinking" spinner.
- **No data stored** — no database; a closed browser tab loses the trial, by design.
- **AI disclosure** — this project uses the Gemini API (Google, `gemini-3.8-flash`) for all four trial agents and the brand-kit compiler. Claude Code (Anthropic) was used as a coding assistant during development (scaffolding, agent prompts, schemas, orchestration, validation/retry logic, contrast engine, eval set) — it does not run in the deployed app.

## Team

- **Noaman** — agent prompts, schemas, orchestration, validation/retry logic, contrast checks, eval set, this README.
- **Ritika** — UI/trial view polish, deploy, interviews, demo video, repo hygiene, submission upload.

## Cut list (if behind schedule)

In order: URL ingestion → PDF export (keep Markdown) → jury personas down to 2 → retry on reject.
