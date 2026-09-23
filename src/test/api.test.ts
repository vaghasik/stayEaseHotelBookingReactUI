import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as api from "../services/api";

function mockFetchOnce(status: number, body: unknown, contentType = "application/json") {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: "",
      headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? contentType : null) },
      text: async () => text,
    } as unknown as Response)
  );
}

// For code paths that make MORE than one fetch call (e.g. getRoomsByIds/
// getHotelsByIds fan out to one call per id) - mockFetchOnce alone won't
// work for these, since each call replaces the global fetch mock entirely
// rather than queuing a second response behind the first. This queues all
// of them on one mock, in order.
function mockFetchSequence(...responses: Array<{ status: number; body: unknown; contentType?: string }>) {
  const fn = vi.fn();
  responses.forEach(({ status, body, contentType = "application/json" }) => {
    const text = typeof body === "string" ? body : JSON.stringify(body);
    fn.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      statusText: "",
      headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? contentType : null) },
      text: async () => text,
    } as unknown as Response);
  });
  vi.stubGlobal("fetch", fn);
}

describe("api.ts", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("login() stores the returned token and maps the flat AuthResponse into a User", async () => {
    // AuthResponse is flat - NOT nested under a "user" key.
    mockFetchOnce(200, {
      token: "jwt-abc",
      type: "Bearer",
      userId: "u1",
      email: "guest@stayease.com",
      name: "Guest One",
      role: "GUEST",
      tokenType: "Bearer",
    });

    const user = await api.login("guest@stayease.com", "pw");

    expect(user).toEqual({ id: "u1", email: "guest@stayease.com", name: "Guest One", role: "GUEST" });
    expect(window.localStorage.getItem("stayease.token")).toBe("jwt-abc");
  });

  it("sends the stored token as an Authorization header on subsequent requests", async () => {
    window.localStorage.setItem("stayease.token", "existing-token");
    mockFetchOnce(200, [
      { hotelId: "h1", hotelName: "Sunset Palm", cityName: "Goa", countryName: "India", starRating: 4, description: "", coverImageUrl: "", isActive: true, managerId: "m1" },
    ]);

    await api.searchHotels("Goa");

    const fetchMock = vi.mocked(fetch);
    const [, opts] = fetchMock.mock.calls[0];
    expect((opts?.headers as Record<string, string>)["Authorization"]).toBe("Bearer existing-token");
  });

  it("throws an ApiException with the backend's message on a non-2xx response", async () => {
    mockFetchOnce(401, { status: 401, error: "Unauthorized", message: "Invalid credentials" });

    await expect(api.login("guest@stayease.com", "wrong")).rejects.toMatchObject({
      message: "Invalid credentials",
      code: "Unauthorized",
    });
  });

  it("throws an ApiException instance specifically (not just any error)", async () => {
    mockFetchOnce(404, { status: 404, error: "Not Found", message: "Hotel not found" });

    await expect(api.getHotel("missing-id")).rejects.toBeInstanceOf(api.ApiException);
  });

  it("clearAuthToken() removes the stored token", () => {
    window.localStorage.setItem("stayease.token", "some-token");
    api.clearAuthToken();
    expect(window.localStorage.getItem("stayease.token")).toBeNull();
  });

  it("maps a hotel response into the frontend Hotel shape", async () => {
    mockFetchOnce(200, {
      hotelId: "h1",
      hotelName: "Sunset Palm",
      cityName: "Goa",
      countryName: "India",
      starRating: 4,
      description: "Beachfront",
      coverImageUrl: "cover.jpg",
      isActive: true,
      managerId: "m1",
      managerName: "Mgr",
    });

    const hotel = await api.getHotel("h1");

    expect(hotel.id).toBe("h1");
    expect(hotel.name).toBe("Sunset Palm");
    expect(hotel.city).toBe("Goa");
    expect(hotel.managerName).toBe("Mgr");
    // The backend has no amenities/totalRooms fields on HotelResponse.
    expect(hotel.amenities).toEqual([]);
  });

  it("searchHotels rejects an empty city instead of calling the backend", async () => {
    await expect(api.searchHotels("")).rejects.toMatchObject({ code: "CITY_REQUIRED" });
    await expect(api.searchHotels("   ")).rejects.toMatchObject({ code: "CITY_REQUIRED" });
  });

  it("createBooking sends checkInDate/checkOutDate (not checkIn/checkOut) and no customerId", async () => {
    mockFetchOnce(201, {
      bookingId: "b1",
      bookingReference: "BK-1",
      customerId: "u1",
      roomId: "r1",
      hotelId: "h1",
      checkInDate: "2027-01-01",
      checkOutDate: "2027-01-03",
      numberOfGuests: 2,
      bookingStatus: "CONFIRMED",
      totalAmount: 5000,
    });

    const booking = await api.createBooking("u1", "r1", "2027-01-01", "2027-01-03", 2);

    expect(booking.bookingRef).toBe("BK-1");
    expect(booking.totalPrice).toBe(5000);

    const fetchMock = vi.mocked(fetch);
    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts?.body as string);
    expect(body.checkInDate).toBe("2027-01-01");
    expect(body.checkOutDate).toBe("2027-01-03");
    expect(body.checkIn).toBeUndefined();
    expect(body.customerId).toBeUndefined();
  });

  it("getMyBookings maps customerName into guestName and embeds roomNumber/roomType", async () => {
    mockFetchOnce(200, [
      {
        bookingId: "b1",
        bookingReference: "BK-1",
        customerId: "u1",
        customerName: "Guest One",
        roomId: "r1",
        roomNumber: "101",
        roomType: "SINGLE",
        hotelId: "h1",
        hotelName: "Sunset Palm",
        checkInDate: "2027-01-01",
        checkOutDate: "2027-01-03",
        numberOfGuests: 1,
        bookingStatus: "CONFIRMED",
        totalAmount: 2000,
      },
    ]);

    const bookings = await api.getMyBookings();

    expect(bookings[0].guestName).toBe("Guest One");
    expect(bookings[0].roomNumber).toBe("101");
    expect(bookings[0].roomType).toBe("SINGLE");
    expect(bookings[0].hotelName).toBe("Sunset Palm");
  });

  it("changePassword is not supported by this backend and rejects without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.changePassword("oldpw", "newpw123")).rejects.toMatchObject({ code: "NOT_SUPPORTED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("getAvailableRooms maps the plain room array and sends checkIn/checkOut query params", async () => {
    mockFetchOnce(200, [
      { roomId: "r1", roomNumber: "101", roomType: "SINGLE", roomDescription: "", pricePerNight: 2500, maxOccupancy: 1, roomImageUrl: "", isAvailable: true, hotelId: "h1" },
    ]);

    const rooms = await api.getAvailableRooms("h1", "2027-01-01", "2027-01-03", 2);

    expect(rooms).toHaveLength(1);
    expect(rooms[0].id).toBe("r1");
    const fetchMock = vi.mocked(fetch);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("checkIn=2027-01-01");
    expect(String(url)).toContain("checkOut=2027-01-03");
  });

  it("getHotelRooms (manager inventory view) maps every room in the list", async () => {
    mockFetchOnce(200, [
      { roomId: "r1", hotelId: "h1", roomNumber: "101", roomType: "SINGLE", roomDescription: "", pricePerNight: 2500, maxOccupancy: 1, roomImageUrl: "", isAvailable: true },
      { roomId: "r2", hotelId: "h1", roomNumber: "102", roomType: "DOUBLE", roomDescription: "", pricePerNight: 3000, maxOccupancy: 2, roomImageUrl: "", isAvailable: false },
    ]);

    const rooms = await api.getHotelRooms("h1");

    expect(rooms).toHaveLength(2);
    expect(rooms[1].isActive).toBe(false);
    const fetchMock = vi.mocked(fetch);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/manager/hotels/h1/rooms");
  });

  it("createRoom sends the mapped request body (roomDescription/roomImageUrl/isAvailable)", async () => {
    mockFetchOnce(201, { roomId: "r1", hotelId: "h1", roomNumber: "101", roomType: "SINGLE", roomDescription: "", pricePerNight: 2500, maxOccupancy: 1, roomImageUrl: "", isAvailable: true });

    await api.createRoom({ hotelId: "h1", roomNumber: "101", roomType: "SINGLE", pricePerNight: 2500, maxOccupancy: 1, description: "cozy", imageUrl: "img.jpg", isActive: true });

    const fetchMock = vi.mocked(fetch);
    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts?.body as string);
    expect(body.roomDescription).toBe("cozy");
    expect(body.roomImageUrl).toBe("img.jpg");
    expect(body.isAvailable).toBe(true);
    expect(body.hotelId).toBeUndefined();
  });

  it("setRoomStatus PATCHes isAvailable as a query param, not a body field", async () => {
    mockFetchOnce(200, { roomId: "r1", hotelId: "h1", roomNumber: "101", roomType: "SINGLE", roomDescription: "", pricePerNight: 2500, maxOccupancy: 1, roomImageUrl: "", isAvailable: false });

    const updated = await api.setRoomStatus("r1", false);

    expect(updated.isActive).toBe(false);
    const fetchMock = vi.mocked(fetch);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(opts?.method).toBe("PATCH");
    expect(String(url)).toContain("isAvailable=false");
    expect(opts?.body).toBeUndefined();
  });

  it("deleteHotel sends a DELETE to the right endpoint", async () => {
    mockFetchOnce(204, "", "text/plain");

    await api.deleteHotel("h1");

    const fetchMock = vi.mocked(fetch);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/hotels/h1");
    expect(opts?.method).toBe("DELETE");
  });

  it("getHotelBookings filters the manager's all-hotels list down to one hotel", async () => {
    mockFetchOnce(200, [
      { bookingId: "b1", bookingReference: "BK-1", customerId: "u1", roomId: "r1", hotelId: "h1", checkInDate: "2027-01-01", checkOutDate: "2027-01-03", numberOfGuests: 1, bookingStatus: "CONFIRMED", totalAmount: 2000 },
      { bookingId: "b2", bookingReference: "BK-2", customerId: "u2", roomId: "r2", hotelId: "h2", checkInDate: "2027-01-01", checkOutDate: "2027-01-03", numberOfGuests: 1, bookingStatus: "CONFIRMED", totalAmount: 3000 },
    ]);

    const bookings = await api.getHotelBookings("h1");

    expect(bookings).toHaveLength(1);
    expect(bookings[0].hotelId).toBe("h1");
  });

  it("getBooking finds the booking by id from the 'mine' list (no single-booking endpoint exists)", async () => {
    mockFetchOnce(200, [
      { bookingId: "b1", bookingReference: "BK-1", customerId: "u1", roomId: "r1", hotelId: "h1", checkInDate: "2027-01-01", checkOutDate: "2027-01-03", numberOfGuests: 1, bookingStatus: "CONFIRMED", totalAmount: 2000 },
    ]);

    const booking = await api.getBooking("b1");

    expect(booking.bookingRef).toBe("BK-1");
  });

  it("getRoomsByIds fans out and silently drops ids that fail to resolve", async () => {
    mockFetchSequence(
      { status: 200, body: { roomId: "r1", hotelId: "h1", roomNumber: "101", roomType: "SINGLE", roomDescription: "", pricePerNight: 2500, maxOccupancy: 1, roomImageUrl: "", isAvailable: true } },
      { status: 404, body: { status: 404, error: "Not Found", message: "Room not found" } }
    );

    const rooms = await api.getRoomsByIds(["r1", "missing"]);

    expect(rooms).toHaveLength(1);
    expect(rooms[0].id).toBe("r1");
  });

  it("getHotelsByIds fans out and silently drops ids that fail to resolve", async () => {
    mockFetchSequence(
      { status: 200, body: { hotelId: "h1", hotelName: "Sunset Palm", cityName: "Goa", countryName: "India", starRating: 4, description: "", coverImageUrl: "", isActive: true, managerId: "m1" } },
      { status: 404, body: { status: 404, error: "Not Found", message: "Hotel not found" } }
    );

    const hotels = await api.getHotelsByIds(["h1", "missing"]);

    expect(hotels).toHaveLength(1);
    expect(hotels[0].id).toBe("h1");
  });

  it("createHotel sends hotelName/cityName/countryName field names", async () => {
    mockFetchOnce(201, { hotelId: "h1", hotelName: "Sunset Palm", cityName: "Goa", countryName: "India", starRating: 4, description: "", coverImageUrl: "", isActive: true, managerId: "m1" });

    await api.createHotel({ name: "Sunset Palm", city: "Goa", starRating: 4, description: "", coverImageUrl: "", managerId: "m1" });

    const fetchMock = vi.mocked(fetch);
    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts?.body as string);
    expect(body.hotelName).toBe("Sunset Palm");
    expect(body.cityName).toBe("Goa");
    expect(body.managerId).toBe("m1");
  });
});
