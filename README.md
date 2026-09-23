# Capstone_FSEJAVA_Team45_stayease-hotelbooking-ui
# StayEase — Frontend (React + Vite + TypeScript)
Build a hotel room booking web application where users can browse hotels, check room availability for selected dates, and confirm a booking.
The web UI for StayEase, a small hotel booking application. Search hotels by city and dates, compare rooms, book, and manage a stay — with separate views for guests, hotel managers, and admins. This is a pure frontend: it
talks to the StayEase booking-service REST API for everything (auth, hotels, rooms, bookings).

**Backend repo:** https://github.com/Apexon-Enterprise-org/Capstone_FSEJAVA_Team45_stayease-hotelbooking-service.git
## Tech stack

- React 19 + TypeScript
- Vite (dev server + build)
- React Router
- No UI framework/component library — hand-styled with plain CSS
  (see `src/index.css` and Design notes below)

## What's built

- **Home** (`/`) — search by city + dates
- **Hotel list** (`/hotels`) — results with a starting price for the chosen dates
- **Hotel detail** (`/hotels/:id`) — description, available rooms, booking
- **Login / Register**
- **My Stays** (`/my-stays`, guest only) — bookings list, cancel
- **Booking confirmation** (`/booking-confirmation/:id`) — booking reference + total
- **Manager dashboard** (`/manager`, manager only) — room CRUD, activate/deactivate, upcoming bookings for their hotel
- **Admin panel** (`/admin`, admin only) — hotel directory CRUD

Routes are role-gated with `ProtectedRoute` — logged-out or wrong-role visits
redirect away.

## Prerequisites

- **Node.js** (LTS recommended) — download and install from https://nodejs.org/
- **npm** — comes bundled with Node.js

Verify the installation:

```bash
node -v
npm -v
```

## Setup

Install dependencies from the project root:

```bash
npm install
```

## Backend / environment configuration

The frontend talks to the StayEase booking-service REST API. The API base URL is
configured via `VITE_API_URL` in `.env.local`.

The current `.env.local` points to a **local backend**:

```env
VITE_API_URL=http://localhost:8080
```

This means the local backend must be running on `http://localhost:8080`.
If you want to use a different server, update `VITE_API_URL` in `.env.local`
to point to any other reachable backend server.

## Run the application

### Development mode

```bash
npm run dev
```

Vite will print the local URL (typically `http://localhost:5173`).

### Production build + preview

```bash
npm run build
npm run preview
```

`npm run build` compiles TypeScript and produces the optimized bundle in `dist/`.
`npm run preview` serves that built bundle locally so you can verify the production build.

> Note: the script is `npm run preview` (not `npm preview`).

## Available scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build
- `npm run lint` — run the linter (oxlint)
- `npm run test` — run unit tests once
- `npm run test:watch` — run unit tests in watch mode
- `npm run test:coverage` — run unit tests with coverage
- `npm run test:e2e` — run the end-to-end check script
