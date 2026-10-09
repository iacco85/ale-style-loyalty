import { currentToken, useSession } from "./composables/useSession";
import { ApiError, apiFetch } from "./http";
import type { LoginResponse, Offer, Profile, SpinResult, SpinStatus, WheelPrize } from "./types";

async function authorized<T>(path: string, method?: "GET" | "POST", body?: unknown): Promise<T> {
  try {
    return await apiFetch<T>(path, { token: currentToken(), method, body });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) useSession().end();
    throw error;
  }
}

export function login(name: string, phone: string): Promise<LoginResponse> {
  return apiFetch("/login", { method: "POST", body: { name, phone } });
}

export function getProfile(): Promise<Profile> {
  return authorized("/me");
}

export function listOffers(): Promise<Offer[]> {
  return authorized("/offers");
}

export function registerDeviceToken(token: string): Promise<{ ok: boolean }> {
  return authorized("/device-token", "POST", { token });
}

export function listWheelPrizes(): Promise<WheelPrize[]> {
  return authorized("/prizes");
}

export function getSpinStatus(): Promise<SpinStatus> {
  return authorized("/spin/status");
}

export function spinWheel(): Promise<SpinResult> {
  return authorized("/spin", "POST");
}
