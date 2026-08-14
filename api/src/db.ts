import type { Customer, Offer } from "./types";

export async function findCustomerByPhone(db: D1Database, phone: string): Promise<Customer | null> {
  const row = await db.prepare("SELECT * FROM customers WHERE phone = ?").bind(phone).first<Customer>();
  return row ?? null;
}

export async function createCustomer(db: D1Database, name: string, phone: string): Promise<Customer> {
  const row = await db
    .prepare("INSERT INTO customers (name, phone) VALUES (?, ?) RETURNING *")
    .bind(name, phone)
    .first<Customer>();
  if (!row) throw new Error("failed to create customer");
  return row;
}

export async function getCustomerById(db: D1Database, id: number): Promise<Customer | null> {
  const row = await db.prepare("SELECT * FROM customers WHERE id = ?").bind(id).first<Customer>();
  return row ?? null;
}

export async function getPointsLogForCustomer(db: D1Database, customerId: number): Promise<{ delta: number }[]> {
  const { results } = await db
    .prepare("SELECT delta FROM points_log WHERE customer_id = ?")
    .bind(customerId)
    .all<{ delta: number }>();
  return results;
}

export async function upsertDeviceToken(db: D1Database, customerId: number, token: string): Promise<void> {
  await db
    .prepare(
      "INSERT INTO device_tokens (customer_id, token) VALUES (?, ?) ON CONFLICT (customer_id, token) DO NOTHING",
    )
    .bind(customerId, token)
    .run();
}

export async function getOffersForCustomer(db: D1Database, customerId: number): Promise<Offer[]> {
  const { results } = await db
    .prepare("SELECT * FROM offers WHERE customer_id = ? OR customer_id IS NULL ORDER BY created_at DESC")
    .bind(customerId)
    .all<Offer>();
  return results;
}
