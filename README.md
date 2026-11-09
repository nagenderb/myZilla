# Myzilla

A small bug tracker. Roles are **admin** and **user**. Both can create and update any bug. Only an admin can manage products and users.

## Requirements

- Node.js 18+
- MongoDB running locally

## Setup

```bash
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```

In another terminal:

```bash
cd client
npm install
npm run dev
```

The API listens on port 5050 (macOS often reserves 5000 for AirPlay). The Vite dev server proxies `/api` to that port.

Open http://localhost:5173.

Seeded admin:

- email: `admin@myzilla.local`
- password: `admin123`

Registration always creates a user. An admin can change roles on the Users page.
