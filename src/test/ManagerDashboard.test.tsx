import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ManagerDashboard from "../pages/ManagerDashboard";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Booking, Hotel, Room } from "../types";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof api>("../services/api");
  return {
    ...actual,
    getMyHotels: vi.fn(),
    getHotelRooms: vi.fn(),
    getHotelBookings: vi.fn(),
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
    deleteRoom: vi.fn(),
    setRoomStatus: vi.fn(),
  };
});

vi.mock("../context/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("../context/AuthContext")>("../context/AuthContext");
  return { ...actual, useAuth: vi.fn() };
});

const manager = { id: "mgr1", email: "mgr1@stayease.com", name: "Manager One", role: "MANAGER" as const };

const hotelA: Hotel = { id: "a", name: "Sunset Palm", city: "Goa", starRating: 4, description: "", coverImageUrl: "", managerId: "mgr1" };
const hotelB: Hotel = { id: "b", name: "Palm Grove Resort", city: "Goa", starRating: 5, description: "", coverImageUrl: "", managerId: "mgr1" };

function testRoom(id: string, hotelId: string, roomNumber: string): Room {
  return { id, hotelId, roomNumber, roomType: "SINGLE", pricePerNight: 2000, maxOccupancy: 2, description: "", imageUrl: "", isActive: true };
}

function testBooking(id: string, roomId: string, guestName: string): Booking {
  return { id, bookingRef: `BK-${id}`, hotelId: "a", roomId, guestId: "g1", guestName, checkInDate: "2027-06-01", checkOutDate: "2027-06-03", totalPrice: 4000, status: "CONFIRMED", createdAt: "2027-05-01" };
}

function renderDash(initialPath = "/manager") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ManagerDashboard />
    </MemoryRouter>
  );
}

describe("ManagerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: manager, loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn() });
  });

  it("renders all hotels returned by getMyHotels as switcher tabs", async () => {
    // getMyHotels is backed by GET /api/manager/hotels, which the backend
    // already scopes to the current user - the frontend no longer needs to
    // filter by managerId itself.
    vi.mocked(api.getMyHotels).mockResolvedValue([hotelA, hotelB]);
    vi.mocked(api.getHotelRooms).mockResolvedValue([]);
    vi.mocked(api.getHotelBookings).mockResolvedValue([]);

    renderDash();

    await waitFor(() => expect(screen.getByRole("heading", { name: "Sunset Palm" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Palm Grove Resort/ })).toBeInTheDocument();
  });

  it("shows only the selected hotel's own rooms, not another hotel's", async () => {
    vi.mocked(api.getMyHotels).mockResolvedValue([hotelA, hotelB]);
    vi.mocked(api.getHotelRooms).mockImplementation(async (hotelId) =>
      hotelId === "a" ? [testRoom("r1", "a", "101")] : [testRoom("r2", "b", "201")]
    );
    vi.mocked(api.getHotelBookings).mockResolvedValue([]);
    const user = userEvent.setup();

    renderDash();

    await waitFor(() => expect(screen.getByText(/Room 101/)).toBeInTheDocument());
    expect(screen.queryByText(/Room 201/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Palm Grove Resort/ }));

    await waitFor(() => expect(screen.getByText(/Room 201/)).toBeInTheDocument());
    expect(screen.queryByText(/Room 101/)).not.toBeInTheDocument();
  });

  it("shows no hotel switcher when the manager only has one hotel", async () => {
    vi.mocked(api.getMyHotels).mockResolvedValue([hotelA]);
    vi.mocked(api.getHotelRooms).mockResolvedValue([]);
    vi.mocked(api.getHotelBookings).mockResolvedValue([]);

    renderDash();

    await waitFor(() => expect(screen.getByRole("heading", { name: "Sunset Palm" })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Sunset Palm/ })).not.toBeInTheDocument();
  });

  it("shows 'no hotel assigned' when getMyHotels returns none", async () => {
    vi.mocked(api.getMyHotels).mockResolvedValue([]);

    renderDash();

    await waitFor(() => expect(screen.getByText(/No hotel assigned/)).toBeInTheDocument());
  });

  it("shows the guest's name on each upcoming booking", async () => {
    vi.mocked(api.getMyHotels).mockResolvedValue([hotelA]);
    vi.mocked(api.getHotelRooms).mockResolvedValue([testRoom("r1", "a", "101")]);
    vi.mocked(api.getHotelBookings).mockResolvedValue([testBooking("bk1", "r1", "Priya Sharma")]);

    renderDash();

    await waitFor(() => expect(screen.getByText("Priya Sharma")).toBeInTheDocument());
  });

  it("shows the room type alongside the room number on each upcoming booking", async () => {
    vi.mocked(api.getMyHotels).mockResolvedValue([hotelA]);
    vi.mocked(api.getHotelRooms).mockResolvedValue([{ ...testRoom("r1", "a", "101"), roomType: "DELUXE" }]);
    vi.mocked(api.getHotelBookings).mockResolvedValue([testBooking("bk1", "r1", "Priya Sharma")]);

    renderDash();

    await waitFor(() => expect(screen.getByText(/Deluxe · Room 101/)).toBeInTheDocument());
  });

  it("filters out cancelled and past bookings from the upcoming list", async () => {
    vi.mocked(api.getMyHotels).mockResolvedValue([hotelA]);
    vi.mocked(api.getHotelRooms).mockResolvedValue([testRoom("r1", "a", "101")]);
    vi.mocked(api.getHotelBookings).mockResolvedValue([
      { ...testBooking("bk1", "r1", "Upcoming Guest"), checkOutDate: "2099-01-01" },
      { ...testBooking("bk2", "r1", "Cancelled Guest"), status: "CANCELLED" },
      { ...testBooking("bk3", "r1", "Past Guest"), checkOutDate: "2000-01-01" },
    ]);

    renderDash();

    await waitFor(() => expect(screen.getByText("Upcoming Guest")).toBeInTheDocument());
    expect(screen.queryByText("Cancelled Guest")).not.toBeInTheDocument();
    expect(screen.queryByText("Past Guest")).not.toBeInTheDocument();
  });

  it("creates a room scoped to the currently selected hotel", async () => {
    vi.mocked(api.getMyHotels).mockResolvedValue([hotelA, hotelB]);
    vi.mocked(api.getHotelRooms).mockResolvedValue([]);
    vi.mocked(api.getHotelBookings).mockResolvedValue([]);
    vi.mocked(api.createRoom).mockResolvedValue(testRoom("new1", "b", "301"));
    const user = userEvent.setup();

    renderDash();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sunset Palm" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Palm Grove Resort/ }));
    await waitFor(() => expect(api.getHotelRooms).toHaveBeenCalledWith("b"));

    await user.click(screen.getByRole("button", { name: "+ Add room" }));
    await user.type(screen.getByLabelText("Room number"), "301");
    await user.type(screen.getByLabelText("Price / night (₹)"), "3000");
    await user.click(screen.getByRole("button", { name: "Create room" }));

    await waitFor(() =>
      expect(api.createRoom).toHaveBeenCalledWith(expect.objectContaining({ hotelId: "b", roomNumber: "301" }))
    );
  });

  it("toggles a room's active status", async () => {
    vi.mocked(api.getMyHotels).mockResolvedValue([hotelA]);
    vi.mocked(api.getHotelRooms).mockResolvedValue([testRoom("r1", "a", "101")]);
    vi.mocked(api.getHotelBookings).mockResolvedValue([]);
    vi.mocked(api.setRoomStatus).mockResolvedValue(testRoom("r1", "a", "101"));
    const user = userEvent.setup();

    renderDash();
    await waitFor(() => expect(screen.getByText(/Room 101/)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(api.setRoomStatus).toHaveBeenCalledWith("r1", false));
  });

  it("deletes a room", async () => {
    vi.mocked(api.getMyHotels).mockResolvedValue([hotelA]);
    vi.mocked(api.getHotelRooms).mockResolvedValue([testRoom("r1", "a", "101")]);
    vi.mocked(api.getHotelBookings).mockResolvedValue([]);
    vi.mocked(api.deleteRoom).mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderDash();
    await waitFor(() => expect(screen.getByText(/Room 101/)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.deleteRoom).toHaveBeenCalledWith("r1"));
  });
});
