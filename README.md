# React Quiz Maker

A React + TypeScript quiz maker built with Vite and TanStack Query. The app supports quiz creation, quiz taking, result summaries, and lightweight anti-cheat tracking.

## Stack

- React 19
- TypeScript
- Vite
- TanStack Query v5
- React Hook Form + Zod
- Tailwind CSS + shadcn/ui
- Day.js for UTC-based internal date handling

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```bash
VITE_API_URL=http://localhost:3000
VITE_API_TOKEN=dev-token
```

3. Start the frontend:

```bash
npm run dev
```

4. Open the local Vite URL in your browser.

The frontend expects the provided Node.js + SQLite backend to be running separately.

## Main Flows

### Quiz Builder

- Create a new quiz or open an existing quiz by ID
- Edit quiz title, description, publish state, and time limit
- Add and edit `mcq` and `short` questions
- Add an optional code snippet for each question
- Set question position in the quiz

### Quiz Player

- Enter a quiz ID from the home page
- Start an attempt and load the quiz
- Navigate between questions
- Save answers per question
- Submit manually or automatically on timeout
- View result summary in a modal

## Architecture Notes

- Routing is handled with `react-router`
- Server communication uses TanStack Query queries and mutations
- The app is split into focused pages:
  - home
  - builder entry
  - quiz builder
  - quiz player
- Question prompt text and optional code snippet are stored together in the backend `prompt` field using tagged content so the existing backend contract stays intact
- Internal date and time calculations use Day.js in UTC; user-facing time display can be converted to local time when needed

## Trade-offs

- `Vite + React SPA` was chosen to keep the setup fast, simple, and close to the take-home scope. A Next.js-style setup would add routing and framework conventions that are not necessary for a local API-backed quiz tool, while Vite keeps iteration speed high and production output straightforward.
- `TanStack Query v5` is the main server-state layer because the app is centered around fetch/mutate flows: loading quizzes, creating attempts, saving answers, and submitting results. This keeps request status, caching, and mutation handling consistent across builder and player screens without building custom request state by hand.
- `React Hook Form + Zod` was chosen for forms because the builder has several structured inputs and validation rules. RHF keeps the forms performant and ergonomic, while Zod keeps validation rules explicit and colocated. The trade-off is a bit more setup compared with plain component state, but it scales better once the forms grow.
- `Tailwind CSS + shadcn/ui` was selected to move quickly on a polished UI without locking the app into a heavy component framework. Tailwind gives direct control over layout and visual tuning, and shadcn primitives provide accessible building blocks. The trade-off is that styling remains code-driven rather than coming from a more opinionated design system.
- `Day.js` is used for timestamp parsing and timer calculations so the app can consistently compute in UTC internally and convert to local time only when displaying values. This avoids scattered native `Date` logic and makes deadline handling easier to reason about.
- The anti-cheat feature stays intentionally lightweight and frontend-driven to match the take-home brief. It records compact event data and summary totals rather than trying to be a full proctoring or forensic system.
- The player and builder UIs are intentionally compact and task-focused. That keeps the app easier to scan and closer to the assignment, at the cost of fewer explanatory affordances and less onboarding copy in the interface.

## Anti-Cheat

The player currently tracks these events:

- `window-blur`
- `short-answer-paste`

For each event, the frontend keeps a local `eventList` entry with:

- event name
- UTC ISO timestamp

The result modal displays compact whole-quiz totals for:

- paste events
- tab/window blur events

## Auth / API Notes

- Requests include `Authorization: Bearer <token>`
- The token is sourced from `VITE_API_TOKEN`
- The API base URL is sourced from `VITE_API_URL`
- The frontend aims to stay aligned with the provided backend contract and avoids major endpoint/schema changes
