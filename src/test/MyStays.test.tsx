import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MyStays from "../pages/MyStays";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Booking, Hotel, Room } from "../types";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof api>("../services/api");
  return { ...actual, getMyBookings: vi.fn(), getHotelsByIds: vi.fn(), getRoomsByIds: vi.fn(), cancelBooking: vi.fn() };
});

vi.mock("../context/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("../context/AuthContext")>("../context/AuthContext");
  return { ...actual, useAuth: vi.fn() };
});

const guest = { id: "u1", email: "g@x.com", name: "Guest One", role: "GUEST" as const };

function testBooking(id: string, status: Booking["status"] = "CONFIRMED"): Booking {
  return { id, bookingRef: `BK-${id}`, hotelId: "h1", roomId: "r1", guestId: "u1", checkInDate: "2027-06-01", checkOutDate: "2027-06-03", totalPrice: 5000, status, createdAt: "2027-05-01" };
}

const hotel: Hotel = { id: "h1", name: "Sunset Palm", city: "Goa", starRating: 4, description: "", coverImageUrl: "", managerId: "m1" };
const room: Room = { id: "r1", hotelId: "h1", roomNumber: "101", roomType: "SINGLE", pricePerNight: 2500, maxOccupancy: 2, description: "", imageUrl: "", isActive: true };

function renderMyStays() {
  return render(
    <MemoryRouter>
      <MyStays />
    </MemoryRouter>
  );
}

describe("MyStays", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: guest, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn() });
  });

  it("shows the guest's own bookings with hotel and room details", async () => {
    vi.mocked(api.getMyBookings).mockResolvedValue([testBooking("bk1")]);
    vi.mocked(api.getHotelsByIds).mockResolvedValue([hotel]);
    vi.mocked(api.getRoomsByIds).mockResolvedValue([room]);

    renderMyStays();

    await waitFor(() => expect(screen.getByText("Sunset Palm")).toBeInTheDocument());
    expect(screen.getByText("BK-bk1", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("₹5,000")).toBeInTheDocument();
  });

  it("shows an empty state when there are no bookings", async () => {
    vi.mocked(api.getMyBookings).mockResolvedValue([]);
    vi.mocked(api.getHotelsByIds).mockResolvedValue([]);
    vi.mocked(api.getRoomsByIds).mockResolvedValue([]);

    renderMyStays();

    await waitFor(() => expect(screen.getByText("You haven't booked a stay yet.")).toBeInTheDocument());
  });

  it("shows a Cancel button only for CONFIRMED bookings", async () => {
    vi.mocked(api.getMyBookings).mockResolvedValue([testBooking("bk1", "CONFIRMED"), testBooking("bk2", "CANCELLED")]);
    vi.mocked(api.getHotelsByIds).mockResolvedValue([hotel]);
    vi.mocked(api.getRoomsByIds).mockResolvedValue([room]);

    renderMyStays();

    await waitFor(() => expect(screen.getAllByText("Sunset Palm")).toHaveLength(2));
    expect(screen.getAllByRole("button", { name: /cancel/i })).toHaveLength(1);
  });

  it("cancels a booking and reloads the list", async () => {
    vi.mocked(api.getMyBookings)
      .mockResolvedValueOnce([testBooking("bk1", "CONFIRMED")])
      .mockResolvedValueOnce([testBooking("bk1", "CANCELLED")]);
    vi.mocked(api.getHotelsByIds).mockResolvedValue([hotel]);
    vi.mocked(api.getRoomsByIds).mockResolvedValue([room]);
    vi.mocked(api.cancelBooking).mockResolvedValue(testBooking("bk1", "CANCELLED"));
    const user = userEvent.setup();

    renderMyStays();

    await waitFor(() => expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => expect(api.cancelBooking).toHaveBeenCalledWith("bk1"));
    await waitFor(() => expect(api.getMyBookings).toHaveBeenCalledTimes(2));
  });

  it("shows an error message when loading bookings fails", async () => {
    const { ApiException } = await vi.importActual<typeof api>("../services/api");
    vi.mocked(api.getMyBookings).mockRejectedValue(new ApiException("SERVER_ERROR", "Something went wrong"));

    renderMyStays();

    await waitFor(() => expect(screen.getByText("Something went wrong")).toBeInTheDocument());
  });
});
