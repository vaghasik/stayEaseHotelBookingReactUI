import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import RoomCard from "../components/RoomCard";
import * as api from "../services/api";
import { ApiException } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { saveSearchPrefs } from "../utils/searchPrefs";
import { formatAmenity } from "../utils/amenities";
import type { Hotel, Room } from "../types";

const FALLBACK_IMAGE = "/images/hotel-placeholder.jpg";

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [heroImage, setHeroImage] = useState(FALLBACK_IMAGE);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingRoomId, setBookingRoomId] = useState<string | null>(null);

  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  // Kept in the URL (not just component state) so it survives a
  // navigation away and back - in particular the login redirect below.
  const guests = Number(searchParams.get("guests") || "1");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!id) return;
    api.getHotel(id).then(setHotel).catch(() => setHotel(null));
  }, [id]);

  // A CSS background-image has no built-in error handling the way an <img>
  // does, so a broken hotel.coverImageUrl would previously just render as
  // blank (only the gradient showing) instead of falling back to the
  // placeholder. Preload it in JS and only use it once it's confirmed to
  // actually load; otherwise stick with the local placeholder.
  useEffect(() => {
    if (!hotel?.coverImageUrl) {
      setHeroImage(FALLBACK_IMAGE);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setHeroImage(hotel.coverImageUrl);
    };
    img.onerror = () => {
      if (!cancelled) setHeroImage(FALLBACK_IMAGE);
    };
    img.src = hotel.coverImageUrl;
    return () => {
      cancelled = true;
    };
  }, [hotel?.coverImageUrl]);

  useEffect(() => {
    if (checkIn || checkOut) saveSearchPrefs({ checkIn, checkOut });
  }, [checkIn, checkOut]);

  useEffect(() => {
    if (!id || !checkIn || !checkOut) {
      // The availability endpoint requires both dates - nothing to fetch
      // yet, and calling it with blank dates would just 400.
      setRooms([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .getAvailableRooms(id, checkIn, checkOut, guests)
      .then((r) => {
        if (cancelled) return;
        setRooms(r);
      })
      .catch((e) => {
        if (cancelled) return;
        setRooms([]);
        setError(e instanceof ApiException ? e.message : "Couldn't load availability for these dates.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, checkIn, checkOut, guests]);

  function updateDates(field: "checkIn" | "checkOut" | "guests", value: string) {
    const params = new URLSearchParams(searchParams);
    params.set(field, value);
    setSearchParams(params);
  }

  async function handleBook(room: Room) {
    setError("");
    if (!checkIn || !checkOut) {
      setError("Choose check-in and check-out dates before booking.");
      return;
    }
    if (!user) {
      // Build the return URL as its own proper query string, then encode
      // the *whole thing* as a single "next" value - the previous version
      // concatenated raw, un-encoded query strings together
      // (`/login?next=/hotels/{id}?checkIn=...&checkOut=...`), which is
      // invalid: everything after the first "&" gets parsed as a sibling
      // query param on /login instead of part of "next", so checkOut (and
      // guests) silently got dropped and the person had to re-enter dates
      // after logging in.
      const returnParams = new URLSearchParams({ checkIn, checkOut, guests: String(guests) });
      const next = `/hotels/${id}?${returnParams.toString()}`;
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (guests > room.maxOccupancy) {
      setError(`This room sleeps up to ${room.maxOccupancy}. Lower the guest count or pick a bigger room.`);
      return;
    }
    setBookingRoomId(room.id);
    try {
      const booking = await api.createBooking(user.id, room.id, checkIn, checkOut, guests);
      navigate(`/booking-confirmation/${booking.id}`);
    } catch (e) {
      if (e instanceof ApiException) setError(e.message);
      else setError("Something went wrong creating the booking.");
      // Refresh availability since another booking may have just taken the room
      try {
        const refreshed = await api.getAvailableRooms(id!, checkIn, checkOut, guests);
        setRooms(refreshed);
      } catch {
        // ignore - the error above is already shown
      }
    } finally {
      setBookingRoomId(null);
    }
  }

  if (!hotel) {
    return <div className="container" style={{ padding: 60 }}>Loading hotel…</div>;
  }

  return (
    <div>
      <div
        style={{
          height: 260,
          background: `linear-gradient(180deg, rgba(22,33,31,0.15), rgba(22,33,31,0.55)), url('${heroImage}') center/cover`,
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <div className="container" style={{ paddingBottom: 24 }}>
          <div className="stars" style={{ color: "var(--brass-light)" }}>
            {"★".repeat(hotel.starRating)}
            <span style={{ color: "rgba(255,255,255,0.4)" }}>{"★".repeat(5 - hotel.starRating)}</span>
          </div>
          <h1 style={{ color: "#fff", fontSize: "2.2rem", marginTop: 6 }}>{hotel.name}</h1>
          <p className="eyebrow" style={{ color: "var(--brass-light)" }}>{hotel.city}</p>
        </div>
      </div>

      <div className="container" style={{ padding: "32px 24px 80px", display: "grid", gridTemplateColumns: "1fr 280px", gap: 40 }}>
        <div>
          <p style={{ color: "var(--ink-soft)", maxWidth: 640 }}>{hotel.description}</p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            {(hotel.amenities ?? []).map((a) => (
              <span
                key={a}
                className="mono"
                style={{
                  fontSize: "0.75rem",
                  border: "1px solid var(--line-strong)",
                  borderRadius: 20,
                  padding: "5px 12px",
                  color: "var(--ink-soft)",
                }}
              >
                {formatAmenity(a)}
              </span>
            ))}
          </div>

          <div className="hairline" style={{ margin: "28px 0" }} />

          <h2 style={{ fontSize: "1.4rem", marginBottom: 16 }}>Available rooms</h2>
          {error && (
            <p className="error-text" style={{ marginBottom: 16 }}>
              {error}
            </p>
          )}

          {loading && <p style={{ color: "var(--ink-soft)" }}>Checking availability…</p>}

          {!loading && rooms.length === 0 && (
            <p style={{ color: "var(--ink-soft)" }}>
              {checkIn && checkOut
                ? "No rooms available for these dates. Try different dates."
                : "Choose your dates to see available rooms."}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                booking={bookingRoomId === room.id}
                onBook={handleBook}
              />
            ))}
          </div>
        </div>

        <aside className="card" style={{ padding: 20, height: "fit-content", position: "sticky", top: 88 }}>
          <span className="eyebrow">Your dates</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <div className="field">
              <label htmlFor="d-checkin">Check-in</label>
              <input
                id="d-checkin"
                type="date"
                min={today}
                value={checkIn}
                onChange={(e) => updateDates("checkIn", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="d-checkout">Check-out</label>
              <input
                id="d-checkout"
                type="date"
                min={checkIn || today}
                value={checkOut}
                onChange={(e) => updateDates("checkOut", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="d-guests">Guests</label>
              <input
                id="d-guests"
                type="number"
                min={1}
                value={guests}
                onChange={(e) => updateDates("guests", String(Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
