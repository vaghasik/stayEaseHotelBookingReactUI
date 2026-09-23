import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import * as api from "../services/api";
import { ApiException } from "../services/api";
import type { Hotel } from "../types";
import { AMENITY_OPTIONS, formatAmenity } from "../utils/amenities";

const emptyForm = {
  name: "",
  city: "",
  starRating: "3",
  description: "",
  coverImageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
  // No user-directory endpoint exists to pick a manager from a dropdown, so
  // this is a plain UUID entry. There is deliberately no fake default here:
  // the backend requires a real user id and rejects anything that isn't a
  // parseable UUID, so a placeholder like "u-mgr1" would fail on every
  // hotel created without editing this field first.
  managerId: "",
  amenities: [] as string[],
};

export default function AdminPanel() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setHotels(await api.getAllHotels());
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Couldn't load hotels.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(hotel: Hotel) {
    setForm({
      name: hotel.name,
      city: hotel.city,
      starRating: String(hotel.starRating),
      description: hotel.description,
      coverImageUrl: hotel.coverImageUrl,
      managerId: hotel.managerId,
      amenities: hotel.amenities ?? [],
    });
    setEditingId(hotel.id);
    setShowForm(true);
  }

  function toggleAmenity(amenity: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter((a) => a !== amenity)
        : [...f.amenities, amenity],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      name: form.name,
      city: form.city,
      starRating: Number(form.starRating),
      description: form.description,
      coverImageUrl: form.coverImageUrl,
      managerId: form.managerId,
      amenities: form.amenities,
    };
    try {
      if (editingId) {
        await api.updateHotel(editingId, payload);
      } else {
        await api.createHotel(payload);
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Couldn't save this hotel. Check the Manager ID is a valid user id.");
    }
  }

  async function handleDelete(hotelId: string) {
    try {
      await api.deleteHotel(hotelId);
      await load();
    } catch (e) {
      setError(e instanceof ApiException ? e.message : "Couldn't delete this hotel.");
    }
  }

  return (
    <div className="container" style={{ padding: "40px 24px 80px", maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="eyebrow">Admin</span>
          <h1 style={{ fontSize: "1.9rem", marginTop: 8 }}>Hotel directory</h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={startCreate}>+ Add hotel</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card" style={{ padding: 20, margin: "20px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label htmlFor="admin-hotel-name">Hotel name</label>
              <input id="admin-hotel-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="admin-hotel-city">City</label>
              <input id="admin-hotel-city" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="admin-hotel-star">Star rating</label>
              <select id="admin-hotel-star" value={form.starRating} onChange={(e) => setForm({ ...form, starRating: e.target.value })}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="admin-hotel-cover">Cover image URL</label>
              <input id="admin-hotel-cover" value={form.coverImageUrl} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="admin-hotel-description">Description</label>
            <input id="admin-hotel-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="admin-hotel-manager">Manager user ID (UUID)</label>
            <input
              id="admin-hotel-manager"
              required
              placeholder="e.g. the id of an existing MANAGER account"
              value={form.managerId}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Amenities</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px 16px",
                marginTop: 4,
              }}
            >
              {AMENITY_OPTIONS.map((amenity) => (
                <label
                  key={amenity}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.85rem",
                    fontWeight: 400,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                  />
                  {formatAmenity(amenity)}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <button className="btn btn-primary btn-sm" type="submit">{editingId ? "Save changes" : "Create hotel"}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {error && <p className="error-text" style={{ marginTop: 16 }}>{error}</p>}

      {loading && <p style={{ color: "var(--ink-soft)", marginTop: 20 }}>Loading…</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
        {hotels.map((hotel) => (
          <div key={hotel.id} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="eyebrow">{hotel.city} · {hotel.starRating}★</span>
              <div style={{ fontWeight: 600 }}>{hotel.name}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(hotel)}>Edit</button>
              <button className="btn btn-rust btn-sm" onClick={() => handleDelete(hotel.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
