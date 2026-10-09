# ale-style-admin

Pannello web per la proprietaria del salone (utente non tecnica): cerca clienti, aggiunge punti, crea offerte (personali o per tutti), configura i premi della ruota. Vue 3 + TypeScript + Vite; parla solo con l'API in [../api](../api/README.md). Contesto in [../README.md](../README.md) e [../PLAN.md](../PLAN.md).

Stato: tutte le pagine del pilot sono implementate. **Manca**: deploy su Cloudflare Pages (richiede anche CORS sul Worker, vedi sotto).

## Comandi

| Comando | Cosa fa |
| --- | --- |
| `npm install` | Installa le dipendenze |
| `npm run dev` | Dev server su http://localhost:5173. Gira le chiamate `/admin/*` al Worker locale (`localhost:8787`, avviato con `npm run dev` in `api/`), quindi in sviluppo non serve CORS |
| `npm test` | Test (`vitest`) del client HTTP |
| `npm run build` | Typecheck (`vue-tsc`) + build in `dist/` |

La password da usare in locale è `ADMIN_PASSWORD` in `api/.dev.vars` (default `changeme-admin-password`).

## Pagine

| Rotta | Cosa fa |
| --- | --- |
| `/login` | Inserisce la password admin; viene verificata con una chiamata reale all'API |
| `/` | Lista clienti con saldo punti, ricerca per nome/telefono |
| `/loyalty` | **Regola fedeltà**: ogni quanti punti si ottiene uno sconto e di quanti euro (default 100 punti = 5 €). Vale subito per tutti |
| `/customers/:id` | Barra **fedeltà** del cliente con pulsante "Usa sconto". Se ci sono più sconti sbloccati compare il flag **"Usa tutti gli sconti sbloccati"** (acceso di default, solo in quel riquadro): acceso usa tutti gli sconti in un colpo solo (es. "Usa 2 sconti · 10 €"), spento ne usa uno. Scala i punti dal saldo e chiede conferma con l'importo; aggiunge (o sottrae) punti con motivo; crea un'offerta personale con push; vede i **premi vinti alla ruota** e li segna come usati (vale una volta sola, entro 30 giorni; chiede conferma), **azzera il PIN** di un cliente che l'ha dimenticato (chiede conferma: farlo solo dopo aver riconosciuto la persona) |
| `/broadcast` | Crea un'offerta per tutti i clienti con push |
| `/prizes` | Elenco premi della ruota con probabilità calcolata dai pesi; crea e modifica premi |

## Struttura

```
src/
  http.ts          # fetch verso l'API con Bearer, errori tipizzati (ApiError) — testato
  api.ts           # una funzione per endpoint /admin/*; su 401 esegue il logout
  composables/     # useAuth (password in localStorage), useAsyncAction (busy/errore)
  components/      # OfferForm (condiviso da broadcast e dettaglio cliente), WonPrizesList (premi vinti + riscatto), LoyaltyCard + LoyaltyBar (barra fedeltà)
  views/           # una view per rotta
  assets/          # logo Ale Style (stesso del sito)
  styles/global.css  # variabili colore e reset — tema nero/oro come il sito, font Playfair Display + Lato (@fontsource, self-hosted)
```

## Note

- Autenticazione del pilot: la password condivisa è salvata in `localStorage` e inviata come `Authorization: Bearer` a ogni richiesta (vedi [../api/README.md](../api/README.md)).
- `VITE_API_URL` (opzionale) imposta l'URL base dell'API per la build di produzione; vuoto = stessa origine. Il Worker oggi **non** abilita CORS: va aggiunto al momento del deploy su Pages.
- L'API non ha `GET /admin/customers/:id`: il dettaglio cliente filtra la lista. Va bene per il pilot; da aggiungere se i clienti crescono.
