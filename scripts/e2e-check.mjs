// Lightweight smoke test for the StayEase backend, run from the command line
// with the backend already started (e.g. `mvn spring-boot:run`):
//
//   node scripts/e2e-check.mjs
//
// It walks through the same calls the frontend makes (see src/services/api.ts)
// against a real running backend and reports pass/fail for each one. This is
// not a replacement for clicking through the app, but it catches endpoint/
// contract mismatches (wrong path, wrong field names, wrong status code)
// much faster than doing it by hand in the browser.
//
// NOTE: this previously pointed at endpoints that don't exist on the backend
// (e.g. GET /api/v1/hotels/{id}/rooms) - those were copied from the same
// incorrect assumptions that were in src/services/api.ts before this review.
// The checks below match the backend's actual controllers.

import fs from "fs";

function readEnvLocal() {
  const p = new URL("../.env.local", import.meta.url).pathname;
  try {
    const raw = fs.readFileSync(p, "utf8");
    const m = raw.match(/VITE_API_URL=(.*)/);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

const BASE = readEnvLocal() || process.env.VITE_API_URL || "http://localhost:8080";
console.log("Using API base:", BASE);

let passCount = 0;
let failCount = 0;
let authToken = null;

async function req(method, path, body) {
  const url = new URL(path, BASE).toString();
  try {
    const headers = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
    return { ok: res.ok, status: res.status, payload };
  } catch (e) {
    return { ok: false, status: null, error: String(e), payload: null };
  }
}

function report(label, result, expectOk = true) {
  const passed = expectOk ? result.ok : !result.ok;
  if (passed) passCount++;
  else failCount++;
  const marker = passed ? "PASS" : "FAIL";
  console.log(`[${marker}] ${label} - status:${result.status ?? "ERR"}${result.error ? " " + result.error : ""}`);
  if (!passed) {
    console.log(`       payload: ${JSON.stringify(result.payload)?.slice(0, 300)}`);
  }
  return result;
}

(async () => {
  // 1) Hotels list - what HotelList/AdminPanel load on mount.
  const hotelsRes = report("GET /api/v1/hotels", await req("GET", "/api/v1/hotels"));
  const hotels = Array.isArray(hotelsRes.payload) ? hotelsRes.payload : [];
  if (hotels.length === 0) {
    console.log("\nNo hotels found - seed at least one hotel/room to exercise the rest of this check.");
    finish();
    return;
  }
  const hotel = hotels[0];
  console.log(` Using hotel: ${hotel.name} (${hotel.id})`);

  // 2) Single hotel lookup - HotelDetail.
  report("GET /api/v1/hotels/{id}", await req("GET", `/api/v1/hotels/${hotel.id}`));

  // 3) Rooms for a hotel (no date filter) - used by HotelList's price badges
  //    and by ManagerDashboard.
  const roomsRes = report("GET /api/v1/rooms/hotel/{hotelId}", await req("GET", `/api/v1/rooms/hotel/${hotel.id}`));
  const rooms = Array.isArray(roomsRes.payload) ? roomsRes.payload : [];

  // 4) Availability search with dates - what HotelDetail actually books against.
  const checkIn = "2026-10-21";
  const checkOut = "2026-10-22";
  const availRes = report(
    "GET /api/v1/search/{hotelId}/availability",
    await req("GET", `/api/v1/search/${hotel.id}/availability?checkIn=${checkIn}&checkOut=${checkOut}&guests=1`)
  );
  const availableRooms = availRes.payload?.availableRooms ?? [];

  // 5) Register + login a throwaway guest account.
  const email = `e2e-${Date.now()}@example.com`;
  const registerRes = report(
    "POST /api/v1/auth/register",
    await req("POST", "/api/v1/auth/register", { name: "E2E Test", email, password: "password123" })
  );
  const guestId = registerRes.payload?.user?.id;
  // Register already returns a token (see AuthResponse), so the guest is
  // technically already authenticated - but log in explicitly too, since
  // that's the call the frontend actually makes and it's worth checking on
  // its own. Either response's token works for the calls below; every
  // protected endpoint (anything other than register/login/browsing) needs
  // "Authorization: Bearer <token>" or it 403s with no credentials at all.
  if (registerRes.payload?.token) authToken = registerRes.payload.token;

  if (guestId) {
    const loginRes = report("POST /api/v1/auth/login", await req("POST", "/api/v1/auth/login", { email, password: "password123" }));
    if (loginRes.payload?.token) authToken = loginRes.payload.token;
  }

  // 6) Create + fetch + list + cancel a booking, if there's an available room.
  const bookableRoom = availableRooms[0] ?? rooms[0];
  if (guestId && bookableRoom) {
    const roomId = bookableRoom.roomId ?? bookableRoom.id;
    const createRes = report(
      "POST /api/v1/bookings",
      await req("POST", "/api/v1/bookings", {
        customerId: guestId,
        roomId,
        checkIn,
        checkOut,
        numberOfGuests: 1,
      })
    );
    const bookingId = createRes.payload?.id;

    if (bookingId) {
      report("GET /api/v1/bookings/{id}", await req("GET", `/api/v1/bookings/${bookingId}`));
      report("GET /api/v1/bookings/customer/{customerId}", await req("GET", `/api/v1/bookings/customer/${guestId}`));
      // A plain guest is NOT the hotel's manager (or an admin), so this is
      // correctly forbidden by AuthorizationService.requireHotelManagerOrAdmin
      // - only that hotel's manager/admin may list all of its bookings. This
      // check confirms that authorization is enforced (a 200 here would be
      // the actual bug - a guest seeing every booking for the hotel).
      report(
        "GET /api/v1/bookings/hotel/{hotelId} (expected 403 - guest is not this hotel's manager)",
        await req("GET", `/api/v1/bookings/hotel/${hotel.id}`),
        false
      );
      report("PUT /api/v1/bookings/{id}/cancel", await req("PUT", `/api/v1/bookings/${bookingId}/cancel`));
    }
  } else {
    console.log("\nSkipping booking flow - no bookable room or guest account available.");
  }

  finish();
})();

function finish() {
  console.log(`\n${passCount} passed, ${failCount} failed.`);
  process.exit(failCount > 0 ? 2 : 0);
}
