import type { Customer, CustomerWithPoints, Offer, Prize, PrizeType, Spin } from "./types";

/** SQLite `datetime('now')` restituisce "YYYY-MM-DD HH:MM:SS" in UTC senza indicazione di fuso: va normalizzato a ISO-8601 prima di passarlo a `new Date(...)`, altrimenti verrebbe interpretato come ora locale. */
function sqliteTimestampToIso(timestamp: string): string {
  return `${timestamp.replace(" ", "T")}Z`;
}

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

export async function listCustomers(db: D1Database, search?: string): Promise<CustomerWithPoints[]> {
  const query = search
    ? db
        .prepare(
          `SELECT c.*, MAX(0, COALESCE(SUM(pl.delta), 0)) AS points
           FROM customers c LEFT JOIN points_log pl ON pl.customer_id = c.id
           WHERE c.name LIKE ? OR c.phone LIKE ?
           GROUP BY c.id ORDER BY c.name`,
        )
        .bind(`%${search}%`, `%${search}%`)
    : db.prepare(
        `SELECT c.*, MAX(0, COALESCE(SUM(pl.delta), 0)) AS points
         FROM customers c LEFT JOIN points_log pl ON pl.customer_id = c.id
         GROUP BY c.id ORDER BY c.name`,
      );
  const { results } = await query.all<CustomerWithPoints>();
  return results;
}

export async function addPointsEntry(db: D1Database, customerId: number, delta: number, reason?: string): Promise<void> {
  await db
    .prepare("INSERT INTO points_log (customer_id, delta, reason) VALUES (?, ?, ?)")
    .bind(customerId, delta, reason ?? null)
    .run();
}

export async function createOffer(
  db: D1Database,
  customerId: number | null,
  title: string,
  description?: string,
): Promise<Offer> {
  const row = await db
    .prepare("INSERT INTO offers (customer_id, title, description) VALUES (?, ?, ?) RETURNING *")
    .bind(customerId, title, description ?? null)
    .first<Offer>();
  if (!row) throw new Error("failed to create offer");
  return row;
}

export async function getDeviceTokensForCustomer(db: D1Database, customerId: number): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT token FROM device_tokens WHERE customer_id = ?")
    .bind(customerId)
    .all<{ token: string }>();
  return results.map((row) => row.token);
}

export async function getAllDeviceTokens(db: D1Database): Promise<string[]> {
  const { results } = await db.prepare("SELECT token FROM device_tokens").all<{ token: string }>();
  return results.map((row) => row.token);
}

export async function listPrizes(db: D1Database): Promise<Prize[]> {
  const { results } = await db.prepare("SELECT * FROM prizes ORDER BY weight DESC").all<Prize>();
  return results;
}

export async function createPrize(
  db: D1Database,
  prize: { label: string; type: PrizeType; value?: number; weight: number },
): Promise<Prize> {
  const row = await db
    .prepare("INSERT INTO prizes (label, type, value, weight) VALUES (?, ?, ?, ?) RETURNING *")
    .bind(prize.label, prize.type, prize.value ?? null, prize.weight)
    .first<Prize>();
  if (!row) throw new Error("failed to create prize");
  return row;
}

export async function updatePrize(
  db: D1Database,
  id: number,
  prize: { label: string; type: PrizeType; value?: number; weight: number },
): Promise<Prize | null> {
  const row = await db
    .prepare("UPDATE prizes SET label = ?, type = ?, value = ?, weight = ? WHERE id = ? RETURNING *")
    .bind(prize.label, prize.type, prize.value ?? null, prize.weight, id)
    .first<Prize>();
  return row ?? null;
}

export async function getLastSpunAtForCustomer(db: D1Database, customerId: number): Promise<string | null> {
  const row = await db
    .prepare("SELECT spun_at FROM spins WHERE customer_id = ? ORDER BY spun_at DESC LIMIT 1")
    .bind(customerId)
    .first<{ spun_at: string }>();
  return row ? sqliteTimestampToIso(row.spun_at) : null;
}

export async function recordSpin(db: D1Database, customerId: number, prizeId: number): Promise<Spin> {
  const row = await db
    .prepare("INSERT INTO spins (customer_id, prize_id) VALUES (?, ?) RETURNING *")
    .bind(customerId, prizeId)
    .first<Spin>();
  if (!row) throw new Error("failed to record spin");
  return row;
}
