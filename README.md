# ⚡ Parola Bolt

> **Fast. Verified. Real.** — A next-generation social messaging platform with verified identities, real-time communication, and offline SMS fallback.

---

## Project structure

```
parola-bolt/
├── server/          Express + Socket.IO + MongoDB backend
└── client/          React + Vite + Tailwind CSS frontend
```

---

## Quick start (development)

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or MongoDB Atlas)
- A [Cloudinary](https://cloudinary.com) account (free tier works)

### 1 — Backend

```bash
cd server
cp . .env         
npm install
npm run seed                  # optional: seed sample users/posts
npm run dev                   # starts on http://localhost:5000
```

### 2 — Frontend

```bash
cd client
npm install
npm run dev                   # starts on http://localhost:5173
```

The Vite dev server proxies `/api` and `/socket.io` to `localhost:5000`.

---

## Seeded test accounts

| Username    | Password            | Role       |
|-------------|---------------------|------------|
| `admin`     | `Admin@PB2025!`     | Admin      |
| `priyanka.d`   | `Priyanka@Test2025!`   | User       |
| `gufran.a`   | `Gufran@Test2025!`   | Moderator  |
| `priya.n`   | `Priya@Test2025!`   | User       |

> All seed accounts skip biometric on login for testing. Set `biometric.isRegistered: true` in the DB (already done by the seed).

---

## Key features implemented

| Feature | Status |
|---------|--------|
| Signup with full validation | ✅ |
| Age gate (18+) | ✅ |
| Mock biometric (Face ID) | ✅ |
| Multi-identifier login (email / username / mobile) | ✅ |
| JWT + refresh token auth | ✅ |
| Dark mode (persistent) | ✅ |
| Feed with infinite scroll | ✅ |
| Post composer (text + media) | ✅ |
| Post likes / comments / shares / save | ✅ |
| Post reporting | ✅ |
| Reels vertical feed (autoplay on scroll) | ✅ |
| Reel upload | ✅ |
| Profile page with 4 tabs | ✅ |
| Follow / unfollow system | ✅ |
| Friend request system | ✅ |
| Identity verification request & review | ✅ |
| Verified badge | ✅ |
| Real-time messaging (Socket.IO) | ✅ |
| Group chat | ✅ |
| Typing indicators | ✅ |
| Read receipts | ✅ |
| Message reactions | ✅ |
| Voice notes | ✅ |
| Online / offline presence | ✅ |
| **Offline SMS fallback mode** | ✅ |
| Offline message queue (sync on reconnect) | ✅ |
| Connection status banner | ✅ |
| Content moderation engine | ✅ |
| Admin dashboard + analytics charts | ✅ |
| User management (status / role) | ✅ |
| Content moderation queue | ✅ |
| Reports queue | ✅ |
| Notification system | ✅ |
| Global search (users / posts / reels / hashtags) | ✅ |
| Responsive design (mobile-first) | ✅ |
| Rate limiting | ✅ |
| XSS + MongoDB injection protection | ✅ |
| Role-based access control | ✅ |

---

## API reference (summary)

### Auth  `POST /api/auth/…`
| Endpoint | Description |
|----------|-------------|
| `POST /signup` | Create account (returns pending token) |
| `POST /biometric/register` | Complete biometric onboarding |
| `POST /login` | Password login |
| `POST /biometric/login` | Face ID login |
| `POST /refresh` | Refresh access token |
| `POST /logout` | Logout + invalidate refresh token |
| `GET /me` | Current user |

### Users  `GET/PUT /api/users/…`
| Endpoint | Description |
|----------|-------------|
| `GET /dashboard` | Dashboard aggregation |
| `GET /suggestions` | Suggested friends |
| `GET /friend-requests` | Incoming requests |
| `PUT /friend-request/:id/respond` | Accept / decline |
| `GET /:username` | Public profile |
| `GET /:id/posts` | Profile posts (tab param) |
| `GET /:id/reels` | Profile reels |
| `POST /:id/follow` | Follow |
| `DELETE /:id/follow` | Unfollow |
| `POST /:id/friend-request` | Send friend request |
| `PUT /profile` | Edit profile |
| `PUT /avatar` | Upload avatar |
| `PUT /cover` | Upload cover photo |
| `POST /verification-request` | Submit verification docs |

### Posts  `GET/POST /api/posts/…`
`/feed` · `/:id` · `/:id/like` · `/:id/comments` · `/:id/share` · `/:id/save` · `/:id/report`

### Reels  `GET/POST /api/reels/…`
`/feed` · `/:id/view` · `/:id/like` · `/:id/comments` · `/:id/share` · `/:id/report`

### Chats  `GET/POST /api/chats/…`
`/` · `/group` · `/:id/messages` · `/:id/read` · `/messages/:id/react`

### Other
`GET /api/notifications` · `GET /api/search?q=` · `/api/admin/…`

---

## Socket.IO events

| Event (client→server) | Description |
|----------------------|-------------|
| `chat:join` | Join a chat room |
| `chat:leave` | Leave a chat room |
| `typing:start` | Start typing indicator |
| `typing:stop` | Stop typing indicator |
| `message:read` | Mark messages read |

| Event (server→client) | Description |
|----------------------|-------------|
| `message:new` | New message in a chat |
| `typing:update` | Typing indicator update |
| `message:read_receipt` | Read receipt update |
| `message:reaction_update` | Reaction change |
| `message:sms_status_update` | SMS fallback status |
| `presence:update` | User online/offline |

---

## Offline SMS fallback flow

```
User sends message
        │
        ▼
Is recipient online (socket connected)?
  YES → Deliver via Socket.IO ─────────────────► ✓ Online delivery
  NO  → smsFallback.status = 'queued'
        │
        ▼
  sendSimulatedSMS() → status = 'sent'
        │
        ▼
  simulateDeliveryConfirmation() (1.5s delay)
        │
        ▼
  status = 'delivered' + socket emit to chat room

When sender is OFFLINE (browser navigator.onLine = false):
  → Message queued in localStorage (useOfflineQueue)
  → Banner: "SMS Fallback Mode"
  → On reconnect: queue flushed automatically via /api/chats/:id/messages
```

---

## Content moderation pipeline

```
User creates post/comment
        │
        ▼
analyzeText(caption)
  ├─ Offensive language detected? → REJECTED
  ├─ 2+ spam patterns?            → REJECTED
  ├─ 1 spam pattern / misinfo?    → FLAGGED (visible with warning label)
  └─ Clean                        → APPROVED

3+ user reports on same post → auto-flagged for admin review
Admin/Moderator can approve / flag / reject from the content queue
```
#
