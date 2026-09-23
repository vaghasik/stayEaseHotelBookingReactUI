import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HotelList from "../pages/HotelList";
import * as api from "../services/api";
import { saveSearchPrefs } from "../utils/searchPrefs";
import type { Hotel, Room } from "../types";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof api>("../services/api");
  return { ...actual, searchHotels: vi.fn(), getAvailableRooms: vi.fn(), getHotelRooms: vi.fn() };
});

const hotelA: Hotel = { id: "a", name: "Sunset Palm", city: "Goa", starRating: 4, description: "", coverImageUrl: "", managerId: "m1" };
const hotelB: Hotel = { id: "b", name: "Palm Grove Resort", city: "Goa", starRating: 5, description: "", coverImageUrl: "", managerId: "m2" };

function room(id: string, price: number): Room {
  return { id, hotelId: "x", roomNumber: "1", roomType: "SINGLE", pricePerNight: price, maxOccupancy: 2, description: "", imageUrl: "", isActive: true };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <HotelList />
    </MemoryRouter>
  );
}

describe("HotelList", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("hides a fully-booked hotel when dates are selected, instead of showing it with no price", async () => {
    vi.mocked(api.searchHotels).mockResolvedValue([hotelA, hotelB]);
    // hotelA is fully booked for these dates (no available rooms); hotelB has one.
    vi.mocked(api.getAvailableRooms).mockImplementation(async (hotelId) =>
      hotelId === "a" ? [] : [room("r1", 12000)]
    );

    renderAt("/hotels?city=Goa&checkIn=2027-03-10&checkOut=2027-03-12");

    await waitFor(() => expect(screen.queryByText("Loading hotels…")).not.toBeInTheDocument());

    expect(screen.queryByText("Sunset Palm")).not.toBeInTheDocument();
    expect(screen.getByText("Palm Grove Resort")).toBeInTheDocument();
    expect(screen.getByText("₹12,000")).toBeInTheDocument();
  });

  it("shows all hotels when no dates are selected, even ones with zero rooms", async () => {
    vi.mocked(api.searchHotels).mockResolvedValue([hotelA, hotelB]);
    vi.mocked(api.getAvailableRooms).mockResolvedValue([]);

    renderAt("/hotels?city=Goa");

    await waitFor(() => expect(screen.queryByText("Loading hotels…")).not.toBeInTheDocument());

    expect(screen.getByText("Sunset Palm")).toBeInTheDocument();
    expect(screen.getByText("Palm Grove Resort")).toBeInTheDocument();
  });

  it("falls back to the remembered search when arriving with no query string at all", async () => {
    saveSearchPrefs({ city: "Goa", checkIn: "2027-04-01", checkOut: "2027-04-03" });
    vi.mocked(api.searchHotels).mockResolvedValue([hotelB]);
    vi.mocked(api.getAvailableRooms).mockResolvedValue([room("r1", 9000)]);

    renderAt("/hotels");

    await waitFor(() => expect(screen.getByText("Palm Grove Resort")).toBeInTheDocument());
    expect(api.searchHotels).toHaveBeenCalledWith("Goa");
  });

  it("does NOT override an explicit empty search with a remembered one", async () => {
    saveSearchPrefs({ city: "Goa", checkIn: "2027-04-01", checkOut: "2027-04-03" });
    vi.mocked(api.searchHotels).mockResolvedValue([hotelA, hotelB]);
    vi.mocked(api.getAvailableRooms).mockResolvedValue([]);

    // Arriving with an explicit (even if empty-valued) query string is a
    // deliberate search, not "no search at all" - it must not be overridden
    // by the remembered Goa search. An empty city means no API call at all
    // (the backend has no public "browse all" endpoint), so the prompt to
    // enter a city should show instead of the remembered Goa results.
    renderAt("/hotels?city=");

    await waitFor(() => expect(screen.queryByText("Loading hotels…")).not.toBeInTheDocument());
    expect(api.searchHotels).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a city above to search for hotels.")).toBeInTheDocument();
    expect(screen.queryByText("Sunset Palm")).not.toBeInTheDocument();
  });

  it("shows a validation error instead of searching when check-out is before check-in", async () => {
    vi.mocked(api.searchHotels).mockResolvedValue([]);
    const user = userEvent.setup();
    renderAt("/hotels?city=Goa");
    await waitFor(() => expect(screen.queryByText("Loading hotels…")).not.toBeInTheDocument());

    await user.type(screen.getByLabelText("Check-in"), "2027-06-10");
    await user.type(screen.getByLabelText("Check-out"), "2027-06-05");
    await user.click(screen.getByRole("button", { name: /update search/i }));

    expect(screen.getByText("Check-out date must be after check-in date.")).toBeInTheDocument();
  });

  it("shows the no-results message when the city has no hotels", async () => {
    vi.mocked(api.searchHotels).mockResolvedValue([]);
    renderAt("/hotels?city=Nowhere");
    await waitFor(() => expect(screen.getByText(/No hotels match/)).toBeInTheDocument());
  });
});
