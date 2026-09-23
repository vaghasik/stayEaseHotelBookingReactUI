import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HotelCard from "../components/HotelCard";
import type { Hotel } from "../types";

const hotel: Hotel = {
  id: "h1",
  name: "Sunset Palm",
  city: "Goa",
  starRating: 4,
  description: "A breezy beachfront hotel",
  coverImageUrl: "https://example.com/broken-cover.jpg",
  managerId: "m1",
};

function renderCard(props: Partial<Parameters<typeof HotelCard>[0]> = {}) {
  return render(
    <MemoryRouter>
      <HotelCard hotel={hotel} {...props} />
    </MemoryRouter>
  );
}

describe("HotelCard", () => {
  it("renders the hotel name, city, and star rating", () => {
    renderCard();
    expect(screen.getByText("Sunset Palm")).toBeInTheDocument();
    expect(screen.getByText("Goa")).toBeInTheDocument();
    expect(screen.getByLabelText("4 stars")).toBeInTheDocument();
  });

  it("shows a from-price when one is provided", () => {
    renderCard({ fromPrice: 2500 });
    expect(screen.getByText("₹2,500")).toBeInTheDocument();
  });

  it("shows no price block at all when fromPrice is not provided (e.g. fully booked)", () => {
    renderCard({ fromPrice: undefined });
    expect(screen.queryByText(/from/i)).not.toBeInTheDocument();
  });

  it("links to the hotel detail page, carrying the search query through", () => {
    renderCard({ searchQuery: "?checkIn=2027-01-01&checkOut=2027-01-03" });
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/hotels/h1?checkIn=2027-01-01&checkOut=2027-01-03");
  });

  it("falls back to the local placeholder if the cover image fails to load", () => {
    renderCard();
    const img = screen.getByRole("img") as HTMLImageElement;
    fireEvent.error(img);
    expect(img.src).toContain("/images/hotel-placeholder.jpg");
  });
});
