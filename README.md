# Pingback — Chat App Take-Home

A real-time direct + group chat app (Part 1) and its landing page (Part 2),
built against the given [Chat API](https://frontend-task-chatapp.onrender.com/docs/).

- **Live app:** _add Vercel URL after deploy_ → `/login`
- **Landing page:** _add Vercel URL after deploy_ → `/`
- **API documentation:** [`docs/API.md`](docs/API.md)
- **Repo:** https://github.com/Ariyan-Rahman-Anas/chat-app-frontend-task

## Tech stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4** for styling
- **Socket.io client** for real-time delivery
- **lucide-react** for icons
- No state-management library — plain React state/context plus a couple of
  small custom hooks (`useConversations`, `useMessages`) was enough for this
  scope and kept the dependency list short.

## Running locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The app talks to the live hosted API by
default; to point it at a different instance, set:

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://your-api-host
```

`npm run build && npm run start` builds and serves the production build.

## Project structure

```
src/
  app/
    page.tsx            Landing page (Part 2)
    login/page.tsx       Login / auto-register
    chat/page.tsx         Main chat screen (Part 1)
  components/
    chat/                 Sidebar, message list, composer, new-chat/group dialog
    landing/              Landing page pieces
    ui/                   Small shared primitives (Avatar, Spinner)
  hooks/
    useConversations.ts   Conversation list state + live updates
    useMessages.ts        Message history, pagination, live updates
    useUnreadTracker.ts    Client-side unread tracking (see below)
  context/
    AuthContext.tsx        Session/token, persisted to localStorage
    SocketContext.tsx      Socket.io connection lifecycle
  lib/
    api.ts                Typed REST client
    socket.ts              Socket connection + payload normalization
    types.ts                Shared types
docs/
  API.md                  Part 1 API documentation deliverable
```

---

## Part 3 — Thought process

### Part 1: architecture & trade-offs

I used the App Router with everything under `/chat` as a single client
component tree rather than reaching for a data-fetching library (React
Query, SWR). The data model here is small (a conversation list and one
open conversation's messages) and the real complexity is in **live
updates and scroll behavior**, not caching — a library built around
request de-duplication and stale-time wasn't pulling its weight, so two
focused hooks (`useConversations`, `useMessages`) that own their state
directly were simpler to reason about and to keep in sync with Socket.io
events.

Auth is a JWT kept in `localStorage` plus a module-level token set on the
API client; `AuthContext` restores the session on load by re-validating
against `GET /auth/me` rather than trusting a stored user blindly. The
socket connection lives in its own context, keyed off the auth token, so
it connects/disconnects automatically as the user logs in/out.

The trade-off I made deliberately: **no group admin management UI**
(promote/remove/rename), even though the API supports it. Group
*creation* is a required deliverable and got full attention; the
admin-management endpoints are documented in `docs/API.md` and were
verified working (permission checks included), but building a full
settings panel for them would have pulled focus away from the piece the
brief explicitly says matters most — the chat panel itself (message list,
sending, real-time). Given the 24-hour window, I chose depth on that over
breadth on group settings.

**Real-time + auto-scroll**, the part called out as the area to polish:
- New messages append via a `message:new` socket listener, deduplicated by
  message id (the same id could otherwise arrive twice — once from the
  REST response when *you* send a message, once from the socket echo).
- Auto-scroll pins to the bottom on new messages only while the user is
  already near the bottom; otherwise it holds position and shows a "new
  messages" pill instead of yanking them down mid-read. Scroll position is
  explicitly preserved (via a scroll-height delta) when older messages are
  prepended, so loading history doesn't jump the view.
- Unread state has no backend support at all (no read-receipt concept in
  the API), so it's tracked entirely client-side: each conversation's
  last-opened timestamp is kept in `localStorage`, compared against its
  latest message's timestamp to decide the sidebar dot. This was the most
  interesting small design call in the project — rather than skip "unread"
  because the API doesn't offer it, or wire something in the browser storage,
  I want it to be very clear this is a client-side approximation, and it's
  isolated to `useUnreadTracker.ts` and never presented as a synced feature.

### Part 2: landing page

The one instruction was "showcase what you built, be bold." Rather than a
screenshot or a static mockup of the chat UI, the hero renders a small,
self-contained, looping **animated chat preview** (`LiveDemoPreview.tsx`)
— typing indicators, message bubbles appearing on a timer, no backend
involved. It's meant to *demonstrate* real-time delivery rather than just
claim it in copy. Everything else (feature grid, second CTA) stays
restrained on purpose so that piece is the focal point; I avoided the
generic landing-page furniture the brief specifically calls out as not
counting toward the bonus (testimonials, FAQ accordions).

### How I used AI tools

I built this with **Claude Code** end-to-end, working interactively rather
than handing over the brief and taking the output as-is:

- **API exploration:** the given Swagger UI only renders client-side and
  doesn't expose response shapes (by design, per the spec's own
  description). Claude Code fetched the underlying spec JSON directly,
  then exercised the live API with a series of `curl` calls I reviewed —
  successful logins, deliberately invalid inputs, group edge cases — to
  work out actual response shapes and error behavior before any UI code
  was written. That exploration is what `docs/API.md` is built from.
- **Implementation:** the majority of the component/hook code was written
  by Claude Code from a plan I discussed and approved (tech choices,
  scope trade-offs like skipping group-admin UI) rather than dictated
  file-by-file.
- **Testing:** rather than trust the implementation on inspection, Claude
  Code installed Playwright and drove real multi-user browser sessions
  against the running dev server — two and three simulated users, direct
  messages, group creation, and checked whether events actually arrived
  live in another browser context. That testing is what caught the two
  real bugs below; I would not have caught the socket payload mismatch
  from reading the code.
- **What I changed/pushed back on:** I redirected it away from a stale
  closure bug in the "start new conversation → select it" flow (it
  originally tried to read the just-created conversation out of
  React state that hadn't updated yet), and away from a state-updater
  anti-pattern where an async refetch was triggered from inside a
  `setState` updater function (harmless here, but wrong — React can invoke
  updaters more than once). Both were caught and fixed before being
  treated as done.

### Issues I ran into with the given API

- **`message:new` socket payload doesn't match the REST `Message` shape.**
  It uses `id` instead of `_id`, and sends `createdAt` as an epoch-ms
  number instead of an ISO string. Missed on first pass because it doesn't
  throw — it just silently produces messages with `undefined` ids. Fixed
  with one normalizer (`lib/socket.ts#normalizeSocketMessage`) so the rest
  of the app only ever sees one `Message` shape. See `docs/API.md` for the
  full comparison.
- **The backend doesn't reject empty messages.** `POST /messages` with
  `text: ""` returns `201` and stores it. "Empty messages shouldn't be
  sendable" is enforced entirely client-side (composer disables Send on
  blank/whitespace text); the message list also renders any stray empty
  message gracefully (`(empty message)`, italicized) instead of an
  awkward blank bubble, in case one already exists in a conversation's
  history from earlier testing.
- **Posting to a non-existent `conversationId` returns `200` with a `null`
  body** instead of a `404`. And an invalid (malformed) `userId` on
  `POST /conversations` returns a raw `500` with a Mongoose cast-error
  message rather than a clean `400`. Neither is something the client can
  route around gracefully — I documented both in `docs/API.md` rather than
  writing speculative handling for error shapes I can't actually trigger
  cleanly.
- **`GET /users/search` is prefix-only**, not substring. Searching
  `"User B"` won't find `"Test User B"`. The new-chat search applies an
  additional client-side substring filter on top of the API's results as
  a graceful workaround, rather than surprising users with "no results"
  for a query that should obviously match.
- **`GET /health` is served at the host root**, not under `/api`, even
  though the spec lists it alongside the other `/api`-scoped endpoints.
- **This is a shared demo backend** — the `LoginRequest` example phone
  number in the Swagger spec (`+15551234567`) already had a large message
  history from other candidates' testing by the time I used it, and
  `GET /conversations` response times varied noticeably (well under a
  second normally, several seconds under concurrent multi-user load in my
  own Playwright tests). Worth knowing if a reviewer sees a moment's delay
  after creating a group — it's the shared backend, not a stuck client
  (the UI does wait for the refresh to actually complete before closing
  the dialog, rather than closing optimistically and hoping).

### What I'd improve with more time

- Group admin management UI (rename, add/remove members, promote) — the
  API's ready for it, the UI isn't.
- Message delivery/read receipts beyond the client-only unread dot.
- Retry affordance for a failed send (currently the composer restores your
  draft text on failure so nothing's lost, but there's no explicit "tap to
  retry").
- An automated test suite committed alongside the app — I used Playwright
  heavily *during* development to catch the real-time bugs above, but
  didn't keep it as a checked-in suite for this submission to keep the
  repo focused on the deliverable.
