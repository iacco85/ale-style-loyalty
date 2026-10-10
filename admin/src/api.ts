import { currentPassword, useAuth } from "./composables/useAuth";
import { ApiError, apiFetch } from "./http";
import type {
  CustomerWithPoints,
  LoyaltyRedemption,
  LoyaltyRule,
  LoyaltySnapshot,
  OfferInput,
  Prize,
  PrizeInput,
  WheelSettings,
  WonPrize,
} from "./types";

async function authorized<T>(path: string, method?: "GET" | "POST" | "PUT" | "DELETE", body?: unknown): Promise<T> {
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

export function resetPin(customerId: number): Promise<{ ok: boolean }> {
  return authorized(`/admin/customers/${customerId}/reset-pin`, "POST");
}

export function getLoyaltyRule(): Promise<LoyaltyRule> {
  return authorized("/admin/loyalty-rule");
}

export function setLoyaltyRule(rule: LoyaltyRule): Promise<LoyaltyRule> {
  return authorized("/admin/loyalty-rule", "PUT", rule);
}

export function getCustomerLoyalty(customerId: number): Promise<LoyaltySnapshot> {
  return authorized(`/admin/customers/${customerId}/loyalty`);
}

export function redeemRewards(customerId: number, all: boolean): Promise<LoyaltyRedemption> {
  return authorized(`/admin/customers/${customerId}/redeem-reward`, "POST", { all });
}

export function listCustomerPrizes(customerId: number): Promise<WonPrize[]> {
  return authorized(`/admin/customers/${customerId}/prizes`);
}

export function redeemPrize(spinId: number): Promise<{ ok: boolean }> {
  return authorized(`/admin/spins/${spinId}/redeem`, "POST");
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

export function removePrize(id: number): Promise<{ result: "deleted" | "deactivated" }> {
  return authorized(`/admin/prizes/${id}`, "DELETE");
}

export function getWheelSettings(): Promise<WheelSettings> {
  return authorized("/admin/wheel-settings");
}

export function setWheelSettings(settings: WheelSettings): Promise<WheelSettings> {
  return authorized("/admin/wheel-settings", "PUT", settings);
}
