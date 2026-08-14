# Ale Style Loyalty

Pilot di app fedeltà nativa per il salone "Ale Style" (Rimini). Contesto e decisioni complete in [PLAN.md](PLAN.md).

Stack: Capacitor + Vue 3 + TypeScript (app Android), Cloudflare Worker + D1 (API), Vue + TS (admin web), Firebase Cloud Messaging isolato in un unico modulo.

## Convenzioni obbligatorie

Regole del progetto, da rispettare sempre indipendentemente dalla tecnologia:

- **CSS mai mischiato al codice**: negli `.vue` lo `<style>` sta nel suo blocco, mai `style` inline calcolato in `<script>` o oggetti di stile costruiti a runtime. Nessun CSS-in-JS.
- **Single Responsibility**: un modulo/componente/funzione ha una sola ragione per cambiare. Nell'API questo significa: `routes/*.ts` solo parsing richiesta + risposta, la logica va in un modulo `services`/dedicato, l'accesso ai dati in `db.ts`. Un `.vue` = un componente; logica riusabile estratta in composable (`useXxx`).
- **Funzioni corte e chiare**: se una funzione fa più di una cosa, va spezzata. Un livello di astrazione per funzione, nomi che spiegano il "cosa" senza bisogno di commenti.
- **Inferenza dei tipi sempre**: non annotare tipi che TypeScript può dedurre da solo (variabili locali, `const` con valore letterale). Annotazioni esplicite solo ai confini: parametri di funzione, valori di ritorno di funzioni esportate/pubbliche, contratti API (request/response).
- **TDD mandatory sulla business logic**: test scritto *prima* del codice per tutto ciò che è logica di dominio — estrazione pesata della ruota, calcolo punti, regole di eligibilità offerte, cooldown spin. Non serve per componenti UI puramente presentazionali o markup statico.
- **README.md sempre aggiornato**: ogni sottoprogetto (`api/`, `app/`, `admin/`) ha un proprio `README.md` con comandi (setup, dev, test, deploy), endpoint/funzionalità esposte e stato corrente. Va aggiornato **nello stesso commit** che introduce il cambiamento (nuovo comando, nuovo endpoint, dipendenza aggiunta, comportamento cambiato) — non a posteriori. Il [README.md](README.md) nella root va aggiornato quando cambia lo stato generale del progetto (componente completato, nuovo componente iniziato).

## Best practice per tecnologia

Note mirate perché sono tecnologie che conosci meno bene di quanto conosci `ale-style` classico.

### Vue 3 + TypeScript
- Sempre Composition API con `<script setup lang="ts">`, mai Options API.
- Props ed emit tipizzati con `defineProps<T>()` / `defineEmits<T>()`, non con la sintassi a runtime (`props: { ... }`).
- `<style scoped>` di default; stili globali solo per reset/variabili condivise, in un file dedicato.
- Stato condiviso tra componenti → composable (`useAuth`, `useSpin`), non prop-drilling né store globali finché non serve davvero.

### Cloudflare Workers (`ale-style-api`)
- Router leggero (es. `hono`) invece di un grosso `if/else` su `request.url`.
- Handler delle route sottili: validano input e formattano output, la logica vera vive altrove (`services/`).
- Bindings (D1, secrets, KV) dichiarati in `wrangler.jsonc`, mai hardcoded nel codice.
- Segreti (es. service account Firebase) con `wrangler secret put`, mai committati né in `.dev.vars` versionato.
- Validazione a runtime dei payload in ingresso (es. `zod`): TypeScript protegge in compilazione, non da un body HTTP malformato.

### Cloudflare D1
- `schema.sql` versionato nel repo; evoluzioni successive tramite `wrangler d1 migrations`.
- Query sempre parametrizzate (`.bind()`), mai concatenazione di stringhe SQL — è l'unico modo per evitare SQL injection.
- Indice sulle colonne usate per lookup frequenti (es. `customer_id` su `points_log` e `spins`).

### Capacitor (Android)
- Preferire plugin ufficiali (`@capacitor/push-notifications`) invece di scrivere codice nativo custom.
- `npx cap sync android` dopo ogni modifica a plugin o config nativa, altrimenti l'app Android non vede le modifiche.
- FCM/push va testato su device fisico: l'emulatore Android spesso non riceve notifiche push in modo affidabile.

### Firebase Cloud Messaging
- Un solo punto di contatto: `push.ts` nel Worker. Nessun SDK Firebase lato app o admin.
- Il token del dispositivo è un dato nostro (tabella `device_tokens`), non gestito via Firebase Auth/Firestore.

### Testing
- `vitest` per la logica pura (estrazione pesata della ruota, calcolo punti) — TDD: test rosso, poi implementazione.
- `@cloudflare/vitest-pool-workers` per testare le route del Worker con binding D1 reali, non mockati.
- Test end-to-end manuali (curl/Postman) restano validi per il pilot come da [PLAN.md](PLAN.md), ma non sostituiscono i test automatici sulla business logic critica.

## Stile dei commit

[Conventional Commits](https://www.conventionalcommits.org/): `<tipo>(<scope opzionale>): <descrizione imperativa>`.

Tipi principali:
- `feat`: nuova funzionalità (es. `feat(api): add weighted prize draw for wheel spin`)
- `fix`: correzione di un bug
- `refactor`: cambio di struttura senza cambiare comportamento
- `test`: aggiunta/modifica di test (tipico nel flusso TDD: commit del test, poi commit dell'implementazione)
- `chore`: manutenzione (config, dipendenze, wrangler.jsonc, ecc.), nessun impatto sul comportamento
- `docs`: solo documentazione (README, CLAUDE.md, PLAN.md)

Scope consigliato = sottoprogetto coinvolto: `api`, `app`, `admin`. Descrizione in inglese, imperativa, minuscola, senza punto finale.

## Sicurezza

- Il client non decide mai un esito di business logic: la ruota della fortuna è server-authoritative, il risultato si calcola e si registra sul Worker, l'app si limita ad animare quello che il server ha già deciso.
- Gli endpoint `/admin/*` richiedono sempre autenticazione, anche minima nel pilot — mai lasciarli aperti.
