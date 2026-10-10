import type {
  Customer,
  CustomerCredentials,
  CustomerWithPoints,
  LoyaltyRule,
  Offer,
  Prize,
  PrizeType,
  Spin,
  WonPrize,
} from "./types";

/** SQLite `datetime('now')` restituisce "YYYY-MM-DD HH:MM:SS" in UTC senza indicazione di fuso: va normalizzato a ISO-8601 prima di passarlo a `new Date(...)`, altrimenti verrebbe interpretato come ora locale. */
function sqliteTimestampToIso(timestamp: string): string {
  return `${timestamp.replace(" ", "T")}Z`;
}

// Colonne pubbliche: mai SELECT * su customers, altrimenti hash e salt del PIN finirebbero nelle risposte
const CUSTOMER_COLUMNS = "id, name, phone, created_at";

export async function findCustomerCredentialsByPhone(db: D1Database, phone: string): Promise<CustomerCredentials | null> {
  const row = await db.prepare("SELECT * FROM customers WHERE phone = ?").bind(phone).first<CustomerCredentials>();
  return row ?? null;
}

export async function setCustomerPin(db: D1Database, customerId: number, hash: string, salt: string): Promise<void> {
  await db
    .prepare(
      "UPDATE customers SET pin_hash = ?, pin_salt = ?, failed_pin_attempts = 0, pin_locked_until = NULL WHERE id = ?",
    )
    .bind(hash, salt, customerId)
    .run();
}

export async function recordPinFailure(
  db: D1Database,
  customerId: number,
  attempts: number,
  lockedUntil: string | null,
): Promise<void> {
  await db
    .prepare("UPDATE customers SET failed_pin_attempts = ?, pin_locked_until = ? WHERE id = ?")
    .bind(attempts, lockedUntil, customerId)
    .run();
}

export async function clearPinFailures(db: D1Database, customerId: number): Promise<void> {
  await db.prepare("UPDATE customers SET failed_pin_attempts = 0, pin_locked_until = NULL WHERE id = ?").bind(customerId).run();
}

export async function resetCustomerPin(db: D1Database, customerId: number): Promise<void> {
  await db
    .prepare(
      "UPDATE customers SET pin_hash = NULL, pin_salt = NULL, failed_pin_attempts = 0, pin_locked_until = NULL WHERE id = ?",
    )
    .bind(customerId)
    .run();
}

export async function createCustomer(
  db: D1Database,
  name: string,
  phone: string,
  pin: { hash: string; salt: string },
): Promise<Customer> {
  const row = await db
    .prepare(`INSERT INTO customers (name, phone, pin_hash, pin_salt) VALUES (?, ?, ?, ?) RETURNING ${CUSTOMER_COLUMNS}`)
    .bind(name, phone, pin.hash, pin.salt)
    .first<Customer>();
  if (!row) throw new Error("failed to create customer");
  return row;
}

export async function getCustomerById(db: D1Database, id: number): Promise<Customer | null> {
  const row = await db.prepare(`SELECT ${CUSTOMER_COLUMNS} FROM customers WHERE id = ?`).bind(id).first<Customer>();
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
          `SELECT c.id, c.name, c.phone, c.created_at, MAX(0, COALESCE(SUM(pl.delta), 0)) AS points
           FROM customers c LEFT JOIN points_log pl ON pl.customer_id = c.id
           WHERE c.name LIKE ? OR c.phone LIKE ?
           GROUP BY c.id ORDER BY c.name`,
        )
        .bind(`%${search}%`, `%${search}%`)
    : db.prepare(
        `SELECT c.id, c.name, c.phone, c.created_at, MAX(0, COALESCE(SUM(pl.delta), 0)) AS points
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

export async function recordSpin(
  db: D1Database,
  customerId: number,
  prizeId: number,
  bonusPoints?: { delta: number; reason: string },
): Promise<Spin> {
  const insertSpin = db.prepare("INSERT INTO spins (customer_id, prize_id) VALUES (?, ?) RETURNING *").bind(customerId, prizeId);
  const statements = [insertSpin];
  if (bonusPoints) {
    // stessa batch del giro: o si registrano entrambi o nessuno dei due
    statements.push(
      db
        .prepare("INSERT INTO points_log (customer_id, delta, reason) VALUES (?, ?, ?)")
        .bind(customerId, bonusPoints.delta, bonusPoints.reason),
    );
  }
  const [spinResult] = await db.batch<Spin>(statements);
  const row = spinResult?.results[0];
  if (!row) throw new Error("failed to record spin");
  return row;
}

export async function listWonPrizes(db: D1Database, customerId: number): Promise<WonPrize[]> {
  const { results } = await db
    .prepare(
      `SELECT s.id, p.label, p.type, p.value, s.spun_at, s.redeemed_at
       FROM spins s JOIN prizes p ON p.id = s.prize_id
       WHERE s.customer_id = ? AND p.type = 'discount'
       ORDER BY s.spun_at DESC, s.id DESC`,
    )
    .bind(customerId)
    .all<WonPrize>();
  return results.map((row) => ({
    ...row,
    spun_at: sqliteTimestampToIso(row.spun_at),
    redeemed_at: row.redeemed_at ? sqliteTimestampToIso(row.redeemed_at) : null,
  }));
}

export type WonSpin = { customer_id: number; label: string; spun_at: string; redeemed_at: string | null };

export async function getWonSpin(db: D1Database, spinId: number): Promise<WonSpin | null> {
  const row = await db
    .prepare(
      `SELECT s.customer_id, p.label, s.spun_at, s.redeemed_at FROM spins s JOIN prizes p ON p.id = s.prize_id
       WHERE s.id = ? AND p.type = 'discount'`,
    )
    .bind(spinId)
    .first<WonSpin>();
  if (!row) return null;
  return {
    ...row,
    spun_at: sqliteTimestampToIso(row.spun_at),
    redeemed_at: row.redeemed_at ? sqliteTimestampToIso(row.redeemed_at) : null,
  };
}

export async function markSpinRedeemed(db: D1Database, spinId: number): Promise<boolean> {
  const row = await db
    .prepare("UPDATE spins SET redeemed_at = datetime('now') WHERE id = ? AND redeemed_at IS NULL RETURNING id")
    .bind(spinId)
    .first();
  return row !== null;
}

export async function getLoyaltyRule(db: D1Database): Promise<LoyaltyRule> {
  const row = await db
    .prepare("SELECT points_per_reward AS pointsPerReward, reward_euros AS rewardEuros FROM loyalty_settings WHERE id = 1")
    .first<LoyaltyRule>();
  if (!row) throw new Error("loyalty_settings row missing");
  return row;
}

export async function setLoyaltyRule(db: D1Database, rule: LoyaltyRule): Promise<void> {
  await db
    .prepare("UPDATE loyalty_settings SET points_per_reward = ?, reward_euros = ? WHERE id = 1")
    .bind(rule.pointsPerReward, rule.rewardEuros)
    .run();
}
