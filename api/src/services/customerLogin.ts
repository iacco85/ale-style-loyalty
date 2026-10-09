import {
  clearPinFailures,
  createCustomer,
  findCustomerCredentialsByPhone,
  recordPinFailure,
  setCustomerPin,
} from "../db";
import type { Customer, CustomerCredentials } from "../types";
import { hashPin, verifyPin } from "./pin";
import { isLockedOut, nextFailureState } from "./pinLockout";

export interface LoginAttempt {
  name: string;
  phone: string;
  pin: string;
}

export type LoginOutcome =
  | { status: "ok"; customer: Customer }
  | { status: "invalid_credentials" }
  | { status: "locked"; lockedUntil: string };

function publicProfile({ id, name, phone, created_at }: CustomerCredentials): Customer {
  return { id, name, phone, created_at };
}

async function registerFailure(db: D1Database, customer: CustomerCredentials, now: Date): Promise<LoginOutcome> {
  const { attempts, lockedUntil } = nextFailureState(customer.failed_pin_attempts, now);
  await recordPinFailure(db, customer.id, attempts, lockedUntil);
  return lockedUntil ? { status: "locked", lockedUntil } : { status: "invalid_credentials" };
}

async function checkExistingCustomer(
  db: D1Database,
  customer: CustomerCredentials,
  pin: string,
  now: Date,
): Promise<LoginOutcome> {
  if (isLockedOut(customer.pin_locked_until, now)) {
    return { status: "locked", lockedUntil: customer.pin_locked_until as string };
  }

  // Cliente creato prima dell'introduzione dei PIN: il primo accesso sceglie il PIN
  if (!customer.pin_hash || !customer.pin_salt) {
    const { hash, salt } = await hashPin(pin);
    await setCustomerPin(db, customer.id, hash, salt);
    return { status: "ok", customer: publicProfile(customer) };
  }

  if (!(await verifyPin(pin, customer.pin_hash, customer.pin_salt))) return registerFailure(db, customer, now);

  if (customer.failed_pin_attempts > 0) await clearPinFailures(db, customer.id);
  return { status: "ok", customer: publicProfile(customer) };
}

export async function loginCustomer(db: D1Database, { name, phone, pin }: LoginAttempt, now = new Date()): Promise<LoginOutcome> {
  const existing = await findCustomerCredentialsByPhone(db, phone);
  if (existing) return checkExistingCustomer(db, existing, pin, now);

  const customer = await createCustomer(db, name, phone, await hashPin(pin));
  return { status: "ok", customer };
}
