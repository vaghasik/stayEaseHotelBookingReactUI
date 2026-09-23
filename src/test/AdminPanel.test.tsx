import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPanel from "../pages/AdminPanel";
import * as api from "../services/api";
import type { Hotel } from "../types";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof api>("../services/api");
  return {
    ...actual,
    searchHotels: vi.fn(),
    getAllHotels: vi.fn(),
    createHotel: vi.fn(),
    updateHotel: vi.fn(),
    deleteHotel: vi.fn(),
  };
});

const existingHotel: Hotel = {
  id: "h1",
  name: "Sunset Palm",
  city: "Goa",
  starRating: 4,
  description: "Beachfront Hotel with stunning sunset views.",
  coverImageUrl: "https://example.com/cover.jpg",
  managerId: "m1",
  amenities: ["WIFI", "POOL"],
};

describe("AdminPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAllHotels).mockResolvedValue([existingHotel]);
  });

  it("lists existing hotels", async () => {
    render(<AdminPanel />);
    await waitFor(() => expect(screen.getByText("Sunset Palm")).toBeInTheDocument());
  });

  it("submits selected amenities when creating a new hotel", async () => {
    vi.mocked(api.createHotel).mockResolvedValueOnce({ ...existingHotel, id: "h2", name: "New Hotel" });
    const user = userEvent.setup();
    render(<AdminPanel />);
    await waitFor(() => screen.getByText("Sunset Palm"));

    await user.click(screen.getByText("+ Add hotel"));
    await user.type(screen.getByLabelText(/hotel name/i), "New Hotel");
    await user.type(screen.getByLabelText(/^city$/i), "Kochi");
    await user.type(screen.getByLabelText(/manager user id/i), "22222222-2222-2222-2222-222222222222");
    await user.click(screen.getByText("Free Wi-Fi"));
    await user.click(screen.getByText("Spa"));
    await user.click(screen.getByRole("button", { name: /create hotel/i }));

    await waitFor(() => expect(api.createHotel).toHaveBeenCalled());
    const payload = vi.mocked(api.createHotel).mock.calls[0][0];
    expect(payload.amenities).toEqual(expect.arrayContaining(["WIFI", "SPA"]));
    expect(payload.amenities).toHaveLength(2);
  }, 10000);

  it("prefills previously-selected amenities when editing, and can uncheck one", async () => {
    vi.mocked(api.updateHotel).mockResolvedValueOnce(existingHotel);
    const user = userEvent.setup();
    render(<AdminPanel />);
    await waitFor(() => screen.getByText("Sunset Palm"));

    await user.click(screen.getByText("Edit"));

    const wifiBox = screen.getByRole("checkbox", { name: /free wi-fi/i });
    const poolBox = screen.getByRole("checkbox", { name: /swimming pool/i });
    expect(wifiBox).toBeChecked();
    expect(poolBox).toBeChecked();

    await user.click(poolBox); // uncheck
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(api.updateHotel).toHaveBeenCalled());
    const [, payload] = vi.mocked(api.updateHotel).mock.calls[0];
    expect(payload.amenities).toEqual(["WIFI"]);
  });

  it("deletes a hotel when Delete is clicked", async () => {
    vi.mocked(api.deleteHotel).mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<AdminPanel />);
    await waitFor(() => screen.getByText("Sunset Palm"));

    await user.click(screen.getByText("Delete"));

    await waitFor(() => expect(api.deleteHotel).toHaveBeenCalledWith("h1"));
  });
});
