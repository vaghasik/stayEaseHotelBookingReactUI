import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import HotelDetail from "../pages/HotelDetail";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Hotel, Room } from "../types";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof api>("../services/api");
  return { ...actual, getHotel: vi.fn(), getAvailableRooms: vi.fn(), createBooking: vi.fn() };
});

vi.mock("../context/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("../context/AuthContext")>("../context/AuthContext");
  return { ...actual, useAuth: vi.fn() };
});

const hotel: Hotel = {
  id: "h1", name: "Sunset Palm", city: "Goa", starRating: 4,
  description: "A breezy beachfront hotel", coverImageUrl: "",
  managerId: "m1", amenities: ["WIFI", "POOL"],
};

function testRoom(id: string, maxOccupancy = 2): Room {
  return { id, hotelId: "h1", roomNumber: "101", roomType: "SINGLE", pricePerNight: 2500, maxOccupancy, description: "", imageUrl: "", isActive: true };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/hotels/:id" element={<HotelDetail />} />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/booking-confirmation/:id" element={<div>BOOKING CONFIRMED</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("HotelDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getHotel).mockResolvedValue(hotel);
  });

  it("shows the hotel's amenities as friendly labels", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn() });
    vi.mocked(api.getAvailableRooms).mockResolvedValue([]);

    renderAt("/hotels/h1");

    await waitFor(() => expect(screen.getByText("Sunset Palm")).toBeInTheDocument());
    expect(screen.getByText("Free Wi-Fi")).toBeInTheDocument();
    expect(screen.getByText("Swimming Pool")).toBeInTheDocument();
  });

  it("preserves checkIn, checkOut, and guests through the login redirect (decoded)", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn() });
    vi.mocked(api.getAvailableRooms).mockResolvedValue([testRoom("r1")]);
    const user = userEvent.setup();

    let capturedPath = "";
    function LoginCapture() {
      const location = useLocation();
      capturedPath = location.pathname + location.search;
      return <div>LOGIN PAGE</div>;
    }

    render(
      <MemoryRouter initialEntries={["/hotels/h1?checkIn=2027-05-10&checkOut=2027-05-12&guests=2"]}>
        <Routes>
          <Route path="/hotels/:id" element={<HotelDetail />} />
          <Route path="/login" element={<LoginCapture />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Room 101")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /book/i }));
    await waitFor(() => expect(screen.getByText("LOGIN PAGE")).toBeInTheDocument());

    const search = new URLSearchParams(capturedPath.split("?")[1] ?? "");
    const next = decodeURIComponent(search.get("next") ?? "");
    const nextParams = new URLSearchParams(next.split("?")[1] ?? "");
    expect(nextParams.get("checkIn")).toBe("2027-05-10");
    expect(nextParams.get("checkOut")).toBe("2027-05-12");
    expect(nextParams.get("guests")).toBe("2");
  });

  it("books directly (no redirect) when already logged in", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", email: "g@x.com", name: "Guest", role: "GUEST" },
      loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(),
    });
    vi.mocked(api.getAvailableRooms).mockResolvedValue([testRoom("r1")]);
    vi.mocked(api.createBooking).mockResolvedValue({
      id: "b1", bookingRef: "BK-1", hotelId: "h1", roomId: "r1", guestId: "u1",
      checkInDate: "2027-05-10", checkOutDate: "2027-05-12", totalPrice: 5000,
      status: "CONFIRMED", createdAt: "2027-05-01",
    });
    const user = userEvent.setup();

    renderAt("/hotels/h1?checkIn=2027-05-10&checkOut=2027-05-12&guests=1");

    await waitFor(() => expect(screen.getByText("Room 101")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /book/i }));

    await waitFor(() => expect(screen.getByText("BOOKING CONFIRMED")).toBeInTheDocument());
    expect(api.createBooking).toHaveBeenCalledWith("u1", "r1", "2027-05-10", "2027-05-12", 1);
  });

  it("rejects booking with a clear error when guests exceed the room's max occupancy", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", email: "g@x.com", name: "Guest", role: "GUEST" },
      loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(),
    });
    vi.mocked(api.getAvailableRooms).mockResolvedValue([testRoom("r1", 1)]);
    const user = userEvent.setup();

    renderAt("/hotels/h1?checkIn=2027-05-10&checkOut=2027-05-12&guests=3");

    await waitFor(() => expect(screen.getByText("Room 101")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /book/i }));

    expect(await screen.findByText(/sleeps up to 1/i)).toBeInTheDocument();
    expect(api.createBooking).not.toHaveBeenCalled();
  });

  it("shows a 'no rooms' message distinguishing no-dates from no-availability", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn() });

    renderAt("/hotels/h1");
    await waitFor(() => expect(screen.getByText("Choose your dates to see available rooms.")).toBeInTheDocument());
  });
});
