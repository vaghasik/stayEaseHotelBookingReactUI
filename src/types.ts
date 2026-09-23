export type Role = "GUEST" | "MANAGER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  hotelId?: string; // for managers
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  starRating: number;
  description: string;
  coverImageUrl: string;
  managerId: string;
  managerName?: string;
  totalRooms?: number;
  amenities?: string[];
  createdAt?: string;
}

// Must match com.stayease.enums.RoomType on the backend exactly - these
// values are sent/received as-is over the wire (Jakarta @Enumerated(STRING)).
export type RoomType = "SINGLE" | "DOUBLE" | "DELUXE" | "SUITE" | "FAMILY";

export interface Room {
  id: string;
  hotelId: string;
  roomNumber: string;
  roomType: RoomType;
  pricePerNight: number;
  maxOccupancy: number;
  description: string;
  imageUrl: string;
  isActive: boolean;
}

// Must match com.stayease.enums.BookingStatus on the backend. The app only
// ever creates bookings directly as CONFIRMED today (no pending-approval
// flow in the UI yet), but the type reflects every value the backend can
// actually return so status badges/comparisons don't silently mismatch.
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface Booking {
  id: string;
  bookingRef: string;
  hotelId: string;
  hotelName?: string;
  roomId: string;
  roomNumber?: string;
  roomType?: RoomType;
  guestId: string;
  guestName?: string;
  checkInDate: string; // ISO date
  checkOutDate: string;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
}

export interface ApiError {
  timestamp: string;
  path: string;
  error: string;
  message: string;
}
