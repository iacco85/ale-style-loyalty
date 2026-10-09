import { currentPassword, useAuth } from "./composables/useAuth";
import { ApiError, apiFetch } from "./http";
import type { CustomerWithPoints, OfferInput, Prize, PrizeInput } from "./types";

async function authorized<T>(path: string, method?: "GET" | "POST" | "PUT", body?: unknown): Promise<T> {
  try {
    return await apiFetch<T>(path, { password: currentPassword(), method, body });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) useAuth().signOut();
    throw error;
  }
}

export function checkPassword(password: string): Promise<unknown> {
  return apiFetch("/admin/customers", { password });
}

export function listCustomers(search?: string): Promise<CustomerWithPoints[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return authorized(`/admin/customers${query}`);
}

export function addPoints(customerId: number, delta: number, reason?: string): Promise<{ ok: boolean }> {
  return authorized(`/admin/customers/${customerId}/points`, "POST", { delta, reason });
}

export function createCustomerOffer(customerId: number, offer: OfferInput): Promise<unknown> {
  return authorized(`/admin/customers/${customerId}/offers`, "POST", offer);
}

export function createBroadcast(offer: OfferInput): Promise<unknown> {
  return authorized("/admin/broadcast", "POST", offer);
}

export function listPrizes(): Promise<Prize[]> {
  return authorized("/admin/prizes");
}

export function createPrize(prize: PrizeInput): Promise<Prize> {
  return authorized("/admin/prizes", "POST", prize);
}

export function updatePrize(id: number, prize: PrizeInput): Promise<Prize> {
  return authorized(`/admin/prizes/${id}`, "PUT", prize);
}
