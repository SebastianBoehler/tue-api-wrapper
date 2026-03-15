# Uni Mail Discovery

Discovery date: 2026-03-15

This document summarizes the current mail surface in `tue-api-wrapper`, the live IMAP capabilities observed against the Uni Tuebingen student mailbox, and a ranked roadmap of additional mail endpoints/features by student value.

No raw message bodies, credentials, or private mailbox exports are stored here. Live observations below were reduced to capability flags, folder names, and aggregate message-structure statistics.

SMTP send support is officially documented by the university and already known to use `smtpserv.uni-tuebingen.de:587` with STARTTLS, but this discovery pass focused on IMAP/inbox behavior because that is where the student-facing product value is highest.

## Current Mail Surface

Implemented backend endpoints:

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /api/mail/inbox?limit=` | Read-only inbox summary with unread flags, sender, subject, preview, and UID | implemented |
| `GET /api/mail/messages/{uid}` | Read-only message detail with recipients, body text, attachments, and unread flag | implemented |

Implemented frontend routes:

| Route | Purpose | Status |
| --- | --- | --- |
| `/mail` | Inbox list with unread highlighting | implemented |
| `/mail/[uid]` | Message detail page for reading body text | implemented |

## Live IMAP Capability Discovery

The mailbox accepted the same `UNI_USERNAME` / `UNI_PASSWORD` credentials used elsewhere in the app. In this account, that username is the ZDV-ID style login rather than the visible email address. The server exposed the following relevant IMAP capabilities:

| Capability | What it enables | Product implication |
| --- | --- | --- |
| `IDLE` | push-like mailbox refresh without aggressive polling | live unread badge refresh is feasible |
| `MOVE` / `XMOVE` | server-side moving of messages between folders | archive, spam, trash, and cleanup actions are feasible |
| `UIDPLUS` | more stable UID-oriented workflows | safe message-level actions and follow-up fetches are easier |
| `THREAD=REFERENCES`, `THREAD=ORDEREDSUBJECT`, `THREAD=REFS` | conversation grouping | thread view is technically supported |
| `SORT`, `ESORT`, `SORT=UID`, `SORT=MODSEQ`, `SORT=DISPLAY` | sorted mailbox views | inbox ordering and filtered browsing can be server-assisted |
| `SEARCH=FUZZY`, `WITHIN`, `ESEARCH` | richer search | server-backed search is feasible without downloading full mailbox state |
| `CONDSTORE`, `QRESYNC` | incremental sync and change tracking | efficient refresh becomes possible once the app tracks state |
| `LIST-STATUS`, `SPECIAL-USE`, `XLIST`, `CREATE-SPECIAL-USE` | folder discovery with semantic hints | mailbox/folder endpoint is straightforward |
| `QUOTA`, `X-QUOTA=*` | storage counters | quota/space warnings are possible but low-value |
| `PREVIEW=FUZZY` | server-side previews | could reduce fetch volume if performance becomes a concern |

Observed mailbox folders:

| Folder | Notes |
| --- | --- |
| `INBOX` | primary inbox |
| `Drafts` | top-level draft folder |
| `Mail/drafts` | secondary draft-like folder |
| `Mail/sent` | sent messages |
| `Mail/trash` | trash |
| `Mail/s-spam` | likely spam/quarantine related |
| `Mail/v-spam` | likely spam/quarantine related |
| `Sent Messages` | additional sent folder alias |

Product implication:

- The server supports much more than plain inbox reading.
- The strongest next additions are triage, folder access, and refresh.
- Full sync is not required to add student-useful behavior.

## Recent Message Structure Sample

Sample window: latest 20 inbox messages.

| Observation | Result | Interpretation |
| --- | --- | --- |
| Messages with `text/plain` part | 20 / 20 | plaintext-first rendering is already a good baseline |
| Messages with HTML part | 2 / 20 | HTML rendering is useful but not required for most student mail |
| Messages with attachments | 0 / 20 | attachment support matters, but not as urgently as triage/search in this sample |
| Messages with mailing-list headers | 0 / 20 | classic list management is not a primary need in this mailbox sample |
| Messages with reply-thread headers | 0 / 20 | thread view may matter less than inbox filtering for current student mail patterns |
| Top sender domains | mostly `uni-tuebingen.de` family domains | institution-first filtering and category heuristics are promising |

Product implication:

- The current plaintext detail view is already aligned with the recent mailbox mix.
- Filtering, classification, and folder access likely produce more value than HTML rendering polish.
- Attachment download should still exist, but it is not the top-ranked next step based on this sample.

## Ranked Roadmap By Student Value

Scores are qualitative and rank student value, not implementation difficulty.

| Rank | Proposed endpoint / feature | Student value | Why it matters |
| --- | --- | --- | --- |
| 1 | `GET /api/mail/inbox?mailbox=&limit=&unread_only=&sender=&query=` | very high | students mostly need triage first: unread-only, sender filter, and simple search dramatically reduce time spent in noisy inboxes |
| 2 | `GET /api/mail/mailboxes` | very high | students need access to spam, sent, trash, and special university folders because important mails can land outside `INBOX` |
| 3 | `POST /api/mail/messages/{uid}/read-state` | high | marking read/unread is the smallest state-changing action with immediate daily value and low conceptual complexity |
| 4 | `POST /api/mail/messages/{uid}/move` | high | move-to-trash, move-to-spam, and archive clean up the mailbox without forcing a switch to webmail |
| 5 | `GET /api/mail/stream` or `GET /api/mail/poll-state` backed by `IDLE`/incremental sync | high | live unread counts and new-message indicators make the app feel usable as a dashboard rather than a static viewer |
| 6 | `GET /api/mail/search` backed by IMAP search/sort/thread | high | once mail volume grows, search by sender, subject, date window, and institution keywords becomes more valuable than scrolling |
| 7 | `GET /api/mail/messages/{uid}/attachments` and `/attachments/{name}` | medium | not top-ranked in the current sample, but still important for PDF notices, confirmations, and forms |
| 8 | `GET /api/mail/threads/{id}` or grouped inbox mode | medium | technically supported, but the sampled student mail looked less thread-heavy than alert/announcement heavy |
| 9 | `GET /api/mail/categories` with app-side heuristics | medium | grouping messages into exams, library, admin, workshops, billing, and account/security would help students act faster |
| 10 | `GET /api/mail/quota` | low | useful as a safety metric, but not central to day-to-day student workflows |
| 11 | `POST /api/mail/send` via SMTP | low | possible, but risky for abuse, support, and credential handling; it also broadens the product from dashboard to full mail client |

## Recommended Next Build Order

If the goal is maximum student value with controlled complexity, the best sequence is:

1. mailbox discovery and folder switching
2. unread-only and sender/date/query filters
3. read/unread state changes
4. move/archive/trash actions
5. live unread refresh
6. attachment metadata and downloads

This order matches the observed mailbox usage better than jumping straight to send-mail or rich HTML rendering.

## Endpoint Sketches

Suggested shapes:

| Endpoint | Example |
| --- | --- |
| Inbox filtering | `/api/mail/inbox?mailbox=INBOX&limit=25&unread_only=true&query=deadline` |
| Mailboxes | `/api/mail/mailboxes` |
| Mark read/unread | `POST /api/mail/messages/511/read-state` with body `{ "isRead": true }` |
| Move message | `POST /api/mail/messages/511/move` with body `{ "destination": "Mail/trash" }` |
| Attachment list | `/api/mail/messages/511/attachments` |
| Search | `/api/mail/search?query=exam&mailbox=INBOX&days=30` |

## Recommended Product Framing

The mail feature should remain a student triage layer, not a full mail client.

That means prioritizing:

- read quickly
- find quickly
- classify quickly
- clear the inbox quickly

It does not mean prioritizing:

- full compose/send flows
- signature management
- rich HTML composition
- general-purpose mail administration
