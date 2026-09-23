// API client that calls the REST backend (Spring Boot).
//
// The backend's DTOs use different field names/casing than the frontend's
// UI-facing types in ../types.ts (e.g. Booking.checkIn vs frontend's
// checkInDate, Booking.customerId vs guestId, Room.active vs isActive).
// Rather than rename fields throughout every page/component, this file is
// the single translation boundary: every backend response is mapped into
// the frontend shape here, and every request body is built from backend
// field names here. Pages only ever see the shapes in ../types.ts.

import type { Booking, Hotel, Room, RoomType, User } from "../types";

export class ApiException extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const BASE = (import.meta.env.VITE_API_URL as string) || "";
const TOKEN_KEY = "stayease.token";

function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

function saveToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

function removeToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

function unwrapCollection<T>(payload: unknown): T {
  if (Array.isArray(payload)) return payload as T;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.content)) return obj.content as T;
    if (Array.isArray(obj.data)) return obj.data as T;
    if (Array.isArray(obj.items)) return obj.items as T;
    if (Array.isArray(obj.hotels)) return obj.hotels as T;
    if (Array.isArray(obj.results)) return obj.results as T;
  }
  return payload as T;
}

async function request<T>(
  method: string,
  path: string,
  body?: any,
  params?: Record<string, string | undefined>
): Promise<T> {
  const base = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;
  const url = new URL(base + path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v));
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  // Auth endpoints must be reachable even when an old session token remains.
  if (token && !path.startsWith("/api/auth/")) headers["Authorization"] = `Bearer ${token}`;
  const opts: RequestInit = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url.toString(), opts);
  const text = await res.text();
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = text && isJson ? JSON.parse(text) : text;

  if (!res.ok) {
    // Spring's default error body shape is { timestamp, status, error, message, path }.
    // ResponseStatusException / validation errors also land here.
    const code = payload?.error || payload?.code || "API_ERROR";
    const message = payload?.message || payload || res.statusText;
    throw new ApiException(code, message);
  }

  return unwrapCollection<T>(payload) as T;
}

// helper to expose token management if needed
export function clearAuthToken() {
  removeToken();
}

// ---------- Response shapes coming from the backend ----------
// These mirror the backend's model/*.java response DTOs field-for-field.
// See HotelResponse.java, RoomResponse.java, BookingResponse.java, AuthResponse.java.

interface BackendHotelResponse {
  hotelId: string;
  hotelName: string;
  description: string;
  streetAddress?: string;
  cityName: string;
  stateName?: string;
  countryName: string;
  postalCode?: string;
  contactPhone?: string;
  contactEmail?: string;
  starRating: number;
  coverImageUrl: string;
  isActive: boolean;
  managerId: string;
  managerName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendRoomResponse {
  roomId: string;
  roomNumber: string;
  roomType: RoomType;
  roomDescription: string;
  pricePerNight: number;
  maxOccupancy: number;
  roomImageUrl: string;
  isAvailable: boolean;
  hotelId: string;
  hotelName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BackendBookingResponse {
  bookingId: string;
  bookingReference: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalAmount: number;
  bookingStatus: Booking["status"];
  specialRequests?: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  roomId: string;
  roomNumber?: string;
  roomType?: RoomType;
  hotelId: string;
  hotelName?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Flat shape - NOT nested under a "user" key. This is the actual shape
// returned by both POST /api/auth/login and POST /api/auth/register.
interface BackendAuthResponse {
  token: string;
  type?: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  tokenType?: string;
}

function mapHotel(h: BackendHotelResponse): Hotel {
  return {
    id: h.hotelId,
    name: h.hotelName,
    city: h.cityName,
    starRating: h.starRating,
    description: h.description,
    coverImageUrl: h.coverImageUrl,
    managerId: h.managerId,
    managerName: h.managerName,
    // The backend has no amenities/totalRooms fields on HotelResponse.
    amenities: [],
    createdAt: h.createdAt,
  };
}

function mapRoom(r: BackendRoomResponse): Room {
  return {
    id: r.roomId,
    hotelId: r.hotelId,
    roomNumber: r.roomNumber,
    roomType: r.roomType,
    pricePerNight: r.pricePerNight,
    maxOccupancy: r.maxOccupancy,
    description: r.roomDescription,
    imageUrl: r.roomImageUrl,
    isActive: r.isAvailable,
  };
}

function mapBooking(b: BackendBookingResponse): Booking {
  return {
    id: b.bookingId,
    bookingRef: b.bookingReference,
    hotelId: b.hotelId,
    hotelName: b.hotelName,
    roomId: b.roomId,
    roomNumber: b.roomNumber,
    roomType: b.roomType,
    guestId: b.customerId,
    guestName: b.customerName,
    checkInDate: b.checkInDate,
    checkOutDate: b.checkOutDate,
    totalPrice: b.totalAmount,
    status: b.bookingStatus,
    createdAt: b.createdAt || b.checkInDate,
  };
}

function mapUser(u: BackendAuthResponse): User {
  return {
    id: u.userId,
    email: u.email,
    name: u.name,
    role: u.role as User["role"],
  };
}

// ---------- Auth ----------

export async function login(email: string, password: string): Promise<User> {
  const res = await request<BackendAuthResponse>("POST", "/api/auth/login", { email, password });
  if (res?.token) saveToken(res.token);
  return mapUser(res);
}

export async function register(email: string, password: string, name: string): Promise<User> {
  const res = await request<BackendAuthResponse>("POST", "/api/auth/register", {
    email,
    password,
    name,
  });
  if (res?.token) saveToken(res.token);
  return mapUser(res);
}

// The backend has no GET /api/users/me or PATCH /api/users/me/password -
// there is no UserController at all. Profile info therefore has to come
// from what login/register already returned (cached by AuthContext in
// localStorage), and password changes aren't supported by this backend yet.
export async function getMyProfile(): Promise<never> {
  throw new ApiException(
    "NOT_SUPPORTED",
    "Viewing profile from the server isn't supported by this backend yet."
  );
}

export async function changePassword(_currentPassword: string, _newPassword: string): Promise<void> {
  throw new ApiException(
    "NOT_SUPPORTED",
    "Changing your password isn't supported by this backend yet."
  );
}

// ---------- Hotels ----------

// The backend's GET /api/hotels requires a non-blank city (there is no
// "list all hotels" mode) - throw a clear client-side error instead of
// letting an empty search silently 400.
export async function searchHotels(city: string): Promise<Hotel[]> {
  const trimmed = city.trim();
  if (!trimmed) {
    throw new ApiException("CITY_REQUIRED", "Enter a city to search for hotels.");
  }
  const hotels = await request<BackendHotelResponse[]>("GET", "/api/hotels", undefined, {
    city: trimmed,
  });
  return hotels.map(mapHotel);
}

export async function getHotel(hotelId: string): Promise<Hotel> {
  const h = await request<BackendHotelResponse>("GET", `/api/hotels/${hotelId}`);
  return mapHotel(h);
}

// Every hotel in the system, regardless of city. Backed by GET /api/hotels/all
// (ADMIN only) - used by the admin hotel directory instead of
// searchHotels("") which the backend rejects.
export async function getAllHotels(): Promise<Hotel[]> {
  const hotels = await request<BackendHotelResponse[]>("GET", "/api/hotels/all");
  return hotels.map(mapHotel);
}

// Hotels managed by the current user. Backed by GET /api/manager/hotels
// (requires MANAGER/ADMIN role) - used by the manager dashboard instead of
// searchHotels("") which the backend rejects.
export async function getMyHotels(): Promise<Hotel[]> {
  const hotels = await request<BackendHotelResponse[]>("GET", "/api/manager/hotels");
  return hotels.map(mapHotel);
}

export async function createHotel(input: Omit<Hotel, "id">): Promise<Hotel> {
  const h = await request<BackendHotelResponse>("POST", "/api/hotels", {
    hotelName: input.name,
    cityName: input.city,
    countryName: "India",
    starRating: input.starRating,
    description: input.description,
    coverImageUrl: input.coverImageUrl,
    managerId: input.managerId,
    isActive: true,
  });
  return mapHotel(h);
}

export async function updateHotel(hotelId: string, input: Partial<Hotel>): Promise<Hotel> {
  const h = await request<BackendHotelResponse>("PUT", `/api/hotels/${hotelId}`, {
    hotelName: input.name,
    cityName: input.city,
    countryName: "India",
    starRating: input.starRating,
    description: input.description,
    coverImageUrl: input.coverImageUrl,
    managerId: input.managerId,
    isActive: true,
  });
  return mapHotel(h);
}

export async function deleteHotel(hotelId: string): Promise<void> {
  return request<void>("DELETE", `/api/hotels/${hotelId}`);
}

// ---------- Rooms ----------

// Uses the availability-search endpoint so results actually exclude rooms
// with an overlapping booking for the given dates. Returns a plain array
// (not wrapped in an object) from the backend.
export async function getAvailableRooms(
  hotelId: string,
  checkIn: string,
  checkOut: string,
  _guests: number = 1
): Promise<Room[]> {
  const rooms = await request<BackendRoomResponse[]>(
    "GET",
    `/api/hotels/${hotelId}/rooms`,
    undefined,
    { checkIn, checkOut }
  );
  return rooms.map(mapRoom);
}

// All rooms for a hotel (active and inactive), for hotel-manager inventory
// views. Backed by GET /api/manager/hotels/{id}/rooms - the public
// /api/hotels/{id}/rooms endpoint always requires checkIn/checkOut dates
// and only returns rooms with no conflicting booking, which isn't what a
// manager managing their room list wants to see.
export async function getHotelRooms(hotelId: string): Promise<Room[]> {
  const rooms = await request<BackendRoomResponse[]>(
    "GET",
    `/api/manager/hotels/${hotelId}/rooms`
  );
  return rooms.map(mapRoom);
}

export async function getRoom(roomId: string): Promise<Room> {
  const r = await request<BackendRoomResponse>("GET", `/api/rooms/${roomId}`);
  return mapRoom(r);
}

function toRoomRequest(input: Partial<Room>) {
  return {
    roomNumber: input.roomNumber,
    roomType: input.roomType,
    roomDescription: input.description,
    pricePerNight: input.pricePerNight,
    maxOccupancy: input.maxOccupancy,
    roomImageUrl: input.imageUrl,
    isAvailable: input.isActive,
  };
}

export async function createRoom(input: Omit<Room, "id">): Promise<Room> {
  const r = await request<BackendRoomResponse>(
    "POST",
    `/api/hotels/${input.hotelId}/rooms`,
    toRoomRequest(input)
  );
  return mapRoom(r);
}

export async function updateRoom(roomId: string, input: Partial<Room>): Promise<Room> {
  const r = await request<BackendRoomResponse>("PUT", `/api/rooms/${roomId}`, toRoomRequest(input));
  return mapRoom(r);
}

export async function deleteRoom(roomId: string): Promise<void> {
  return request<void>("DELETE", `/api/rooms/${roomId}`);
}

// Sets the room's active flag via the dedicated PATCH status endpoint. The
// backend takes isAvailable as a query param, not a JSON body field, and
// there's no GET-based "toggle" - callers must pass the desired target
// state explicitly (e.g. !room.isActive from a Room they already have
// loaded). Renamed from toggleRoomStatus since it's no longer implicit.
export async function setRoomStatus(roomId: string, isActive: boolean): Promise<Room> {
  const r = await request<BackendRoomResponse>(
    "PATCH",
    `/api/rooms/${roomId}/status`,
    undefined,
    { isAvailable: String(isActive) }
  );
  return mapRoom(r);
}

// ---------- Bookings ----------

export async function createBooking(
  _guestId: string,
  roomId: string,
  checkInDate: string,
  checkOutDate: string,
  numberOfGuests: number = 1
): Promise<Booking> {
  // customerId is intentionally not sent - the backend derives the guest
  // from the JWT (@AuthenticationPrincipal), not the request body.
  const b = await request<BackendBookingResponse>("POST", "/api/bookings", {
    roomId,
    checkInDate,
    checkOutDate,
    numberOfGuests,
  });
  return mapBooking(b);
}

// There is no GET /api/bookings/{id} on the backend - the only single-user
// booking listing is GET /api/bookings/mine. Look the booking up there
// instead of hitting a nonexistent endpoint.
export async function getBooking(bookingId: string): Promise<Booking> {
  const bookings = await getMyBookings();
  const found = bookings.find((b) => b.id === bookingId);
  if (!found) {
    throw new ApiException("NOT_FOUND", "Booking not found.");
  }
  return found;
}

// The guest's own bookings. The backend derives the user from the JWT, so no
// id is passed - this avoids a guest being able to request another user's id.
// (guestId is accepted for call-site compatibility but no longer sent.)
export async function getMyBookings(_guestId?: string): Promise<Booking[]> {
  const bookings = await request<BackendBookingResponse[]>(
    "GET",
    `/api/bookings/mine`
  );
  return bookings.map(mapBooking);
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  const b = await request<BackendBookingResponse>("PUT", `/api/bookings/${bookingId}/cancel`);
  return mapBooking(b);
}

// Returns upcoming bookings across every hotel the manager runs. Filter
// client-side by hotelId since the backend has no per-hotel query param.
export async function getHotelBookings(hotelId: string): Promise<Booking[]> {
  const bookings = await request<BackendBookingResponse[]>(
    "GET",
    `/api/manager/bookings`
  );
  return bookings.map(mapBooking).filter((b) => b.hotelId === hotelId);
}

// ---------- Lookups ----------
// The backend has no batch-by-ids endpoints, so these fan out to the
// existing single-item endpoints in parallel instead.

export async function getRoomsByIds(ids: string[]): Promise<Room[]> {
  const results = await Promise.all(ids.map((id) => getRoom(id).catch(() => null)));
  return results.filter((r): r is Room => r !== null);
}

export async function getHotelsByIds(ids: string[]): Promise<Hotel[]> {
  const results = await Promise.all(ids.map((id) => getHotel(id).catch(() => null)));
  return results.filter((h): h is Hotel => h !== null);
}

export type { RoomType };
