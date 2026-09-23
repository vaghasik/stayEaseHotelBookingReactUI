import { useEffect, useState } from "react";
import * as api from "../services/api";
import { ApiException } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Booking, Hotel, Room } from "../types";
import { formatRoomType } from "../utils/format";

export default function MyStays() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hotels, setHotels] = useState<Record<string, Hotel>>({});
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const myBookings = await api.getMyBookings(user.id);
      myBookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setBookings(myBookings);

      const hotelList = await api.getHotelsByIds([...new Set(myBookings.map((b) => b.hotelId))]);
      const roomList = await api.getRoomsByIds([...new Set(myBookings.map((b) => b.roomId))]);
      setHotels(Object.fromEntries(hotelList.map((h) => [h.id, h])));
      setRooms(Object.fromEntries(roomList.map((r) => [r.id, r])));
    } catch (e) {
      setBookings([]);
      setError(e instanceof ApiException ? e.message : "Couldn't load your bookings. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleCancel(bookingId: string) {
    setCancellingId(bookingId);
    try {
      await api.cancelBooking(bookingId);
      await load();
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Couldn't cancel this booking. Try again.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="container" style={{ padding: "40px 24px 80px", maxWidth: 820 }}>
      <span className="eyebrow">Your bookings</span>
      <h1 style={{ fontSize: "1.9rem", marginTop: 8 }}>My Stays</h1>

      {loading && <p style={{ marginTop: 24, color: "var(--ink-soft)" }}>Loading…</p>}

      {error && <p className="error-text" style={{ marginTop: 16 }}>{error}</p>}

      {!loading && !error && bookings.length === 0 && (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <p>You haven't booked a stay yet.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
        {bookings.map((b) => {
          const hotel = hotels[b.hotelId];
          const room = rooms[b.roomId];
          const nights = Math.round(
            (new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / 86_400_000
          );
          return (
            <div key={b.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span className="eyebrow">{hotel?.city}</span>
                  <h3 style={{ fontSize: "1.15rem", marginTop: 4 }}>{hotel?.name}</h3>
                  <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", marginTop: 4 }}>
                    {room && formatRoomType(room.roomType)} · Room {room?.roomNumber}
                  </p>
                </div>
                <span className={`status-tag status-${b.status.toLowerCase()}`}>{b.status}</span>
              </div>

              <div className="hairline" style={{ margin: "16px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="mono" style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                  {b.checkInDate} → {b.checkOutDate} · {nights} night{nights !== 1 ? "s" : ""} · Ref {b.bookingRef}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span className="mono" style={{ fontWeight: 600 }}>
                    ₹{b.totalPrice.toLocaleString("en-IN")}
                  </span>
                  {b.status === "CONFIRMED" && (
                    <button
                      className="btn btn-rust btn-sm"
                      onClick={() => handleCancel(b.id)}
                      disabled={cancellingId === b.id}
                    >
                      {cancellingId === b.id ? "Cancelling…" : "Cancel"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
