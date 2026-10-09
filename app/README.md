# ale-style-app

App Android della cliente (Capacitor + Vue 3 + TypeScript): tessera con saldo punti, offerte, ruota della fortuna settimanale e notifiche push. Parla solo con l'API in [../api](../api/README.md) (nessun SDK di terzi). Contesto in [../README.md](../README.md) e [../PLAN.md](../PLAN.md).

Stato: schermate e piattaforma Android generata, verificato solo come build web. **Non ancora provata** su telefono né con push reali (serve Firebase, vedi sotto).

## Comandi

| Comando | Cosa fa |
| --- | --- |
| `npm install` | Installa le dipendenze |
| `npm run dev` | Dev server su http://localhost:5174 (o la prima porta libera) per provare le schermate nel browser; le chiamate all'API vengono girate al Worker locale (`localhost:8787`) |
| `npm test` | Test (`vitest`): client HTTP e geometria della ruota |
| `npm run build` | Typecheck (`vue-tsc`) + build in `dist/` |
| `npm run android` | Build + `cap sync android` + apre Android Studio |

Dopo ogni modifica a plugin o config nativa: `npx cap sync android`.

## Schermate

| Rotta | Cosa fa |
| --- | --- |
| `/login` | Nome + cellulare (`POST /login`), niente OTP nel pilot |
| `/` | Saldo punti (`GET /me`) e scorciatoie |
| `/offers` | Offerte personali e broadcast (`GET /offers`) |
| `/wheel` | Ruota della fortuna: la ruota si disegna con `GET /prizes`, `POST /spin` decide il premio **sul server**, l'app anima solo l'arresto sul segmento già deciso; `GET /spin/status` abilita/disabilita il pulsante |

## Struttura

```
src/
  http.ts / api.ts      # fetch verso l'API, un'funzione per endpoint; su 401 la sessione termina
  wheelGeometry.ts      # logica pura: angolo di arresto e gradiente della ruota (TDD)
  composables/          # useSession (token in localStorage), useWheel, usePush, useAsyncAction
  views/                # una view per rotta
```

## Provare su telefono Android

1. API raggiungibile dal telefono: imposta `VITE_API_URL` (es. `VITE_API_URL=http://<IP-del-PC>:8787 npm run build`) — in dev il proxy di Vite non esiste dentro l'app. Il Worker abilita già CORS. Per HTTP in chiaro su Android può servire `server.cleartext` in `capacitor.config.ts`; con il Worker deployato (HTTPS) non serve.
2. `npm run android`, poi Run da Android Studio con il telefono in USB debugging.

## Push (FCM) — da fare

Il plugin `@capacitor/push-notifications` è installato e `usePush.ts` registra il token con `POST /device-token`, ma su Android serve il file `google-services.json` del progetto Firebase in `android/app/` (è ignorato da git). Console Firebase → impostazioni progetto → app Android con package `it.alestyle.loyalty` → scarica `google-services.json`. Da testare su device fisico.
