# API Issues — What I Found and How I Handled It

This file lists every inconsistency, bug, or undocumented behavior found in
the given Chat API (`https://frontend-task-chatapp.onrender.com`) while
building this project. Each entry follows the same structure:

- **Problem** — what's actually wrong, in one line.
- **Why it's an issue** — the concrete, practical consequence if a client
  doesn't account for it.
- **Evidence** — the exact command/script that reproduces it, and the
  real response.
- **Fix in this app** — what was actually done about it, and why.

Everything here was found by exercising the **live** API directly
(`curl` / a raw Socket.io client) — the OpenAPI spec at `/docs/` only
documents request shapes and explicitly leaves responses/status codes
undefined, so all of this had to be discovered rather than read. A
shorter summary of this list also lives in the README's Part 3 write-up;
this file is the detailed, evidence-backed version.

---

## 1. `message:new` socket payload doesn't match the REST `Message` shape

**Severity:** High.

**Problem:** the id field and the timestamp field are named/typed
differently between the two APIs for the exact same message.

**Why it's an issue:** any code that treats a socket message the same way
as a REST message silently breaks — not with an error, but with a
message object that has `_id === undefined`. That breaks React list keys,
breaks dedup-by-id logic, and breaks anything that calls `new
Date(message.createdAt)` expecting a string. Nothing throws, so this kind
of bug ships to production undetected unless someone specifically
compares the two payloads.

**Evidence:** the REST shape (`POST /messages` response):
```json
{ "_id": "6a9eb888db386e2dcaba4772", "conversation": "...", "sender": "...", "text": "Hello!", "createdAt": "2026-09-07T13:13:44.604Z" }
```
The `message:new` socket event, for the exact same message:
```json
{ "id": "6a9eb888db386e2dcaba4772", "conversation": "...", "sender": "...", "text": "Hello!", "createdAt": 1788786275370 }
```
`id` instead of `_id`; `createdAt` as an **epoch-millisecond number**
instead of an ISO 8601 string. Found by running a raw
`socket.io-client` script (no UI) that logged the exact payload received.

**Fix in this app:** one normalizer function,
[`src/lib/socket.ts`](src/lib/socket.ts) → `normalizeSocketMessage()`,
converts every incoming socket payload into the REST shape before it
touches any hook or component. Nothing downstream of that function ever
sees the socket's native shape.

---

## 2. The message-sender never receives their own `message:new` event

**Severity:** High — easy to miss because the sender's own UI looks fine.

**Problem:** when user A sends a message, the socket broadcasts
`message:new` to every *other* participant's socket — but not back to
user A's own socket connection.

**Why it's an issue:** any part of the UI that relies purely on
`message:new` to know "something changed in this conversation" will
never update for the sender's own outgoing messages — only for messages
from other people. Concretely in this app: the conversation list's "last
message" preview and sort order were originally only updated by the
`message:new` listener, so after sending a message, the sender's own
sidebar kept showing the *previous* message and old ordering until
something else (like the other participant replying) caused a refetch.
It's an easy bug to miss in testing because a single developer testing
alone, sending messages to themselves in two tabs, would actually catch
it — but testing with only one active sender per session would not.

**Evidence:** a two-socket script — one socket sends a REST message, that
same socket's own `message:new` listener never fires, while a second,
independent socket (the recipient) receives it immediately:
```js
aSocket.on("message:new", () => console.log("self received it"));
await fetch(".../api/messages", { method: "POST", ... }); // sent by A
// → nothing logged on aSocket; bSocket (recipient) logs it immediately
```

**Fix in this app:** [`ChatPanel.tsx`](src/components/chat/ChatPanel.tsx)'s
`handleSend` explicitly calls the same conversation-list-updater function
used for incoming socket messages right after a successful send, instead
of waiting for a socket event that will never arrive for that message. See
`useConversations.ts`'s exported `upsertFromMessage`.

---

## 3. The backend does not reject empty or whitespace-only messages

**Severity:** Medium — contradicts the assignment's explicit requirement, silently.

**Problem:** `POST /messages` accepts and stores `text: ""` (and, by the
same code path, whitespace-only text) without any validation error.

**Why it's an issue:** the assignment explicitly requires "empty messages
should not be sendable." A client that assumes the API enforces this (a
reasonable assumption for a REST API with a `LoginRequest`-style
validation layer already in place elsewhere) would ship a chat where
users can send visually-blank bubbles.

**Evidence:**
```bash
curl -X POST .../api/messages -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"6a9eb883db386e2dcaba4766","text":""}'
# → HTTP 201
# {"_id":"6a9eb886db386e2dcaba476d","conversation":"...","sender":"...","text":"","createdAt":"..."}
```

**Fix in this app:**
- [`MessageComposer.tsx`](src/components/chat/MessageComposer.tsx) trims
  the input and disables the Send button (and blocks Enter-to-send)
  whenever the trimmed text is empty — enforced entirely client-side,
  because the server won't do it.
- In case an empty message already exists in a conversation's history
  (this is a shared demo backend — see issue 9 — so earlier test data from
  other candidates may include one), [`MessageBubble.tsx`](src/components/chat/MessageBubble.tsx)
  renders it as an italicized `(empty message)` placeholder rather than an
  awkward blank bubble, instead of assuming it can never happen.

---

## 4. Sending a message to a non-existent conversation silently no-ops

**Severity:** Medium — should be a 404, not a fake success.

**Problem:** a syntactically valid but non-existent `conversationId`
returns `200` with a body of literal `null`.

**Why it's an issue:** a client that checks `response.ok` (or just the
status code) without checking the body would believe the send succeeded.
No message is actually created — confirmed by checking that
conversation's history afterward — so the user would see nothing appear
and have no idea why.

**Evidence:**
```bash
curl -X POST .../api/messages -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"000000000000000000000000","text":"hi"}'
# → HTTP 200
# null
```

**Fix in this app:** not directly reachable from the UI — conversation
ids always come from the API's own `GET /conversations` or a just-created
conversation's response, never typed by a user — so there's no code path
that could trigger this from normal use. Documented here rather than
handled with speculative error UI for a response shape the app can't
actually produce through its own flows.

---

## 5. An invalid `userId` on `POST /conversations` returns a raw `500`, not `400`

**Severity:** Medium — leaks an internal error message; wrong status code.

**Problem:** an id that fails to parse as a MongoDB ObjectId isn't caught
by a validation layer — it falls through to an unhandled exception.

**Why it's an issue:** every other validation failure in this API returns
a clean `400` with `code: "VALIDATION_ERROR"` and a `details` array (see
issue 6 for a contrast) — so a client can reasonably build one generic
"show validation error" handler for `400`s. This one path breaks that
assumption with a `500` and leaks a raw database-driver error message
(useful to an attacker probing for stack details, irrelevant/confusing to
a legitimate client).

**Evidence:**
```bash
curl -X POST .../api/conversations -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"userId":"not-a-real-id"}'
# → HTTP 500
# {"error":{"message":"Cast to ObjectId failed for value \"not-a-real-id\" (type string) at path \"_id\" for model \"User\"","code":"SERVER_ERROR"}}
```

**Fix in this app:** not reachable from the UI either — the only
`userId` values ever sent come from `GET /users/search` results, which
are always valid ids. Documented for completeness and because it's a
real bug worth knowing about if this API is reused elsewhere.

---

## 6. `GET /users/search` matches by prefix only, not substring

**Severity:** Low-medium — surprising, but easy to route around.

**Problem:** the search anchors matches at the start of the name/phone
rather than doing a substring search.

**Why it's an issue:** a user typing a partial name from the middle of
someone's name gets "no results" for a person who's clearly in the
system, which reads as a broken search feature rather than a strict-match
one — most people's mental model of "search" is substring/fuzzy, not
prefix-only.

**Evidence:**
```bash
curl ".../api/users/search?q=Test" -H "Authorization: Bearer $TOKEN"
# → includes {"name":"Test User B", ...}

curl ".../api/users/search?q=User%20B" -H "Authorization: Bearer $TOKEN"
# → does NOT include "Test User B", despite it obviously containing "User B"
```

**Fix in this app:** [`NewChatDialog.tsx`](src/components/chat/NewChatDialog.tsx)
applies an additional client-side `.includes()` filter on top of whatever
the API returns, so a query like `"User B"` still surfaces `"Test User
B"` even though the API's own prefix match wouldn't have found it.

---

## 7. `POST /conversations` (direct) doesn't populate participants

**Severity:** Low — inconsistent, but easy to work around.

**Problem:** starting a direct conversation returns raw participant id
strings; listing conversations returns a fully populated `{ _id, name,
phone }` object for the same field.

**Why it's an issue:** a client that naively renders the response of
"start conversation" (e.g. to immediately show the new chat's header)
would have no name or phone number to display — just an opaque id string
— until it does a separate fetch.

**Evidence:**
```bash
curl -X POST .../api/conversations -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"userId":"<id>"}'
# → {"_id":"...","participants":["<my id>","<their id>"],"createdAt":"..."}
```
compared to a `GET /conversations` row's `participant` field, which is a
full object.

**Fix in this app:** after starting a conversation, the app re-fetches
the conversation list (`GET /conversations`) and looks up the newly
created conversation by id from that populated response, rather than
trying to render the bare id strings the creation endpoint returns.

---

## 8. `GET /health` is served at the host root, not under `/api`

**Severity:** Low — a documentation/consistency nit.

**Problem:** the spec lists `/health` under the same `paths` object as
every other `/api`-scoped endpoint (and Swagger UI, using the shared
`{baseUrl}/api` server variable, calls it at `/api/health`) — but it
isn't actually there.

**Why it's an issue:** purely a spec-accuracy issue; a client that trusts
the spec's own `servers` block for this one endpoint gets a `404`.

**Evidence:**
```bash
curl .../api/health   # → 404 {"error":{"message":"Route not found","code":"NOT_FOUND"}}
curl .../health       # → 200 {"status":"ok"}
```

**Fix in this app:** not used — there's no health-check UI in this
project — flagged for completeness only.

---

## 9. Missing auth token returns `400`, not `401`

**Severity:** Low — non-standard, but consistently applied.

**Problem:** a request with no `Authorization` header returns `400`
instead of the conventional `401 Unauthorized`.

**Why it's an issue:** a client that branches its error handling on
status code (e.g. "on 401, force logout; on 400, show a form validation
message") would misroute this case into validation-error handling
instead of an auth-error handling. It's at least consistently applied
with a distinguishing `code`, which limits the damage.

**Evidence:**
```bash
curl .../api/auth/me
# → HTTP 400
# {"error":{"message":"No token provided","code":"NO_TOKEN"}}
```

**Fix in this app:** [`AuthContext.tsx`](src/context/AuthContext.tsx)
doesn't branch on status code for this case at all — it treats *any*
failure of `GET /auth/me` (400, 401, network error, anything) as "the
stored session is no longer valid" and logs out silently, so the
non-standard status code didn't need special-casing.

---

## 10. This is a shared demo backend — expect pre-existing data and variable latency

**Severity:** Informational, but genuinely affected testing.

**Problem:** the API instance is shared across everyone doing this
assignment, is hosted on what appears to be a free/low-resource tier, and
has no rate limiting or data isolation between candidates.

**Why it's an issue:** results and performance you observe while testing
are not fully reproducible or attributable to your own client — a slow
response might be someone else's load, and a search result might include
another candidate's test data.

**Evidence:**
- The `LoginRequest` example phone number in the Swagger spec itself
  (`+15551234567`) already had a large conversation/message history by
  the time it was used here — almost certainly from other candidates
  copy-pasting the same example. Using a generated, unique phone number
  per test session avoided this.
- `GET /users/search` has no result cap or pagination — a broad query
  like `"Test"` returned 50+ rows on this shared instance.
- `GET /conversations` response times were well under a second in normal
  use, but multiple seconds under concurrent multi-session load observed
  during automated testing (several simulated users acting at once) —
  consistent with shared/limited hosting rather than a client-side
  problem.

**Fix in this app:** the group-creation flow explicitly waits for the
post-creation sidebar refresh to actually resolve (rather than closing
its dialog optimistically and assuming success), so a slow response shows
a spinner instead of looking broken or silently failing.

---

## 11. Socket delivery is live-only — there's no offline queue or replay

**Severity:** Informational / architectural note.

**Problem:** if a user's socket isn't connected at the moment a
`message:new` event would be emitted, they simply never receive that
specific event. Reconnecting later does not replay missed events.

**Why it's an issue:** an architecture that treats the socket as the
*only* source of message data would silently lose messages for any user
who was offline, mid-reconnect, or just hadn't loaded the app yet when a
message arrived.

**Evidence:** confirmed directly with a raw `socket.io-client` script: a
socket connected, then disconnected, then a message was sent to that
conversation, then the socket reconnected — the message from while it was
disconnected never arrived as an event (only visible by then re-fetching
history over REST). Room membership *is* dynamic, though — a socket
connected *before* a conversation exists still receives events for it
once created.

**Fix in this app:** the socket is never treated as authoritative.
`GET /conversations/:id/messages` (REST) is loaded fresh every time a
conversation is opened; the socket is purely a live-update layer on top
of that. A missed event just means the next full load (opening the
conversation, or a page refresh) catches up correctly — no data is ever
actually lost, only its live delivery.
