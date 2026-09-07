# Chat API — Documentation

This documents the API used to build the chat feature. The API only ships an
OpenAPI spec that documents **requests** (methods, paths, bodies); it
explicitly leaves response shapes and status codes undocumented ("inspect
the live responses and formalize them however you prefer"). Everything
below marked **Response** was determined by exercising the live deployment
directly, not copied from the spec.

- **Base URL:** `https://frontend-task-chatapp.onrender.com/api`
- **WebSocket:** `https://frontend-task-chatapp.onrender.com` (Socket.io, served at the host root — **not** under `/api`)
- **Auth:** JWT bearer token. Obtain it from `POST /auth/login`, then send
  `Authorization: Bearer <token>` on every other REST request, and
  `{ auth: { token } }` in the Socket.io handshake.

I kept the endpoints and payload shapes from the given spec as-is rather
than renaming them — they're already clean and RESTful.

## Conventions

- All request/response bodies are JSON.
- Errors share one shape:
  ```json
  { "error": { "message": "string", "code": "STRING_CODE", "details": [{ "path": "field", "message": "string" }] } }
  ```
  `details` is only present for `VALIDATION_ERROR` (400).
- IDs are MongoDB ObjectId strings.

---

## Auth

### `POST /auth/login`
Logs in or registers in one step. If the phone number is new, an account is
created; otherwise the existing account logs in (the `name` sent on a
repeat login is currently **not** used to update the stored name).

**Auth:** none

**Body**
```json
{ "phone": "+15551234567", "name": "Ada Lovelace" }
```
Both fields required (400 `VALIDATION_ERROR` if missing).

**Response `200`**
```json
{
  "token": "eyJhbGciOi...",
  "user": { "_id": "665f...", "name": "Ada Lovelace", "phone": "+15551234567", "createdAt": "2026-08-21T10:11:52.529Z" }
}
```

### `GET /auth/me`
Returns the user for the current token. Used to restore a session on page
load without re-prompting for login.

**Response `200`**
```json
{ "_id": "665f...", "name": "Ada Lovelace", "phone": "+15551234567", "createdAt": "..." }
```
**Response `400`** if the `Authorization` header is missing —
`{ "error": { "message": "No token provided", "code": "NO_TOKEN" } }`.
Note this is a 400, not the more conventional 401.

---

## Users

### `GET /users/search?q=<term>`
Searches users by name or phone.

**Response `200`**: `User[]` — `[{ "_id", "name", "phone" }, ...]`

**Behavior notes (discovered by testing, not in the spec):**
- Matching is **prefix-only**, not substring/contains. Searching `"User B"`
  will not find `"Test User B"`. The client-side search dialog applies an
  additional substring filter on top of the API results to soften this.
- There is no pagination and no result cap in the response — on this shared
  demo database a broad query like `"Test"` can return 50+ rows.
- The current user is included if they match the query; the client filters
  their own id out of the results.

---

## Conversations

### `GET /conversations`
Lists the current user's conversations (direct and group), newest-first by
`updatedAt`.

**Response `200`**
```json
{
  "data": [
    {
      "_id": "...", "type": "direct", "updatedAt": "...",
      "lastMessage": { "text": "...", "sender": "...", "createdAt": "..." },
      "participant": { "_id": "...", "name": "...", "phone": "..." }
    },
    {
      "_id": "...", "type": "group", "updatedAt": "...",
      "lastMessage": { "text": "...", "sender": "...", "createdAt": "..." },
      "name": "Project Team", "createdBy": "...", "admins": ["..."],
      "participants": [{ "_id": "...", "name": "...", "phone": "..." }, ...]
    }
  ]
}
```
`lastMessage` is `{}` for a brand-new conversation with no messages yet.
Direct entries carry a single populated `participant` (the *other* user);
group entries carry the full `participants` array plus `name`/`admins`.

### `POST /conversations`
Starts (or reopens) a direct conversation with another user. Idempotent —
calling it again with the same `userId` returns the existing conversation
rather than creating a duplicate.

**Body:** `{ "userId": "<other user's id>" }`

**Response `201`**
```json
{ "_id": "...", "participants": ["<my id>", "<their id>"], "createdAt": "..." }
```
**Note:** unlike `GET /conversations`, this response does **not** populate
`participants` — just raw id strings. The client re-fetches the list (or
looks the user up from the search result it already has) to get a
displayable name/phone immediately after creating a conversation.

An invalid `userId` (not a valid ObjectId) currently returns a raw `500`
with a Mongoose cast error message rather than a `400` — see **Issues Ran
Into** in the README.

### `GET /conversations/:id/messages?limit=&before=`
Message history for a conversation, newest-first, cursor-paginated for
loading older messages.

**Query params**
- `limit` (optional) — page size.
- `before` (optional) — pass the `_id` of the oldest message currently
  loaded to fetch the next page further back in time.

**Response `200`**
```json
{ "messages": [{ "_id", "conversation", "sender", "text", "createdAt" }, ...], "hasMore": true }
```
Messages arrive newest-first; the client reverses them for top-to-bottom
rendering and prepends subsequent pages.

---

## Messages

### `POST /messages`
Sends a message to a direct or group conversation. Also triggers a
`message:new` Socket.io event to other participants (see below).

**Body:** `{ "conversationId": "...", "text": "..." }`

**Response `201`**
```json
{ "_id": "...", "conversation": "...", "sender": "...", "text": "...", "createdAt": "..." }
```

**Behavior notes:**
- The backend does **not** reject empty or whitespace-only `text` — it
  happily stores and returns it. "Empty messages should not be sendable"
  is enforced client-side only (the composer disables Send for
  blank/whitespace input).
- Posting to a `conversationId` that doesn't exist returns `200` with a
  body of `null` instead of a `404` — it silently no-ops rather than
  erroring.

---

## Groups

### `POST /conversations/group`
Creates a group. The creator becomes its first admin.

**Body:** `{ "name": "...", "participantIds": ["...", "..."] }`

**Response `201`**: same populated shape as a group row from
`GET /conversations` (includes `participants` with names/phones, unlike the
direct-conversation endpoint).

**Validation:** a group needs **3+ members total**, so `participantIds`
must contain at least 2 other users besides the creator. Fewer than that
returns `400 VALIDATION_ERROR` with `"a group needs at least 3 members"`.

### `POST /conversations/:id/participants`
Adds members to a group. **Admins only.**
**Body:** `{ "userIds": ["...", "..."] }` → returns the updated group.

### `DELETE /conversations/:id/participants/:userId`
Removes a member. **Admins only** — except a user may pass their own id to
leave the group themselves.

### `POST /conversations/:id/admins`
Promotes an existing member to admin. **Admins only.**
**Body:** `{ "userId": "..." }`

### `PATCH /conversations/:id`
Renames a group. **Admins only.**
**Body:** `{ "name": "..." }`

All four endpoints above return `403 FORBIDDEN` with a descriptive message
when called by a non-admin (verified by testing).

---

## WebSocket (Socket.io)

Not part of the OpenAPI spec; documented here from the given description
plus live testing.

```js
const socket = io("https://frontend-task-chatapp.onrender.com", {
  auth: { token },
});
```

| Direction | Event | Payload |
|---|---|---|
| client → server | `message:send` | `{ conversationId, text }` (alternative to `POST /messages`; not used by this client, which sends over REST for a synchronous response) |
| server → client | `message:new` | `{ id, conversation, sender, text, createdAt }` |
| server → client | `conversation:updated` | fired when a group you're in is created, renamed, or has its members/admins changed |

**Important shape mismatch:** the `message:new` socket payload is **not**
the same shape as the REST `Message` — it uses `id` instead of `_id`, and
`createdAt` as an epoch-millisecond **number** instead of an ISO string.
The client normalizes this in one place (`lib/socket.ts#normalizeSocketMessage`)
before it touches any other code.

**Delivery is live-only, not queued.** If a user's socket isn't connected
at the moment a message is sent, they simply don't receive that
`message:new` event — there's no replay/offline queue. The app doesn't
depend on this for correctness (message history always comes from the
REST endpoint, which is the source of truth), but it does mean a client
that's mid-reconnect can miss a live update until its next full refresh.

Room membership is dynamic: a socket that connects *before* a conversation
exists still receives events for it once it's created — confirmed by
testing directly against the API with a minimal Socket.io script.

---

## Health

### `GET /health`
**Note:** despite being grouped with the other endpoints in the spec (which
are all served under `/api`), this one is actually served at the **host
root** (`/health`, not `/api/health`) — `GET /api/health` returns 404.

**Response `200`:** `{ "status": "ok" }`
