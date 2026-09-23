import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ApiException } from "../services/api";
import * as api from "../services/api";

// Mock the API module so login() can be made to reject with a specific
// ApiException, the way the real backend does for wrong credentials.
vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof api>("../services/api");
  return {
    ...actual,
    login: vi.fn(),
  };
});

describe("AuthContext login (regression)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("propagates the backend's real error message instead of a generic fallback", async () => {
    // This is exactly the bug that was reported: AuthContext used to catch
    // this ApiException, silently swallow it, and throw a brand-new generic
    // Error("Login failed and no fallback session is available.") instead -
    // which is why the login page showed "Couldn't log in. Try again."
    // instead of the backend's actual "Invalid credentials" message.
    vi.mocked(api.login).mockRejectedValueOnce(new ApiException("UNAUTHORIZED", "Invalid credentials"));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await expect(
      act(async () => {
        await result.current.login("wrong@stayease.com", "wrongpass");
      })
    ).rejects.toBeInstanceOf(ApiException);
  });

  it("still rejects a failed login even when a stale session exists in localStorage", async () => {
    // Second half of the same regression: the old fallback path meant that if
    // *any* session happened to be cached in localStorage, login() would
    // silently RESOLVE using it instead of rejecting - so a failed login
    // with the wrong credentials could look like a successful one. A
    // restored session on mount is a separate, legitimate feature (that's
    // what lets a refresh keep you logged in); what matters here is that a
    // *failed login attempt* still surfaces as a rejection, stale session or
    // not.
    window.localStorage.setItem(
      "stayease.session",
      JSON.stringify({ id: "stale-id", email: "someone-else@stayease.com", name: "Someone Else", role: "GUEST" })
    );
    vi.mocked(api.login).mockRejectedValueOnce(new ApiException("UNAUTHORIZED", "Invalid credentials"));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await expect(result.current.login("someone@stayease.com", "wrongpass")).rejects.toBeInstanceOf(ApiException);
    });
  });

  it("logs in successfully when the backend accepts the credentials", async () => {
    const user = { id: "u1", email: "guest@stayease.com", name: "Guest One", role: "GUEST" as const };
    vi.mocked(api.login).mockResolvedValueOnce(user);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.login("guest@stayease.com", "guest123");
    });

    expect(result.current.user).toEqual(user);
  });
});
