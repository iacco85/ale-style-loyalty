# ale-style-app

App Android della cliente (Capacitor + Vue 3 + TypeScript): tessera con saldo punti, offerte, ruota della fortuna (ogni quanti giorni si gira lo decide la titolare dall'admin) e notifiche push. Parla solo con l'API in [../api](../api/README.md) (nessun SDK di terzi). Contesto in [../README.md](../README.md) e [../PLAN.md](../PLAN.md).

Stato: provata su tablet Android (Galaxy Tab A7, Android 12) il 10 ottobre 2026: login, sezioni, ruota, tasto indietro e prima push reale. Manca la prova dello sblocco biometrico su un telefono con impronta.

## Comandi

| Comando | Cosa fa |
| --- | --- |
| `npm install` | Installa le dipendenze |
| `npm run dev` | Dev server su http://localhost:5174 (o la prima porta libera) per provare le schermate nel browser; le chiamate all'API vengono girate al Worker locale (`localhost:8787`) |
| `npm test` | Test (`vitest`): client HTTP e geometria della ruota |
| `npm run build` | Typecheck (`vue-tsc`) + build in `dist/` |
| `npm run android` | Build + `cap sync android` + apre Android Studio |
| `npm run android:install` | Build + `cap sync android` + compila l'APK di debug e lo installa sul dispositivo collegato in USB, senza aprire Android Studio (`scripts/install-android.mjs`, funziona su Windows e Linux). Serve Java 21 |

Dopo ogni modifica a plugin o config nativa: `npx cap sync android`.

## Schermate

| Rotta | Cosa fa |
| --- | --- |
| `/login` | Cellulare + **PIN a 4-6 cifre** (`POST /login`). Al primo accesso il PIN scelto diventa quello della cliente (e il nome serve solo allora). Dopo 5 PIN errati l'account si blocca 15 minuti; se lo dimentica, la titolare lo azzera dall'admin. **Dopo il primo accesso l'app ricorda nome e telefono** (`useRememberedAccount`, mai il PIN né il token): dopo un logout o una sessione scaduta chiede solo il PIN, con "Non sei X? Cambia account" per ripartire da zero |
| `/` | Saldo punti con **barra fedeltà** verso il prossimo sconto in euro (`loyalty` di `GET /me`), riquadro con l'**importo totale** degli sconti sbloccati (es. "10 €", con sotto "2 sconti da 5 € ciascuno"), scorciatoie e interruttore **sblocco con impronta/volto** |
| `/offers` | Offerte personali e broadcast (`GET /offers`) |
| `/prizes` | **I tuoi premi** (`GET /my-prizes`): premi vinti alla ruota con stato *Da usare* / *Usato* / *Scaduto* e scadenza (30 giorni dalla vincita). Si usano mostrandoli in salone: li segna come usati la titolare dall'admin |
| `/wheel` | Ruota della fortuna (SVG, `WheelDisc.vue`): i premi di `GET /prizes` sono **ripetuti in giro finché ci sono almeno 8 spicchi** (con 2 premi: 8 spicchi alternati) e ogni spicchio mostra il nome del premio, a capo su al massimo 2 righe da 16 caratteri (oltre si taglia con "…": meglio nomi sotto i 30 caratteri). Gli spicchi sono tutti uguali, quindi le probabilità reali restano private. La ruota si disegna con `GET /prizes`, `POST /spin` decide il premio **sul server**, l'app anima solo l'arresto sul segmento già deciso; `GET /spin/status` abilita/disabilita il pulsante |

## Splash screen

All'apertura dell'app (`SplashScreen.vue` + `useSplash`) il logo compare al centro su sfondo nero con un fade-in di 1 secondo, resta fino a 1,8 secondi e poi sfuma in 0,5 secondi sulla schermata successiva; con "riduci animazioni" attivo nel telefono il logo compare senza animazione. Compare solo all'avvio, non quando si torna dal background. Il lancio nativo di Android (prima che parta l'app) è solo nero (`styles.xml`, `splash_background` in `colors.xml`, `backgroundColor` in `capacitor.config.ts`), così non si vede né il logo di default di Capacitor né un lampo bianco. **Il lato nativo non è stato compilato né provato su telefono** (serve Android Studio).

## Aggiornamento automatico dei dati

Tessera, Offerte e Premi si aggiornano da sole (`useLiveData` + `useAutoRefresh`): rileggono i dati quando l'app torna in primo piano, quando la pagina torna visibile e ogni 30 secondi mentre è aperta. L'aggiornamento è silenzioso: non mostra caricamenti e, se la rete cade, lascia i dati già visibili senza errori. Se la sessione scade mentre si è su una pagina, l'app torna al login. Anche la Ruota si aggiorna così (premi cambiati dall'admin, giro di nuovo disponibile), ma **mai durante un giro**: cambiare gli spicchi mentre gira la farebbe fermare sul premio sbagliato (`useWheel`). La logica di caricamento è in `src/liveData.ts` (testata). Le push (vedi sotto) sono solo un avviso: i dati li porta comunque l'aggiornamento automatico.

## Sblocco biometrico

Dopo il primo accesso la sessione resta salvata (non si rifà il login). Dalla Home la cliente può attivare lo **sblocco con impronta o volto**: da quel momento l'app mostra una schermata di blocco a ogni apertura e quando torna in primo piano dopo più di 60 secondi (`src/lockPolicy.ts`, testata). È solo un blocco locale sul telefono: non sostituisce il login, che resta telefono + PIN. Se la biometria fallisce o non è disponibile, "Accedi con il PIN" chiude la sessione e riporta al login.

Plugin: `@capgo/capacitor-native-biometric` (non esiste un plugin biometrico ufficiale Capacitor; supporta Capacitor 8) + `@capacitor/app` per rilevare ritorno in primo piano. Permesso `USE_BIOMETRIC` in `AndroidManifest.xml`. Su Android il prompt non può offrire il PIN del telefono come alternativa. Il toggle compare solo su telefono con biometria configurata (non nel browser). **Da provare su telefono reale.**

## Struttura

```
src/
  http.ts / api.ts      # fetch verso l'API, un'funzione per endpoint; su 401 la sessione termina
  wheelGeometry.ts      # logica pura: spicchi ripetuti, scelta dello spicchio, geometria SVG, angolo di arresto (TDD)
  lockPolicy.ts         # logica pura: quando bloccare al ritorno in primo piano (TDD)
  pushScreen.ts         # logica pura: quale schermata aprire toccando una notifica (TDD)
  biometrics.ts         # unico punto che parla col plugin biometrico
  liveData.ts           # caricamento dati con aggiornamenti silenziosi in background (TDD)
  composables/          # useLiveData, useAutoRefresh, useSession, useRememberedAccount (token in localStorage), useWheel, usePush, useBiometricLock, useAsyncAction
  views/                # una view per rotta
```

## Provare su telefono Android

1. API raggiungibile dal telefono: `app/.env.production.local` con `VITE_API_URL=https://api.alestyle.it` (ignorato da git). In dev il proxy di Vite non esiste dentro l'app.
2. Debug USB attivo sul dispositivo e popup "Consentire il debug USB?" accettato; `adb devices` deve mostrarlo come `device`.
3. `npm run android:install`, poi apri l'app dal tablet o telefono. Gli aggiornamenti si installano sopra la versione precedente: dati di accesso e permessi restano.
4. Log dell'app: `adb logcat -s Capacitor:* Capacitor/Console:*`.

## Push (FCM)

`usePush.ts`, dopo il login, chiede il permesso per le notifiche e registra il token del dispositivo con `POST /device-token`. Su Android serve il file `google-services.json` del progetto Firebase in `android/app/` (ignorato da git): console Firebase → impostazioni progetto → app Android `it.alestyle.loyalty` → scarica `google-services.json`.

Toccando una notifica l'app apre la schermata indicata dal Worker nei `data` della push (`screen`: `home`, `offers`, `prizes`, vedi `src/pushScreen.ts`): Tessera per punti e sconti usati, Offerte per le offerte, I tuoi premi per i premi usati. Funziona anche ad app chiusa: Capacitor conserva il tocco finché l'app non registra il listener, quindi se la sessione è scaduta la schermata si apre dopo il login. Con il blocco biometrico attivo la schermata si apre sotto il blocco, che resta da superare. Le push arrivano nella barra di sistema solo ad app chiusa o in background.
