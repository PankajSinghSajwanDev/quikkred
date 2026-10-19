# Quikkred — Task Management

Quikkred is a full-stack task app with an **admin portal** and a **member portal**. Admins manage members and tasks, grant CRUD permissions, and view activity logs. Members work on assigned tasks, track time, and post updates that admins can see.

---

## Demo Credentials

username : admin
password : Admin@#8851

## Approach

### Architecture

| Layer        | Choice                                        | Why                                                      |
| ------------ | --------------------------------------------- | -------------------------------------------------------- |
| Frontend     | Next.js 15 (App Router) + React 19 + Tailwind | Fast UI, file-based routes, middleware for route guards  |
| Backend      | Express 5 + MongoDB (Mongoose)                | Simple REST API, flexible documents for permissions      |
| Auth         | JWT (stateless)                               | No server session store; token in browser `localStorage` |
| Realtime     | Socket.IO                                     | Live notifications when tasks are assigned               |
| Hosting (FE) | Netlify + `@netlify/plugin-nextjs`            | Next.js-friendly deploy                                  |

```
┌─────────────────────┐         REST + JWT          ┌─────────────────────┐
│  Next.js frontend   │ ──────────────────────────► │  Express API         │
│  :3000              │ ◄──── Socket.IO (optional) ──│  :3001               │
│  admin / user UI    │                             │  MongoDB Atlas/local │
└─────────────────────┘                             └─────────────────────┘
```

### Auth & “session”

- Login returns a **JWT**.
- Frontend stores `admin_token` / `user_token` in **`localStorage`**.
- Cookies `qk_admin` / `qk_user` are **flags only** (used by Next middleware to send unauthenticated users to login).
- Backend does **not** store sessions in the DB; each request verifies the Bearer token.

### RBAC (permissions)

- **Super admin** — full access (members, tasks, logs).
- **Members** — optional CRUD grants on `team` and `tasks` (set when creating/editing a member).
- Members **without** task grants only see **their own** tasks (assigned or created). They do **not** get “Create & assign” unless admin grants **Tasks → Create**.
- Members with permissions can also sign in on the **admin login** using their **email** (staff-style access limited to their grants).

### Main product flows

1. Admin creates members and optionally assigns permissions.
2. Admin creates/assigns tasks.
3. Member opens a task → starts/stops timer → posts updates (visible to admin).
4. Admin views **Logs** (paginated activity: timer, task changes, notes).

### Security notes

- Password hashing with bcrypt
- Rate limiting + single-flight (duplicate in-flight mutations rejected)
- Input validation on API and forms
- CORS limited to configured origins

---

## Project structure

```
pankaj_int/
├── backend/                 # Express API
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/          # admin, user, team, tasks, logs
│   │   ├── models/
│   │   ├── middleware/      # auth, rate limit, security
│   │   ├── services/        # notifications, activity log, task updates
│   │   └── scripts/         # optional seed scripts
│   └── package.json
├── frontend/                # Next.js app
│   ├── src/app/             # /admin/*, /user/*
│   ├── src/components/
│   ├── netlify.toml
│   └── package.json
└── README.md
```

---

## Prerequisites

- **Node.js** 20+ (recommended)
- **npm**
- **MongoDB** (local or Atlas connection string)

---

## Setup instructions

### 1. Clone and install

```bash
git clone <your-repo-url>
cd pankaj_int

cd backend
npm install

cd ../frontend
npm install
```

### 2. Backend environment

Create `backend/.env` (do not commit this file):

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb+srv://USER:PASS@HOST/DB_NAME
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:3000
```

For a Netlify frontend later, allow both origins:

```env
CORS_ORIGIN=http://localhost:3000,https://your-site.netlify.app
```

### 3. Frontend environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Start the apps

Use **two terminals**:

**Terminal 1 — API**

```bash
cd backend
npm run dev
```

API: [http://localhost:3001](http://localhost:3001)  
Health: [http://localhost:3001/health](http://localhost:3001/health)

**Terminal 2 — UI**

```bash
cd frontend
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

### 5. First login

1. Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
2. On first run, **create the admin** account.
3. Sign in → create **Members**, assign permissions if needed, create **Tasks**.
4. Members sign in at [http://localhost:3000/user/login](http://localhost:3000/user/login) with their email/password.

## Useful scripts

| Location   | Command              | Purpose                   |
| ---------- | -------------------- | ------------------------- |
| `backend`  | `npm run dev`        | API with file watch       |
| `backend`  | `npm start`          | API production-style      |
| `backend`  | `npm run seed:dummy` | Seed sample members/tasks |
| `frontend` | `npm run dev`        | Next.js + Turbopack       |
| `frontend` | `npm run build`      | Production build          |
| `frontend` | `npm start`          | Serve production build    |

---

## Deploy (overview)

### Frontend (Netlify)

1. Connect the repo; set **Base directory** to `frontend`.
2. `netlify.toml` already configures the Next.js plugin.
3. Set env: `NEXT_PUBLIC_API_URL=https://your-public-api-url`
4. Redeploy after changing env vars (they are baked in at build time).

### Backend

Host the Express API (Render, Railway, etc.) with the same env vars as local, plus:

- `CORS_ORIGIN` including your Netlify URL
- `TRUST_PROXY=1` if behind a reverse proxy

The Netlify site **cannot** call `localhost` — the API must be publicly reachable.

---
