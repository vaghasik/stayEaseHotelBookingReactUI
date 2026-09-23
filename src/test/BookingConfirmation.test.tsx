import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import BookingConfirmation from "../pages/BookingConfirmation";
import * as api from "../services/api";
import type { Booking, Hotel, Room } from "../types";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof api>("../services/api");
  return { ...actual, getBooking: vi.fn(), getHotel: vi.fn(), getRoom: vi.fn() };
});

const booking: Booking = {
  id: "b1", bookingRef: "BK-20270601-00001", hotelId: "h1", roomId: "r1", guestId: "u1",
  checkInDate: "2027-06-01", checkOutDate: "2027-06-04", totalPrice: 7500, status: "CONFIRMED", createdAt: "2027-05-01",
};
const hotel: Hotel = { id: "h1", name: "Sunset Palm", city: "Goa", starRating: 4, description: "", coverImageUrl: "", managerId: "m1" };
const room: Room = { id: "r1", hotelId: "h1", roomNumber: "205", roomType: "DELUXE", pricePerNight: 2500, maxOccupancy: 2, description: "", imageUrl: "", isActive: true };

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/booking-confirmation/:id" element={<BookingConfirmation />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("BookingConfirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the booking, hotel, room, reference, price, and correct night count", async () => {
    vi.mocked(api.getBooking).mockResolvedValue(booking);
    vi.mocked(api.getHotel).mockResolvedValue(hotel);
    vi.mocked(api.getRoom).mockResolvedValue(room);

    renderAt("/booking-confirmation/b1");

    await waitFor(() => expect(screen.getByText("Sunset Palm")).toBeInTheDocument());
    expect(screen.getByText("BK-20270601-00001")).toBeInTheDocument();
    expect(screen.getByText("₹7,500")).toBeInTheDocument();
    // 2027-06-01 -> 2027-06-04 is 3 nights
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/Deluxe/)).toBeInTheDocument();
  });

  it("shows 'Booking not found' when the booking can't be loaded", async () => {
    vi.mocked(api.getBooking).mockRejectedValue(new Error("404"));

    renderAt("/booking-confirmation/does-not-exist");

    await waitFor(() => expect(screen.getByText("Booking not found.")).toBeInTheDocument());
  });

  it("still renders the booking (without hotel/room details) if the hotel lookup fails", async () => {
    vi.mocked(api.getBooking).mockResolvedValue(booking);
    vi.mocked(api.getHotel).mockRejectedValue(new Error("not found"));
    vi.mocked(api.getRoom).mockResolvedValue(room);

    renderAt("/booking-confirmation/b1");

    await waitFor(() => expect(screen.getByText("BK-20270601-00001")).toBeInTheDocument());
    // Hotel name never resolved - the page shouldn't crash, it just omits it
    expect(screen.queryByText("Sunset Palm")).not.toBeInTheDocument();
  });

  it("links to My Stays and Browse more hotels", async () => {
    vi.mocked(api.getBooking).mockResolvedValue(booking);
    vi.mocked(api.getHotel).mockResolvedValue(hotel);
    vi.mocked(api.getRoom).mockResolvedValue(room);

    renderAt("/booking-confirmation/b1");

    await waitFor(() => expect(screen.getByText("Sunset Palm")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /view my stays/i })).toHaveAttribute("href", "/my-stays");
    expect(screen.getByRole("link", { name: /browse more hotels/i })).toHaveAttribute("href", "/hotels");
  });
});
