import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Home from "../pages/Home";
import { loadSearchPrefs, saveSearchPrefs } from "../utils/searchPrefs";

let capturedLocation = "";
function LocationCapture() {
  const location = useLocation();
  capturedLocation = location.pathname + location.search;
  return <div>HOTELS PAGE</div>;
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hotels" element={<LocationCapture />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Home", () => {
  beforeEach(() => {
    window.localStorage.clear();
    capturedLocation = "";
  });

  it("prefills the form from a remembered search", () => {
    saveSearchPrefs({ city: "Goa", checkIn: "2027-01-01", checkOut: "2027-01-03" });

    renderHome();

    expect(screen.getByLabelText("City")).toHaveValue("Goa");
    expect(screen.getByLabelText("Check-in")).toHaveValue("2027-01-01");
    expect(screen.getByLabelText("Check-out")).toHaveValue("2027-01-03");
  });

  it("starts blank when nothing is remembered", () => {
    renderHome();
    expect(screen.getByLabelText("City")).toHaveValue("");
  });

  it("navigates to /hotels with the search params on submit", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.type(screen.getByLabelText("City"), "Goa");
    await user.click(screen.getByRole("button", { name: /search hotels/i }));

    expect(capturedLocation).toBe("/hotels?city=Goa");
  });

  it("saves the search to localStorage on submit", async () => {
    const user = userEvent.setup();
    renderHome();

    await user.type(screen.getByLabelText("City"), "Kochi");
    await user.click(screen.getByRole("button", { name: /search hotels/i }));

    expect(loadSearchPrefs().city).toBe("Kochi");
  });

  it("shows a validation error and does not navigate when check-out is before check-in", () => {
    const { container } = renderHome();

    // Note: the check-out input has min={checkIn}, so in a real browser this
    // exact state is also blocked by native HTML5 constraint validation
    // before the form ever submits - userEvent.click() faithfully emulates
    // that and won't fire the submit event here either. Submitting the form
    // directly exercises the app's own JS-level validation as a backstop
    // (e.g. for a value that reached this state some other way).
    fireEvent.change(screen.getByLabelText("Check-in"), { target: { value: "2027-08-10" } });
    fireEvent.change(screen.getByLabelText("Check-out"), { target: { value: "2027-08-05" } });
    fireEvent.submit(container.querySelector("form")!);

    expect(screen.getByText("Check-out date must be after check-in date.")).toBeInTheDocument();
    expect(capturedLocation).toBe("");
  });
});
