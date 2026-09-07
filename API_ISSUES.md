# API Issues — What I Found and How I Handled It

This file lists every inconsistency, bug, or undocumented behavior found in
the given Chat API (`https://frontend-task-chatapp.onrender.com`) while
building this project. Each entry has: what was observed, how it was
reproduced, why it matters, and what the app does about it. Everything
here was found by exercising the **live** API directly (`curl` / a raw
Socket.io client) — the OpenAPI spec at `/docs/` only documents request
shapes and explicitly leaves responses/status codes undefined, so all of
this had to be discovered rather than read.

A shorter version of this list also lives in the README's Part 3 write-up;
this file is the detailed, evidence-backed version.

---

## 1. `message:new` socket payload doesn't match the REST `Message` shape

**Severity:** High — silently produces broken data if unhandled, no error thrown.

The REST API's message shape (from `POST /messages` and
`GET /conversations/:id/messages`) is:
```json
{ "_id": "6a9eb888db386e2dcaba4772", "conversation": "...", "sender": "...", "text": "Hello!", "createdAt": "2026-09-07T13:13:44.604Z" }
```

The `message:new` **Socket.io event**, for the exact same message, is:
```json
{ "id": "6a9eb888db386e2dcaba4772", "conversation": "...", "sender": "...", "text": "Hello!", "createdAt": 1788786275370 }
```

Two differences: the id field is `id` instead of `_id`, and `createdAt` is
an **epoch-millisecond number**, not an ISO 8601 string.

**How this was found:** a message sent over REST while a second, already
-connected client listened for `message:new` on a raw `socket.io-client`
script (no UI involved) — logging the raw payload showed the shape above.
Nothing throws when you treat the socket payload as a `Message` — you just
end up with `message._id === undefined`, which breaks React list keys and
dedup-by-id logic silently.

**Fix in this app:** one normalizer function,
[`src/lib/socket.ts`](src/lib/socket.ts) → `normalizeSocketMessage()`,
converts every incoming socket payload into the same shape the REST API
uses, before it touches any hook or component. Nothing downstream of that
function ever sees the socket's native shape.

---

## 2. The backend does not reject empty or whitespace-only messages

**Severity:** Medium — contradicts the assignment's explicit requirement, silently.

```bash
curl -X POST .../api/messages -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"6a9eb883db386e2dcaba4766","text":""}'
# → HTTP 201
# {"_id":"6a9eb886db386e2dcaba476d","conversation":"...","sender":"...","text":"","createdAt":"..."}
```

An empty string (and, by the same code path, a whitespace-only string)
is accepted, stored, and returned like any other message. The assignment
explicitly requires "empty messages should not be sendable" — the API
gives no help enforcing that.

**Fix in this app:**
- [`MessageComposer.tsx`](src/components/chat/MessageComposer.tsx) trims
  the input and disables the Send button (and blocks the Enter-to-send
  handler) whenever the trimmed text is empty. This is enforced entirely
  client-side, because the server won't do it.
- In case an empty message already exists in a conversation's history
  (e.g. from earlier API testing by other candidates on this shared
  backend — see issue 9), [`MessageBubble.tsx`](src/components/chat/MessageBubble.tsx)
  renders it as an italicized `(empty message)` placeholder instead of an
  awkward blank bubble, rather than assuming it can never happen.

---

## 3. Sending a message to a non-existent conversation silently no-ops

**Severity:** Medium — should be a 404, not a fake success.

```bash
curl -X POST .../api/messages -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"000000000000000000000000","text":"hi"}'
# → HTTP 200
# null
```

A syntactically valid but non-existent `conversationId` returns `200` with
a body of literal `null` — not a `404`, not an error object, and no
message is actually created (confirmed by checking that conversation's
history afterward). A client that doesn't check for a `null` response body
would think the send succeeded.

**Fix in this app:** not directly reachable from the UI (conversation ids
always come from the API's own `GET /conversations` or a just-created
conversation's response, never typed by a user), so there's no code path
that could trigger this from normal use. Documented here rather than
handled with speculative error UI for a response shape the app can't
actually produce through its own flows.

---

## 4. An invalid `userId` on `POST /conversations` returns a raw `500`, not `400`

**Severity:** Medium — leaks an internal error message; wrong status code.

```bash
curl -X POST .../api/conversations -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"userId":"not-a-real-id"}'
# → HTTP 500
# {"error":{"message":"Cast to ObjectId failed for value \"not-a-real-id\" (type string) at path \"_id\" for model \"User\"","code":"SERVER_ERROR"}}
```

Every other validation failure in this API returns a clean `400` with
`code: "VALIDATION_ERROR"` and a `details` array (see the group-size check
in issue 6 below for a contrast). This one path — an id that fails to
parse as a Mongo ObjectId — instead falls through to an unhandled
exception, gets a `500`, and leaks a raw Mongoose driver error message to
the client.

**Fix in this app:** not reachable from the UI either — the only `userId`
values ever sent come from `GET /users/search` results, which are always
valid ids. Documented for completeness and because it's a real bug worth
knowing about if this API is reused elsewhere.

---

## 5. `GET /users/search` matches by prefix only, not substring

**Severity:** Low-medium — surprising, but easy to route around.

```bash
curl ".../api/users/search?q=Test" -H "Authorization: Bearer $TOKEN"
# → includes {"name":"Test User B", ...}

curl ".../api/users/search?q=User%20B" -H "Authorization: Bearer $TOKEN"
# → does NOT include "Test User B", even though it obviously contains "User B"
```

Searching `"Test"` finds `"Test User B"` (prefix match), but searching
`"User B"` does not — the API is anchoring the match at the start of the
name/phone rather than doing a substring search. A user typing a partial
name from the middle would get "no results" for a person who's clearly in
the list.

**Fix in this app:** [`NewChatDialog.tsx`](src/components/chat/NewChatDialog.tsx)
applies an additional client-side `.includes()` filter on top of whatever
the API returns, so a query like `"User B"` still surfaces `"Test User
B"` even though the API's own prefix match wouldn't have found it.

---

## 6. `GET /health` is served at the host root, not under `/api`

**Severity:** Low — purely a documentation/consistency nit.

The spec lists `/health` under the same `paths` object as every other
`/api`-scoped endpoint (and Swagger UI, using the shared `{baseUrl}/api`
server variable, calls it at `/api/health`) — but:

```bash
curl .../api/health   # → 404 {"error":{"message":"Route not found","code":"NOT_FOUND"}}
curl .../health       # → 200 {"status":"ok"}
```

Not used by this app (there's no health-check UI), but worth flagging
since it contradicts the spec's own `servers` block.

---

## 7. Missing auth token returns `400`, not `401`

**Severity:** Low — non-standard, but consistently applied.

```bash
curl .../api/auth/me
# → HTTP 400
# {"error":{"message":"No token provided","code":"NO_TOKEN"}}
```

Conventionally a missing/invalid credential is a `401 Unauthorized`. This
API returns `400` for it instead (with a distinguishing `code`, at least).
This app's [`AuthContext.tsx`](src/context/AuthContext.tsx) doesn't branch
on status code for this case — it treats *any* failure of `GET /auth/me`
as "the stored session is no longer valid" and logs out silently, so the
non-standard status code didn't need special-casing.

---

## 8. `POST /conversations` doesn't populate participants (unlike `GET /conversations`)

**Severity:** Low — inconsistent, but easy to work around.

```bash
curl -X POST .../api/conversations -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"userId":"<id>"}'
# → {"_id":"...","participants":["<my id>","<their id>"],"createdAt":"..."}
```

Compare this to a conversation row from `GET /conversations`, where the
`participant` field is a full `{ _id, name, phone }` object. Starting a
new conversation gives you back raw id strings with no name/phone to
display immediately.

**Fix in this app:** after starting a conversation, the app re-fetches the
conversation list (`GET /conversations`) and looks up the newly created
conversation by id from that populated response, rather than trying to
render the bare id strings the creation endpoint returns.

---

## 9. This is a shared demo backend — expect pre-existing data and variable latency

**Severity:** Informational.

- The `LoginRequest` example phone number in the Swagger spec itself
  (`+15551234567`) already had a large conversation/message history by
  the time it was used here — almost certainly from other candidates
  copy-pasting the same example while testing. Using a generated, unique
  phone number per test session avoided this.
- `GET /users/search` has no result cap or pagination — a broad query
  like `"Test"` returned 50+ rows on this shared instance.
- `GET /conversations` response times were well under a second in normal
  use, but noticeably slower (multiple seconds) under concurrent
  multi-session load during testing — consistent with a free-tier hosted
  instance rather than a client-side problem. The app's group-creation
  flow explicitly waits for the post-creation refresh to complete (rather
  than closing its dialog optimistically) so a slow response shows a
  spinner instead of looking broken.

---

## 10. Socket delivery is live-only — there's no offline queue or replay

**Severity:** Informational / architectural note.

Confirmed directly: if a user's socket isn't connected at the moment a
`message:new` event would be emitted, they simply never receive that
specific event — reconnecting later does not replay it. (Room membership
*is* dynamic, though — a socket connected before a conversation exists
still receives events for it once created, confirmed with a minimal
`socket.io-client` script.)

This isn't something the app can "fix" — it's inherent to the API as
given. It's why the app never treats the socket as its source of truth:
`GET /conversations/:id/messages` (REST) is what's loaded whenever a
conversation is opened, and the socket is purely a live-update layer on
top of that. A missed event just means the next full load (opening the
conversation, or a page refresh) catches up correctly.
