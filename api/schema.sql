CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  pin_hash TEXT,
  pin_salt TEXT,
  failed_pin_attempts INTEGER NOT NULL DEFAULT 0,
  pin_locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS points_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  delta INTEGER NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_points_log_customer ON points_log(customer_id);

CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER REFERENCES customers(id),
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_offers_customer ON offers(customer_id);

CREATE TABLE IF NOT EXISTS device_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (customer_id, token)
);

CREATE TABLE IF NOT EXISTS prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('discount', 'points', 'none')),
  value INTEGER,
  weight INTEGER NOT NULL,
  -- 0 = rimosso dall'admin ma già vinto da qualcuno: fuori dalla ruota, resta per lo storico dei premi vinti
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS spins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  prize_id INTEGER NOT NULL REFERENCES prizes(id),
  spun_at TEXT NOT NULL DEFAULT (datetime('now')),
  redeemed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_spins_customer ON spins(customer_id);

-- Regola fedeltà: ogni `points_per_reward` punti, `reward_euros` euro di sconto. Una sola riga (id = 1), modificabile dall'admin
CREATE TABLE IF NOT EXISTS loyalty_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  points_per_reward INTEGER NOT NULL CHECK (points_per_reward > 0),
  reward_euros INTEGER NOT NULL CHECK (reward_euros > 0)
);
INSERT OR IGNORE INTO loyalty_settings (id, points_per_reward, reward_euros) VALUES (1, 100, 5);
