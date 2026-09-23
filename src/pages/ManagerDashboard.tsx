import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import * as api from "../services/api";
import { ApiException } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatRoomType, defaultRoomImage, ROOM_TYPE_OPTIONS } from "../utils/format";
import type { Booking, Hotel, Room, RoomType } from "../types";

function makeEmptyForm() {
  return {
    roomNumber: "",
    roomType: "SINGLE" as RoomType,
    pricePerNight: "",
    maxOccupancy: "1",
    description: "",
    // Defaults to a type-appropriate local placeholder rather than one
    // single hardcoded external URL shared by every room type - update
    // this alongside the room type below (see the room-type <select>'s
    // onChange) so a new room's default image actually matches what's
    // selected.
    imageUrl: defaultRoomImage("SINGLE"),
  };
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // The backend has no concept of "the hotel(s) this user manages" on the
  // User/auth response - a hotel just has a managerId, and one manager can
  // be assigned to more than one hotel. So we resolve every hotel whose
  // managerId matches us here, rather than assuming there's only one.
  const [myHotels, setMyHotels] = useState<Hotel[]>([]);
  const [resolvingHotels, setResolvingHotels] = useState(true);

  const selectedHotelId = searchParams.get("hotel") || myHotels[0]?.id || "";
  const selectedHotel = myHotels.find((h) => h.id === selectedHotelId) ?? null;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(makeEmptyForm());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setResolvingHotels(true);
    api
      .getMyHotels()
      .then((hotels) => {
        if (cancelled) return;
        setMyHotels(hotels);
      })
      .catch(() => {
        if (!cancelled) setMyHotels([]);
      })
      .finally(() => {
        if (!cancelled) setResolvingHotels(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  function selectHotel(hotelId: string) {
    const params = new URLSearchParams(searchParams);
    params.set("hotel", hotelId);
    setSearchParams(params);
    setShowForm(false);
  }

  async function load() {
    if (!selectedHotelId) return;
    setLoading(true);
    setError("");
    try {
      const [roomList, bookingList] = await Promise.all([
        api.getHotelRooms(selectedHotelId),
        api.getHotelBookings(selectedHotelId),
      ]);
      setRooms(roomList);
      setBookings(
        bookingList.filter(
          (b) => b.status === "CONFIRMED" && b.checkOutDate >= new Date().toISOString().split("T")[0]
        )
      );
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Couldnot load rooms and bookings for this hotel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHotelId]);

  function startCreate() {
    setForm(makeEmptyForm());
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(room: Room) {
    setForm({
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      pricePerNight: String(room.pricePerNight),
      maxOccupancy: String(room.maxOccupancy),
      description: room.description,
      imageUrl: room.imageUrl,
    });
    setEditingId(room.id);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedHotelId) return;
    setError("");
    const payload = {
      hotelId: selectedHotelId,
      roomNumber: form.roomNumber,
      roomType: form.roomType,
      pricePerNight: Number(form.pricePerNight),
      maxOccupancy: Number(form.maxOccupancy),
      description: form.description,
      imageUrl: form.imageUrl,
      isActive: true,
    };
    try {
      if (editingId) {
        await api.updateRoom(editingId, payload);
      } else {
        await api.createRoom(payload);
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Couldn't save this room.");
    }
  }

  async function handleDelete(roomId: string) {
    try {
      await api.deleteRoom(roomId);
      await load();
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Couldn't delete this room.");
    }
  }

  async function handleToggle(room: Room) {
    try {
      await api.setRoomStatus(room.id, !room.isActive);
      await load();
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Couldn't update this room's status.");
    }
  }

  if (resolvingHotels) {
    return <div className="container" style={{ padding: 60 }}>Loading your hotels…</div>;
  }

  if (myHotels.length === 0) {
    return <div className="container" style={{ padding: 60 }}>No hotel assigned to this manager account.</div>;
  }

  return (
    <div className="container" style={{ padding: "40px 24px 80px" }}>
      <span className="eyebrow">Manager dashboard</span>
      <h1 style={{ fontSize: "1.9rem", marginTop: 8 }}>{selectedHotel?.name || "Rooms & bookings"}</h1>

      {myHotels.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          {myHotels.map((h) => (
            <button
              key={h.id}
              onClick={() => selectHotel(h.id)}
              className={h.id === selectedHotelId ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
            >
              {h.name} <span style={{ opacity: 0.75 }}>· {h.city}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 40, marginTop: 32, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: "1.2rem" }}>My rooms</h2>
            <button className="btn btn-primary btn-sm" onClick={startCreate}>+ Add room</button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="card" style={{ padding: 20, marginBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label htmlFor="md-room-number">Room number</label>
                  <input id="md-room-number" required value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="md-room-type">Room type</label>
                  <select
                    id="md-room-type"
                    value={form.roomType}
                    onChange={(e) => {
                      const roomType = e.target.value as RoomType;
                      // There's no separate "image URL" field in this form -
                      // the image is always the type's representative photo,
                      // so keep it in sync whenever the type changes.
                      setForm({ ...form, roomType, imageUrl: defaultRoomImage(roomType) });
                    }}
                  >
                    {ROOM_TYPE_OPTIONS.map((rt) => (
                      <option key={rt} value={rt}>{formatRoomType(rt)}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="md-price">Price / night (₹)</label>
                  <input id="md-price" required type="number" min="0" value={form.pricePerNight} onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="md-max-occupancy">Max occupancy</label>
                  <input id="md-max-occupancy" required type="number" min="1" value={form.maxOccupancy} onChange={(e) => setForm({ ...form, maxOccupancy: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="md-description">Description</label>
                <input id="md-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="btn btn-primary btn-sm" type="submit">{editingId ? "Save changes" : "Create room"}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {loading && <p style={{ color: "var(--ink-soft)" }}>Loading rooms…</p>}

          {!loading && rooms.length === 0 && (
            <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>No rooms yet for {selectedHotel?.name}.</p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rooms.map((room) => (
              <div key={room.id} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: room.isActive ? 1 : 0.5 }}>
                <div>
                  <span className="eyebrow">{formatRoomType(room.roomType)}</span>
                  <div style={{ fontWeight: 600 }}>Room {room.roomNumber} · ₹{room.pricePerNight.toLocaleString("en-IN")}/night</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>Sleeps {room.maxOccupancy} · {room.isActive ? "Active" : "Inactive"}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(room)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(room)}>
                    {room.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button className="btn btn-rust btn-sm" onClick={() => handleDelete(room.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "1.2rem", marginBottom: 12 }}>Upcoming bookings</h2>
          {bookings.length === 0 && <p style={{ color: "var(--ink-soft)", fontSize: "0.9rem" }}>No upcoming bookings.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bookings.map((b) => {
              const room = rooms.find((r) => r.id === b.roomId);
              return (
                <div key={b.id} className="card" style={{ padding: 14 }}>
                  <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>{b.bookingRef}</div>
                  <div style={{ fontSize: "0.92rem", marginTop: 4, fontWeight: 600 }}>{b.guestName || "Guest"}</div>
                  <div style={{ fontSize: "0.92rem", marginTop: 2 }}>
                    {room ? `${formatRoomType(room.roomType)} · Room ${room.roomNumber}` : "Room"} · {b.checkInDate} → {b.checkOutDate}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
