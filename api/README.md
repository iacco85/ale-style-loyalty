# ale-style-api

Backend del pilot fedeltà "Ale Style": un Cloudflare Worker (framework [Hono](https://hono.dev)) che espone l'API REST usata dall'app Android e dal pannello admin, con dati su Cloudflare D1 (SQLite gestito). Contesto completo del progetto in [../README.md](../README.md) e [../PLAN.md](../PLAN.md).

Stato attuale: **solo lo scheletro base** (Passo 1 di PLAN.md) — login cliente, saldo punti, offerte, registrazione device token per le push. Non ancora implementati: endpoint `/admin/*`, ruota della fortuna (`/spin`), invio push reale via FCM, deploy su Cloudflare.

## Setup

```bash
npm install
npm run dev
```

Basta questo: `npm run dev` crea da solo `.dev.vars` (se manca, copiandolo da `.dev.vars.example`) e applica `schema.sql` al D1 locale prima di avviare il server — non serve farlo a mano, e rilanciarlo più volte è sicuro (lo schema usa `CREATE TABLE IF NOT EXISTS`, non fallisce se le tabelle esistono già). Se modifichi `schema.sql`, il cambiamento viene applicato al prossimo `npm run dev` automaticamente.

`.dev.vars` contiene il segreto locale `AUTH_SECRET`: è generato in locale, ignorato da git, non va mai committato. Se vuoi resettare completamente il D1 locale (dati di test compresi), cancella la cartella `.wrangler/` e rilancia `npm run dev`.

## Comandi

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | Prepara l'ambiente locale (vedi sopra) e avvia il Worker con `wrangler dev` su `http://localhost:8787` — nessun account Cloudflare richiesto |
| `npm test` | Esegue tutti i test (`vitest run`) — unit sui `services/` + integrazione sulle route con D1 reale (non mockato). Ambiente di test completamente separato da quello di `npm run dev`, non serve `.dev.vars` |
| `npm run test:watch` | Stessi test, in watch mode (utile per il ciclo TDD) |
| `npm run typecheck` | `tsc --noEmit`, nessun build necessario: `wrangler` transpila da TS direttamente in dev/deploy |
| `npm run deploy` | `wrangler deploy` — **non ancora usato**: serve prima `wrangler login` e un `database_id` reale in `wrangler.jsonc` (vedi sotto) |

## Documentazione API (Swagger)

Con `npm run dev` attivo:

- **Swagger UI**: http://localhost:8787/docs — esplora e prova gli endpoint dal browser
- **Spec OpenAPI grezza**: http://localhost:8787/openapi.json

La documentazione è generata automaticamente dagli stessi schemi Zod usati per validare le richieste (`@hono/zod-openapi`, in ogni file di `src/routes/`): non può disallinearsi dal codice, perché è il codice.

Gli endpoint protetti (`/me`, `/offers`, `/device-token`) richiedono l'header `Authorization: Bearer <token>` ottenuto da `POST /login`. In Swagger UI: pulsante **Authorize** in alto a destra, incolla il token ottenuto da una chiamata a `/login`.

## Smoke test manuale

```bash
curl -X POST http://localhost:8787/login -H 'Content-Type: application/json' -d '{"name":"Ale","phone":"3331234567"}'
# → {"token": "...", "customer": {...}}

curl http://localhost:8787/me -H "Authorization: Bearer <token>"
curl http://localhost:8787/offers -H "Authorization: Bearer <token>"
curl -X POST http://localhost:8787/device-token -H "Authorization: Bearer <token>" -H 'Content-Type: application/json' -d '{"token":"fake-fcm-token"}'
```

## Struttura

```
src/
  index.ts              # app Hono, monta le route, /openapi.json, /docs
  types.ts               # Env (bindings D1/secrets), tipi di dominio
  db.ts                   # query D1 parametrizzate
  middleware/auth.ts       # verifica il Bearer token
  services/                 # business logic pura, sviluppata TDD (vedi CLAUDE.md)
    phone.ts                 # normalizzazione/validazione numero italiano
    points.ts                 # calcolo saldo punti da points_log
    token.ts                   # firma/verifica token (HMAC-SHA256, stateless)
  routes/                      # createRoute() + handler, un file per endpoint
schema.sql                      # schema D1 completo (anche tabelle prizes/spins, non ancora usate)
test/                             # unit test dei services + integrazione delle route
```

## Autenticazione cliente

Nessuna tabella sessioni: il token restituito da `/login` è **firmato con HMAC-SHA256** (`AUTH_SECRET`), contiene `customerId` + timestamp, scade dopo 180 giorni. Vedi `src/services/token.ts`.

## Note

- Versioni di `vitest`/`@cloudflare/vitest-pool-workers` tenute all'ultima stabile: `npm audit` deve restare a **0 vulnerabilità**.
- Per il deploy reale su Cloudflare serve: `wrangler login` (non ancora fatto su questa macchina per l'account personale) + `wrangler d1 create ale-style-loyalty` per ottenere un `database_id` reale da mettere in `wrangler.jsonc` (oggi è un placeholder) + `wrangler secret put AUTH_SECRET`.
