# Pingback — Chat App Take-Home

A real-time direct + group chat app (Part 1) and its landing page (Part 2),
built against the given [Chat API](https://frontend-task-chatapp.onrender.com/docs/).

- **Live app:** https://sfd-anas-task.vercel.app/login
- **Landing page:** https://sfd-anas-task.vercel.app/
- **API documentation:** [`docs/API.md`](docs/API.md)
- **API issues found (detailed, with evidence):** [`API_ISSUES.md`](API_ISSUES.md)
- **Repo:** https://github.com/Ariyan-Rahman-Anas/SFD-chat-app

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
    utils.ts                Formatting/class-name helpers
docs/
  API.md                  Part 1 API documentation deliverable
API_ISSUES.md              Detailed API issues log, with reproduction evidence
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
  message id (a message you just loaded via the initial history fetch
  could otherwise also arrive as a live socket event a moment later, and
  get appended twice). Notably, the API's socket does **not** echo a
  message back to the sender who sent it — only to other participants —
  so the sender's own message list and the conversation-list preview are
  updated directly from the REST response, not by waiting for an event
  that will never arrive for that message (see issue 2 in
  `API_ISSUES.md`).
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

**Responsive layout:** below the `md` breakpoint, the chat screen shows
either the conversation list or the open conversation — never both side
by side, since there isn't room for either to be usable — with a back
button in the chat panel's header to return to the list. From `md` up,
both columns show at once, as a fixed-width sidebar next to a flexible
chat panel.

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
  Code installed Playwright and drove real multi-user browser sessions —
  two and three simulated users, direct messages, group creation, scroll
  behavior — against both the local dev server and, again, the final
  Vercel deployment before calling it done. That's specifically what
  caught the `message:new` socket payload mismatch (issue 1 in
  `API_ISSUES.md`): the code looked correct on inspection, but two
  browser sessions talking to each other over a real socket connection
  showed one side never receiving the other's messages. It also showed
  that an apparent "the new group doesn't show up" failure was really the
  shared demo backend responding slowly under concurrent load, not a bug
  — which led to a small UX fix (see below) rather than a wasted chase
  for a nonexistent race condition.
- **What I changed/pushed back on:** two issues were caught by review
  rather than by running anything — I don't take generated code as
  correct just because it compiles. One was a stale-closure bug in the
  "start a new conversation → select it" flow: it read the just-created
  conversation back out of React state that the surrounding function's
  closure had captured *before* the refetch that would have updated it,
  so the lookup could never succeed. The other was a `setState` updater
  function with an async side effect (a conversation refetch) triggered
  from inside it — harmless in practice here, but a real anti-pattern,
  since React can invoke a state updater more than once. Both were
  flagged and restructured before I considered the hook code done.
- **A finding that turned out not to be a bug:** during testing, creating
  a group appeared to hang — the new group wouldn't show up in the
  sidebar for several seconds. Rather than accept that as "flaky" or
  chase a race condition that didn't exist, the actual `GET /conversations`
  network response was timed directly, which showed the shared demo
  backend genuinely taking several seconds to respond under concurrent
  multi-session load (see issue 10 in `API_ISSUES.md`). The real fix was
  a small UX change: the "new group" dialog now stays open (with its
  spinner) until the sidebar refresh actually resolves, instead of
  closing immediately and leaving the sidebar looking stale in the
  meantime.

### Issues I ran into with the given API

Yes — several. The full list, each with the exact `curl` command and
response that reproduces it, why it matters, and what the app does about
it, is in **[`API_ISSUES.md`](API_ISSUES.md)**. In short:

1. The `message:new` socket event doesn't match the REST `Message` shape
   (`id` vs `_id`, epoch-ms number vs ISO string for `createdAt`) — fixed
   with one normalizer so the rest of the app only ever sees one shape.
2. **The sender never receives their own `message:new` event** — only
   other participants do. Missed on first pass because a single sender's
   own message list still looked right (it's populated from the REST
   response, not the socket); what silently broke was the *sidebar*
   preview, which only updated for messages from other people. Fixed by
   updating the sidebar directly from the REST response too, not just
   from socket events.
3. The backend doesn't reject empty/whitespace messages — enforced
   client-side instead, since the requirement is real even if the API
   doesn't help with it.
4. Sending to a non-existent `conversationId` returns `200` with a `null`
   body instead of a `404`; an invalid `userId` on `POST /conversations`
   returns a raw `500` (a leaked Mongoose error) instead of a clean `400`.
5. `GET /users/search` matches by prefix only, not substring — softened
   client-side with an additional filter over the API's results.
6. `POST /conversations` (direct) returns unpopulated participant ids,
   unlike `GET /conversations` — the app re-fetches the list to get a
   displayable name immediately after creating one.
7. `GET /health` is served at the host root, not under `/api`, despite
   being listed alongside the `/api`-scoped endpoints in the spec.
8. This is a shared demo backend: the example phone number from the
   Swagger spec already had a large history from other candidates, and
   `GET /conversations` visibly slows down under concurrent multi-session
   load — not a client bug if a reviewer sees a moment's delay after
   creating a group (the UI does wait for that refresh to actually
   resolve before closing its dialog, rather than assuming success).

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
