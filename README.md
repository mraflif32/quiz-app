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

- The anti-cheat feature is intentionally lightweight and frontend-driven to keep the scope close to the take-home brief
- The result modal shows compact anti-cheat totals for the whole quiz instead of a detailed audit view
- Timeout submission failures auto-retry every 5 seconds, but manual submit failures stay interactive so users can retry themselves while time remains
- The builder/player UI was kept compact and practical rather than adding extra product features beyond the brief

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
