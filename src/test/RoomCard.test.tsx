import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RoomCard from "../components/RoomCard";
import type { Room } from "../types";
import { defaultRoomImage } from "../utils/format";

const room: Room = {
  id: "r1",
  hotelId: "h1",
  roomNumber: "101",
  roomType: "SINGLE",
  pricePerNight: 2500,
  maxOccupancy: 1,
  description: "Cosy single room",
  imageUrl: "https://example.com/broken.jpg",
  isActive: true,
};

describe("RoomCard", () => {
  it("renders room details and price", () => {
    render(<RoomCard room={room} onBook={vi.fn()} booking={false} />);
    expect(screen.getByText("Room 101")).toBeInTheDocument();
    expect(screen.getByText("Single")).toBeInTheDocument();
    expect(screen.getByText("₹2,500")).toBeInTheDocument();
    expect(screen.getByText("Sleeps 1")).toBeInTheDocument();
  });

  it("calls onBook with the room when the Book button is clicked", () => {
    const onBook = vi.fn();
    render(<RoomCard room={room} onBook={onBook} booking={false} />);
    fireEvent.click(screen.getByRole("button", { name: /book/i }));
    expect(onBook).toHaveBeenCalledWith(room);
  });

  it("disables the button and shows 'Booking…' while a booking is in flight", () => {
    render(<RoomCard room={room} onBook={vi.fn()} booking={true} />);
    const button = screen.getByRole("button", { name: /booking…/i });
    expect(button).toBeDisabled();
  });

  it("falls back to the per-type image if the room's image fails to load", () => {
    render(<RoomCard room={room} onBook={vi.fn()} booking={false} />);
    const img = screen.getByRole("img") as HTMLImageElement;
    fireEvent.error(img);
    expect(img.src).toContain(defaultRoomImage("SINGLE"));
  });
});
