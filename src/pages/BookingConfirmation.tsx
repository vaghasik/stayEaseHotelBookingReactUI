import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as api from "../services/api";
import type { Booking, Hotel, Room } from "../types";
import { formatRoomType } from "../utils/format";

export default function BookingConfirmation() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    if (!id) return;
    // Use real API lookup for a single booking
    api.getBooking(id).then((b) => {
      setBooking(b);
      api.getHotel(b.hotelId).then(setHotel).catch(() => setHotel(null));
      api.getRoom(b.roomId).then(setRoom).catch(() => setRoom(null));
    }).catch(() => setBooking(null));
  }, [id]);

  if (!booking) {
    return <div className="container" style={{ padding: 60 }}>Booking not found.</div>;
  }

  const nights = Math.round(
    (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86_400_000
  );

  return (
    <div className="container" style={{ maxWidth: 560, padding: "60px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <span className="eyebrow">Booking confirmed</span>
        <h1 style={{ fontSize: "2rem", marginTop: 8 }}>You're all set.</h1>
      </div>

      {/* Ticket stub */}
      <div className="card" style={{ boxShadow: "0 14px 40px rgba(22,33,31,0.14)", overflow: "hidden" }}>
        <div style={{ padding: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <span className="eyebrow">{hotel?.city}</span>
              <h2 style={{ fontSize: "1.5rem", marginTop: 4 }}>{hotel?.name}</h2>
            </div>
            <span className={`status-tag status-${booking.status.toLowerCase()}`}>
              {booking.status}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
            <div>
              <div className="eyebrow" style={{ fontSize: "0.65rem" }}>Check-in</div>
              <div className="mono" style={{ fontSize: "1.05rem", marginTop: 4 }}>{booking.checkInDate}</div>
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: "0.65rem" }}>Check-out</div>
              <div className="mono" style={{ fontSize: "1.05rem", marginTop: 4 }}>{booking.checkOutDate}</div>
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: "0.65rem" }}>Room</div>
              <div style={{ marginTop: 4 }}>{room && formatRoomType(room.roomType)} · No. {room?.roomNumber}</div>
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: "0.65rem" }}>Nights</div>
              <div style={{ marginTop: 4 }}>{nights}</div>
            </div>
          </div>
        </div>

        <div className="perforation">
          <span className="ticket-notch" style={{ left: -10 }} />
          <span className="ticket-notch" style={{ right: -10 }} />
        </div>

        <div style={{ padding: 26, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="eyebrow" style={{ fontSize: "0.65rem" }}>Booking reference</div>
            <div className="mono" style={{ fontSize: "1.3rem", fontWeight: 600, letterSpacing: "0.06em" }}>
              {booking.bookingRef}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="eyebrow" style={{ fontSize: "0.65rem" }}>Total price</div>
            <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 600 }}>
              ₹{booking.totalPrice.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28 }}>
        <Link to="/my-stays" className="btn btn-primary">View my stays</Link>
        <Link to="/hotels" className="btn btn-ghost">Browse more hotels</Link>
      </div>
    </div>
  );
}
