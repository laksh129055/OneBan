# OneBan API — Reference

Base URL: `https://oneban.onrender.com` (local: `http://localhost:5000`)

## Authentication — two ways in
| Who | How | Header |
|---|---|---|
| Admin portal (website) | Log in → get a token (valid 8 h) | `Authorization: Bearer <token>` |
| Big platforms (server-to-server) | API key | `x-api-key: <key>` |

Demo logins (password `demo123`): `admin@quickride.demo`, `admin@homefix.demo`, `admin@fooddash.demo`

Errors always look like `{ "error": "message" }`.

---

## POST /auth/login
```json
// request
{ "email": "admin@quickride.demo", "password": "demo123" }
// 200
{ "token": "eyJ...", "platform": { "name": "QuickRide", "type": "ride-hailing" } }
// 401 { "error": "Wrong email or password" }
```
Rate limit: 20 attempts / 15 min per IP.

## POST /check — check a new applicant
```json
// request (phone and/or idToken)
{ "phone": "9876543210", "idToken": "DL-1234" }
// 200
{ "match": true,
  "incidents": [ { "category": "sexual_harassment", "severity": "high", "reportedBy": "QuickRide", "date": "2026-11-14" } ],
  "advice": "Match found. Send this applicant for human review before approving." }
```
Rate limit: 60 / min per platform.

## POST /signal — report a banned offender
```json
// request
{ "phone": "9876543210", "idToken": "DL-1234",
  "category": "sexual_harassment", "severity": "high", "city": "Delhi" }
// 201
{ "status": "recorded", "signalId": "..." }
```
- `category` must be one of: `sexual_harassment`, `sexual_assault`, `stalking`, `physical_assault`, `verbal_abuse`, `threats_intimidation`, `voyeurism`
- `severity`: `low` | `medium` | `high`
- Rate limit: 30 / min per platform.

## GET /signal/mine — my platform's reports
```json
[ { "id": "...", "category": "stalking", "severity": "high", "city": "Delhi",
    "status": "active", "date": "2026-11-14T10:20:00.000Z" } ]
```
`status` is `active` or `removed` (removed after an appeal).

## GET /signal/categories
```json
["sexual_harassment", "sexual_assault", "stalking", "physical_assault", "verbal_abuse", "threats_intimidation", "voyeurism"]
```

## GET /stats — network dashboard (login required)
```json
{ "total": 5, "checks24h": 12, "matches24h": 3, "personalDataStored": 0,
  "byCategory": [ { "_id": "stalking", "count": 2 } ],
  "byPlatform": [ { "_id": "QuickRide", "count": 3 } ],
  "byCity":     [ { "_id": "Delhi", "count": 4 } ],
  "recent": [ { "category": "stalking", "severity": "high", "city": "Delhi",
                "reportedBy": "QuickRide", "time": "2026-11-14T10:20:00.000Z" } ] }
```

## Appeals
**POST /appeals — public, no login** (for the accused person)
```json
// request
{ "phone": "9876543210", "reason": "This was a misunderstanding, please review." }
// 202 (same reply whether or not any report exists — it never reveals who is reported)
{ "status": "received", "message": "If any reports match these details, the platforms that filed them will review your appeal." }
```
Rate limit: 5 / hour per IP. Reason must be at least 10 characters.

**GET /appeals — login required** → appeals against *my* reports
```json
[ { "id": "...", "reason": "...", "date": "...", "myDecision": "pending",
    "reports": [ { "id": "...", "category": "sexual_harassment", "severity": "high",
                   "city": "Delhi", "status": "active", "date": "..." } ] } ]
```

**POST /appeals/:id/decision — login required**
```json
// request
{ "decision": "removed", "note": "Complaint found to be false" }   // or "upheld"
// 200
{ "status": "resolved", "decision": "removed" }
```
`removed` takes the report down → it no longer appears in `/check`.

---

## Security features (talking points)
- HMAC-SHA256 hashing of phone/ID with a secret key — real numbers never stored
- Matching on phone **or** ID (changing SIM doesn't help)
- Fixed list of serious safety categories only
- Rate limiting on login, check, signal and appeals
- Audit log of every check / report / decision (hashes only, auto-deleted after 180 days)
- Appeals that never reveal whether someone has been reported
- 10 KB request limit, generic server errors
