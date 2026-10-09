# ale-style-api

Backend del pilot fedeltà "Ale Style": un Cloudflare Worker (framework [Hono](https://hono.dev)) che espone l'API REST usata dall'app Android e dal pannello admin, con dati su Cloudflare D1 (SQLite gestito). Contesto completo del progetto in [../README.md](../README.md) e [../PLAN.md](../PLAN.md).

Stato attuale: login cliente, saldo punti, offerte, registrazione device token per le push (Passo 1), `push.ts` (Passo 2, unico modulo che parla con Firebase Cloud Messaging via API HTTP v1), endpoint `/admin/*` protetti da password condivisa (Passo 3) — lista clienti con saldo punti, aggiunta punti, creazione offerta per un cliente singolo o in broadcast (invocano `sendPush()` in modo best-effort), CRUD dei premi della ruota — e la ruota della fortuna server-authoritative (Passo 4): `POST /spin` estrae un premio pesato tra quelli configurati ed enforce un cooldown di 7 giorni per cliente, `GET /spin/status` dice se può girare ora. Non ancora implementato: deploy su Cloudflare.

## Setup

```bash
npm install
npm run dev
```

Basta questo: `npm run dev` crea da solo `.dev.vars` (se manca, copiandolo da `.dev.vars.example`) e applica `schema.sql` al D1 locale prima di avviare il server — non serve farlo a mano, e rilanciarlo più volte è sicuro (lo schema usa `CREATE TABLE IF NOT EXISTS`, non fallisce se le tabelle esistono già). Se modifichi `schema.sql`, il cambiamento viene applicato al prossimo `npm run dev` automaticamente.

`.dev.vars` contiene i segreti locali (`AUTH_SECRET`, `ADMIN_PASSWORD`, `FCM_*`): è generato in locale, ignorato da git, non va mai committato. Se vuoi resettare completamente il D1 locale (dati di test compresi), cancella la cartella `.wrangler/` e rilancia `npm run dev`.

### Push notifiche (Firebase Cloud Messaging)

`src/push.ts` è l'unico modulo che parla con FCM (vedi CLAUDE.md — nessun SDK Firebase altrove). Per farlo funzionare in locale servono le credenziali del **service account** del progetto Firebase, da mettere in `.dev.vars`:

1. Console Firebase → progetto → ⚙️ Impostazioni progetto → **Account di servizio** → **Genera nuova chiave privata** → scarica il file `.json`.
2. Copia in `.dev.vars` (mai committato) i tre campi del json:
   ```
   FCM_PROJECT_ID=<project_id>
   FCM_CLIENT_EMAIL=<client_email>
   FCM_PRIVATE_KEY="<private_key>"
   ```
   `FCM_PRIVATE_KEY` va incollata su una riga sola, lasciando i `\n` letterali così come sono nel json (il codice li converte). Vedi `.dev.vars.example` per il formato esatto.
3. Firebase Cloud Messaging è gratuito (piano Spark), non serve attivare fatturazione.

`sendPush()` firma un JWT del service account (RS256, Web Crypto — nessuna libreria esterna), lo scambia per un access token OAuth2, e chiama l'API HTTP v1 di FCM. È invocato da `src/services/notifications.ts` quando un endpoint admin crea un'offerta (singola o broadcast): l'invio è best-effort, un fallimento su un device token non blocca gli altri né la creazione dell'offerta.

## Pannello admin (`/admin/*`)

Autenticazione minima per il pilot (un solo utente, la sorella): password condivisa in `ADMIN_PASSWORD`, passata come `Authorization: Bearer <password>` (vedi `src/middleware/adminAuth.ts`, confronto a tempo costante). Non è un token di sessione: è la password stessa, verificata a ogni richiesta.

| Endpoint | Cosa fa |
| --- | --- |
| `GET /admin/customers?search=` | Lista clienti con saldo punti calcolato; `search` filtra per nome o telefono |
| `POST /admin/customers/:id/points` | Aggiunge una riga a `points_log` (`delta` positivo o negativo + `reason` opzionale) |
| `POST /admin/customers/:id/offers` | Crea un'offerta per quel cliente e invia la push ai suoi device token registrati |
| `POST /admin/broadcast` | Crea un'offerta broadcast (`customer_id` null, visibile a tutti via `GET /offers`) e invia la push a tutti i device token registrati |
| `GET /admin/prizes` / `POST /admin/prizes` / `PUT /admin/prizes/:id` | CRUD dei premi della ruota della fortuna (label, tipo, valore, peso), usati da `POST /spin` per l'estrazione |

## Ruota della fortuna (`/spin`)

Server-authoritative (vedi CLAUDE.md — Sicurezza): il client non decide né influenza l'esito, si limita ad animare il premio già deciso dal Worker.

| Endpoint | Cosa fa |
| --- | --- |
| `GET /prizes` | Segmenti della ruota (`id`, `label`, `type`, `value`) in ordine stabile, **senza pesi**: serve all'app per disegnare la ruota senza rivelare le probabilità |
| `GET /spin/status` | `{ can_spin, next_spin_at }` — dice se il cliente autenticato può girare ora o quando potrà tornare a farlo |
| `POST /spin` | Se il cooldown (7 giorni dall'ultimo spin del cliente) è scaduto, estrae un premio pesato tra quelli in `prizes` (`src/services/weightedDraw.ts`), lo registra in `spins` e lo restituisce. Altrimenti risponde `429` con `next_spin_at`. Risponde `500` se nessun premio è configurato |

Logica pura testata TDD: `src/services/weightedDraw.ts` (estrazione pesata, incluso test statistico su 10000 estrazioni) e `src/services/spinCooldown.ts` (calcolo cooldown 7 giorni), entrambe in `test/services/`.

## Comandi

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | Prepara l'ambiente locale (vedi sopra) e avvia il Worker con `wrangler dev` su `http://localhost:8787` — nessun account Cloudflare richiesto |
| `npm test` | Esegue tutti i test (`vitest run`) — unit sui `services/` + integrazione sulle route con D1 reale (non mockato). Ambiente di test completamente separato da quello di `npm run dev`, non serve `.dev.vars` |
| `npm run test:watch` | Stessi test, in watch mode (utile per il ciclo TDD) |
| `npm run typecheck` | `tsc --noEmit`, nessun build necessario: `wrangler` transpila da TS direttamente in dev/deploy |
| `npm run deploy` | `wrangler deploy` — **non ancora usato**: serve prima `wrangler login` e un `database_id` reale in `wrangler.jsonc` (vedi sotto) |

## CORS

Il Worker risponde con `Access-Control-Allow-Origin: *` (`hono/cors` in `src/index.ts`): l'autenticazione è solo via header `Authorization`, senza cookie, quindi non c'è rischio di CSRF. Serve alla WebView dell'app Android e al pannello admin quando sono su un'origine diversa dall'API. Testato in `test/routes/cors.test.ts`.

## Documentazione API (Swagger)

Con `npm run dev` attivo:

- **Swagger UI**: http://localhost:8787/docs — esplora e prova gli endpoint dal browser
- **Spec OpenAPI grezza**: http://localhost:8787/openapi.json

La documentazione è generata automaticamente dagli stessi schemi Zod usati per validare le richieste (`@hono/zod-openapi`, in ogni file di `src/routes/`): non può disallinearsi dal codice, perché è il codice.

Gli endpoint cliente (`/me`, `/offers`, `/device-token`) richiedono l'header `Authorization: Bearer <token>` ottenuto da `POST /login`. Gli endpoint `/admin/*` richiedono `Authorization: Bearer <ADMIN_PASSWORD>`. In Swagger UI: pulsante **Authorize** in alto a destra, incolla il token o la password admin.

## Smoke test manuale

```bash
curl -X POST http://localhost:8787/login -H 'Content-Type: application/json' -d '{"name":"Ale","phone":"3331234567"}'
# → {"token": "...", "customer": {...}}

curl http://localhost:8787/me -H "Authorization: Bearer <token>"
curl http://localhost:8787/offers -H "Authorization: Bearer <token>"
curl -X POST http://localhost:8787/device-token -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' -d '{"token":"fake-fcm-token"}'

curl http://localhost:8787/admin/customers -H "Authorization: Bearer <ADMIN_PASSWORD>"
curl -X POST http://localhost:8787/admin/customers/1/points -H "Authorization: Bearer <ADMIN_PASSWORD>" -H 'Content-Type: application/json' -d '{"delta":1,"reason":"Taglio"}'
curl -X POST http://localhost:8787/admin/customers/1/offers -H "Authorization: Bearer <ADMIN_PASSWORD>" -H 'Content-Type: application/json' -d '{"title":"-15% prossimo taglio"}'

curl -X POST http://localhost:8787/admin/prizes -H "Authorization: Bearer <ADMIN_PASSWORD>" -H 'Content-Type: application/json' -d '{"label":"Hai perso","type":"none","weight":70}'
curl http://localhost:8787/spin/status -H "Authorization: Bearer <token>"
curl -X POST http://localhost:8787/spin -H "Authorization: Bearer <token>"
```

## Struttura

```
src/
  index.ts              # app Hono, monta le route, /openapi.json, /docs
  types.ts               # Env (bindings D1/secrets), tipi di dominio
  db.ts                   # query D1 parametrizzate
  push.ts                  # unico punto che parla con FCM (API HTTP v1)
  middleware/
    auth.ts                 # verifica il Bearer token del cliente
    adminAuth.ts              # verifica la password admin condivisa
  services/                 # business logic pura, sviluppata TDD (vedi CLAUDE.md)
    base64url.ts              # encode/decode base64url condiviso (token, push)
    phone.ts                 # normalizzazione/validazione numero italiano
    points.ts                 # calcolo saldo punti da points_log
    token.ts                   # firma/verifica token (HMAC-SHA256, stateless)
    timingSafeEqual.ts         # confronto stringhe a tempo costante (password admin)
    notifications.ts           # orchestrazione push per offerte singole/broadcast, chiama sendPush()
    weightedDraw.ts             # estrazione pesata di un premio dato un array {weight}
    spinCooldown.ts              # calcolo cooldown 7 giorni per lo spin
  routes/                      # createRoute() + handler, un file per endpoint
    admin/                       # customers.ts, broadcast.ts, prizes.ts — endpoint /admin/*
    spin.ts                       # POST /spin, GET /spin/status
schema.sql                      # schema D1 completo
test/                             # unit test dei services + integrazione delle route
```

## Autenticazione

- **Cliente**: nessuna tabella sessioni, il token restituito da `/login` è **firmato con HMAC-SHA256** (`AUTH_SECRET`), contiene `customerId` + timestamp, scade dopo 180 giorni. Vedi `src/services/token.ts`.
- **Admin**: password condivisa (`ADMIN_PASSWORD`) verificata a ogni richiesta con confronto a tempo costante, nessun token/sessione — scelta deliberata per il pilot, un solo utente non tecnico (vedi PLAN.md). Vedi `src/middleware/adminAuth.ts`.

## Note

- Versioni di `vitest`/`@cloudflare/vitest-pool-workers` tenute all'ultima stabile: `npm audit` deve restare a **0 vulnerabilità**.
- Per il deploy reale su Cloudflare serve: `wrangler login` (non ancora fatto su questa macchina per l'account personale) + `wrangler d1 create ale-style-loyalty` per ottenere un `database_id` reale da mettere in `wrangler.jsonc` (oggi è un placeholder) + `wrangler secret put AUTH_SECRET` + `wrangler secret put ADMIN_PASSWORD`.
