# App fedeltà "Ale Style" — pilot nativo Android (Capacitor + Vue)

## Contesto

L'utente vuole costruire un'app mobile con tessera fedeltà, notifiche push e offerte personalizzate, pensata in futuro come prodotto white-label da vendere ad altri negozi. Non avendo mai pubblicato un'app mobile, si è deciso di partire da un **pilot reale**: l'app per il salone di parrucchiera della sorella, "Ale Style" (Rimini) — il cui sito attuale (repo `ale-style`, Vue 3 + TS + Vite, deployato su Cloudflare via wrangler) conferma nome, settore e che l'utente ha già familiarità con lo stack Cloudflare.

Decisioni prese nella conversazione:
- **Nativa, non PWA**: la scarsa scopribilità di "Aggiungi a Home" su iOS è stata giudicata un rischio di adozione troppo alto.
- **Si parte da Android** (Mac 2013 non aggiornabile → iOS nativo rimandato).
- **Stack app: Capacitor + Vue 3 + TypeScript** — riusa le competenze già dimostrate nel repo `ale-style`; produce un'app Android vera (APK reale via Play Store in futuro, non una PWA installata).
- **Progetto separato** dal repo `ale-style` esistente.
- **Backend proprio, non accoppiato a un vendor**: l'app e il pannello admin devono parlare con una **API nostra**; Firebase (o chiunque altro) resta un dettaglio implementativo nascosto dietro quella API, sostituibile in futuro senza toccare il codice di app/admin.
- **Serve un pannello admin vero**, non la console Firebase: la sorella non è un'utente tecnica, quindi la gestione di punti e offerte deve avvenire da un'interfaccia semplice pensata per lei.

## Architettura

```
[App Android (Capacitor+Vue)] ─┐
                                ├──HTTP──▶ [API su Cloudflare Worker] ──▶ [Cloudflare D1 (SQL)]
[Admin web (Vue)] ─────────────┘                      │
                                                        └──▶ [Firebase Cloud Messaging]
                                                             (solo invio push, isolato in 1 modulo)
```

- **Backend/API**: **Cloudflare Worker** in TypeScript (stesso ecosistema già usato in `ale-style`, l'utente lo conosce già). Espone endpoint REST propri (`/login`, `/me`, `/offers`, `/device-token`, `/admin/...`) — né l'app né l'admin panel chiamano mai SDK di terzi direttamente.
- **Storage**: **Cloudflare D1** (SQLite gestito), tabelle `customers`, `points_log`, `offers`. Scelto perché relazionale (si adatta bene a clienti/punti/offerte), incluso nello stesso account Cloudflare, nessun servizio esterno da gestire.
- **Invio push**: Android richiede obbligatoriamente **Firebase Cloud Messaging** come canale di trasporto (è un vincolo di sistema operativo, non una scelta di vendor — vale anche per chi non usa nessun altro prodotto Firebase, esattamente come iOS richiede APNs). Per rispettare "niente lock-in nel codice applicativo", l'uso di FCM è confinato a **un solo modulo del Worker** (`sendPush()`), mai esposto ad app o admin: se in futuro serve un altro sistema di notifiche (es. per iOS con APNs, o un provider terzo), si cambia solo quel modulo.
- **App mobile** (Capacitor + Vue + TS): parla solo con la nostra API via `fetch`; usa il plugin `@capacitor/push-notifications` solo per ottenere il token del dispositivo (da mandare alla nostra API) e per mostrare le notifiche ricevute.
- **Admin web** (Vue + TS, nuovo piccolo progetto o pagina protetta): interfaccia semplice per la sorella — cerca cliente, aggiunge punti, crea un'offerta per un cliente specifico (invia push mirata), manda un'offerta broadcast a tutti.

## Scope del pilot (MVP)

Copre le quattro funzionalità richieste, con un backend reale ma minimo:

1. **Tessera fedeltà**: cliente vede saldo punti nell'app; sorella aggiunge punti da pannello admin.
2. **Notifiche push**: infrastruttura FCM end-to-end (token, invio, ricezione), ma incapsulata dietro la nostra API.
3. **Offerte personalizzate**: la sorella crea un'offerta per una cliente specifica dal pannello admin → push mirata automatica.
4. **Ruota della fortuna**: la cliente può girare **una volta a settimana**; il risultato (sconto, piccolo premio, o "hai perso") è deciso **dal server**, mai dal client, con probabilità pesate per rendere i premi importanti rari. La sorella configura premi/probabilità dal pannello admin.

Semplificazioni deliberate per il pilot (riviste in base al feedback, non più "usa la console Firebase"):
- **Login clienti con PIN**: numero di telefono + PIN a 4-6 cifre scelto al primo accesso, senza OTP via SMS (evita costi/complessità di un provider SMS). Blocco di 15 minuti dopo 5 PIN errati, reset dall'admin se dimenticato. Sblocco biometrico (impronta/volto) locale all'apertura dell'app. Verifica via SMS aggiungibile in seguito.
- **Admin panel minimo ma reale**: lista clienti, dettaglio cliente con pulsante "+1 punto" / punti manuali, form "crea offerta". Niente autenticazione sofisticata per l'admin nel pilot (una password condivisa/semplice va bene per iniziare, essendo un solo utente — la sorella).

## Ruota della fortuna

Va trattata come una funzionalità **server-authoritative**: il client non deve mai poter decidere o influenzare l'esito, altrimenti è banale barare (basta guardare/modificare la richiesta). Design:

- **Tabelle D1 aggiuntive**:
  - `prizes` (id, label, type: `discount` | `points` | `none`, value, weight) — `weight` è il peso relativo nella lotteria; "hai perso" è semplicemente un premio con `type = none` e peso alto.
  - `spins` (id, customer_id, prize_id, spun_at) — log di ogni tentativo, usato sia per la cronologia sia per far rispettare il cooldown.
- **Endpoint** `POST /spin`: il Worker verifica lato server se è passata almeno 1 settimana dall'ultimo spin di quel cliente (query su `spins`); se sì, estrae un premio pesato a caso tra `prizes`, lo registra in `spins`, e lo restituisce. Se il cooldown non è scaduto, risponde con l'errore e la data del prossimo spin disponibile.
- **Endpoint** `GET /spin/status`: dice all'app se la cliente può girare ora o quando potrà farlo di nuovo (per mostrare/nascondere il pulsante "Gira").
- **Admin**: nuova pagina in `ale-style-admin` per creare/modificare i premi e i relativi pesi (es. "hai perso" peso 70, "-5% prossimo servizio" peso 20, "-15%" peso 8, "trattamento omaggio" peso 2) — così la sorella controlla da sé quanto è facile vincere, senza dover chiedere modifiche al codice.
- **App**: nuova view `WheelView.vue` con animazione della ruota che si ferma sul premio restituito dal server (l'animazione è solo estetica, il risultato è già deciso).

## Struttura dei nuovi progetti

> **Aggiornamento (ottobre 2026):** i tre progetti non sono repo separati come qui sotto ma tre cartelle di un unico repo — `api/`, `app/`, `admin/` — con i comandi di sviluppo nella root (`npm run dev`, `stop`, `logs`). Lo schema qui sotto resta valido come mappa dei file, ma i nomi delle cartelle sono quelli del repo.

Due cartelle sibling a `ale-style`:

```
ale-style-api/                  # Cloudflare Worker
  src/
    index.ts                    # routing
    routes/customers.ts
    routes/offers.ts
    routes/spin.ts               # logica ruota della fortuna (server-authoritative)
    routes/admin.ts
    push.ts                     # unico punto che parla con FCM
    db.ts                       # query D1
  wrangler.jsonc
  schema.sql                    # definizione tabelle D1 (incl. prizes, spins)

ale-style-app/                  # Capacitor + Vue (Android)
  src/
    views/
      LoginView.vue
      HomeView.vue               # tessera fedeltà
      OffersView.vue
      WheelView.vue               # ruota della fortuna
    api.ts                       # client per ale-style-api
    firebase.ts                  # solo init FCM lato client (ricezione token)
  capacitor.config.ts
  android/

ale-style-admin/                 # Vue (web), pannello per la sorella
  src/
    views/
      LoginView.vue
      CustomersView.vue
      CustomerDetailView.vue     # aggiungi punti, crea offerta
      PrizesView.vue              # configura premi/probabilità della ruota
```

## Passi implementativi

Stato aggiornato a ottobre 2026 (✅ fatto e verificato · 🟡 fatto in parte · ⬜ da fare):

1. ✅ **Backend**: Worker + D1 con schema completo (`customers`, `points_log`, `offers`, `device_tokens`, `prizes`, `spins`, più `loyalty_settings`), endpoint cliente (`/login`, `/me`, `/offers`, `/device-token`) con test su D1 reale.
2. 🟡 **Firebase / push**: `push.ts` implementato (JWT del service account + API HTTP v1). Progetto Firebase `ale-style-loyalty` creato, app Android `it.alestyle.loyalty` registrata, segreti `FCM_*` caricati sul Worker. **Manca** una prova reale su telefono.
3. ✅ **Endpoint admin** protetti da password condivisa: clienti, punti, offerte singole e broadcast, premi, più reset PIN, regola fedeltà, premi vinti e riscatti.
4. ✅ **Ruota**: `POST /spin`, `GET /spin/status`, `GET /prizes`, estrazione pesata e cooldown di 7 giorni lato server (interruttore solo-sviluppo per disattivarlo).
5. 🟡 **App mobile**: tutte le schermate funzionano e sono provate nel browser; piattaforma Android generata con `cap add android`. **Mai compilata** per Android (serve Android Studio) né provata su telefono.
6. ✅ **Admin web**: clienti, dettaglio (punti, fedeltà, premi vinti, offerte, reset PIN), offerta a tutti, premi della ruota, regola fedeltà.
7. ✅ **Deploy**: Worker (`ale-style-api.iacco85.workers.dev`), D1 remoto con schema, segreti `AUTH_SECRET` e `ADMIN_PASSWORD`, admin su Pages (`ale-style-admin.pages.dev`) provato con login. Dominio `admin.alestyle.it` attivo su Pages (record DNS su Cloudflare). Segreti `FCM_*` caricati.
8. ⬜ **Prova su telefono reale**: `cap sync`, Android Studio, debug USB; verificare push, sblocco biometrico e splash nativo. **Android Studio non è ancora installato** (il PC di lavoro non è adatto: si riparte da un altro computer, vedi sotto).

## Decisioni prese dopo il piano iniziale

Emerse costruendo e provando il pilot; sostituiscono dove serve quanto scritto sopra:

- **Login con PIN** (al posto di nome + telefono senza verifica): PIN di 4-6 cifre scelto al primo accesso, hash PBKDF2 con salt, blocco di 15 minuti dopo 5 errori, reset dall'admin se dimenticato. Dopo il primo accesso l'app ricorda nome e telefono (mai il PIN) e chiede solo il PIN. L'SMS con OTP resta una possibile evoluzione.
- **Sblocco biometrico** locale (impronta/volto) all'apertura dell'app e al ritorno dal background dopo 60 secondi; non sostituisce il login.
- **Premi della ruota**: gli spicchi sono tutti uguali e i premi si ripetono sulla ruota (minimo 8 spicchi) con il nome scritto sopra, così le probabilità reali restano private. I premi di tipo sconto vanno in "I tuoi premi", valgono **30 giorni** e si usano una volta sola: li segna come usati la titolare dall'admin. I premi di tipo punti vengono **accreditati subito** nel saldo.
- **Fedeltà a punti**: la titolare aggiunge i punti a fine appuntamento come previsto. Una **regola configurabile** dall'admin (default 100 punti = 5 €) genera sconti in euro; nell'app una barra mostra l'avanzamento e l'importo totale degli sconti sbloccati (cumulabili, senza scadenza). "Usa sconto" nell'admin li scala dal saldo, con un flag acceso di default per usarli tutti insieme.
- **Aggiornamento dati nell'app**: tessera, offerte e premi si rileggono da soli (rientro nell'app, pagina visibile, ogni 30 secondi), senza notifiche.
- **Grafica**: tema nero e oro come il sito Ale Style (logo, Playfair Display + Lato), splash screen con logo in fade-in.
- **Sviluppo**: `npm run dev` avvia API, admin e app in background con i log in `.dev-logs/`; `npm run stop` e `npm run logs` per fermare e leggere. Niente `Co-Authored-By` di Claude nei commit.

## Navigazione dell'app (da implementare)

Segnalato provando l'app: dalla sezione Ruota non si riusciva a tornare indietro. Oggi la navigazione è solo la barra in basso (Tessera, Offerte, Ruota, Premi) più i collegamenti nelle pagine; **non c'è nessuna gestione esplicita del tasto/gesto "indietro" di Android** e le schermate non hanno un pulsante "indietro" proprio. Su Android il sistema ha già il suo tasto o gesto indietro e Capacitor lo collega alla cronologia del browser, ma il comportamento oggi è solo quello di default e non è stato mai provato su telefono.

**Da verificare prima di intervenire**: in una seconda prova la barra in basso era visibile e quindi permetteva di cambiare sezione; la prima volta non si vedeva e non si riusciva a lasciare la Ruota. Non sappiamo perché (finestra del browser troppo bassa o di dimensioni particolari, caricamento non terminato, o un difetto della barra fissa). Va riprodotto e capito: controllare la barra a diverse altezze di schermo, anche con la tastiera aperta e con la barra di sistema di Android (`safe-area`), e solo dopo decidere se è un difetto o serve solo la gestione del tasto indietro qui sotto.

Cosa va deciso e fatto:

- **Tasto/gesto indietro di Android** gestito esplicitamente (`@capacitor/app`, evento `backButton`): da una sezione diversa dalla Home riporta alla **Home**; dalla Home chiude l'app (non torna al login né a pagine precedenti). Non deve mai riportare allo splash o al login quando si è già dentro.
- **Barra in basso senza accumulare cronologia**: cambiare sezione con la barra sostituisce la voce di cronologia invece di aggiungerne una, così "indietro" non ripassa da tutte le sezioni visitate.
- **Pulsante "indietro" dentro la pagina** per le schermate che non sono sezioni principali (se ne aggiungeremo, ad esempio un dettaglio di un premio), così non si dipende solo dal gesto di sistema.
- **Durante il giro della ruota** "indietro" va ignorato fino a fine animazione, per non perdere il risultato mostrato.
- **Con il blocco biometrico attivo** "indietro" non deve aggirare la schermata di blocco.
- **Prova su telefono** del comportamento, perché nel browser il tasto indietro è quello del browser e non quello di Android.

## Come procediamo con le configurazioni

Scelta dell'utente: le configurazioni fuori dal codice (account e servizi esterni) si fanno **guidati passo passo**, non tutte insieme.

- **Un passo alla volta**: ogni passo dice cosa si fa e perché, il comando o il clic esatto, e cosa dovrebbe comparire se è andato bene. Si passa al successivo solo dopo la conferma.
- **Chi fa cosa**: le azioni che toccano gli account dell'utente (login, creazione di risorse, segreti, console Firebase, Android Studio) le esegue l'utente, con le istruzioni; il codice e la verifica dei risultati li fa Claude.
- **Segreti**: mai incollati in chat né committati; vanno inseriti direttamente con `wrangler secret put` o nei file ignorati da git.
- **Si verifica ogni passo** prima di andare avanti (es. un `curl` sull'API appena deployata), così un errore si trova subito e non alla fine.

Sequenza prevista, ognuna divisa in passi piccoli:

1. **Cloudflare**: `wrangler login` → creare il database D1 e mettere il `database_id` in `wrangler.jsonc` → applicare lo schema in remoto → impostare i segreti (`AUTH_SECRET`, `ADMIN_PASSWORD`, `FCM_*`) → deploy del Worker → prova con `curl`.
2. **Admin su Pages**: build con `VITE_API_URL` che punta al Worker → deploy → login di prova.
3. **Firebase**: aggiungere l'app Android (`it.alestyle.loyalty`) → scaricare `google-services.json` in `app/android/app/`.
4. **Android**: installare Android Studio e abilitare il debug USB sul telefono → `npm run android` → provare l'app sul telefono (login, ruota, sblocco biometrico, splash, push).

## Stato delle configurazioni (ottobre 2026)

Fatte, guidate passo passo: Cloudflare (login, D1 `ale-style-loyalty`, schema remoto, segreti `AUTH_SECRET`/`ADMIN_PASSWORD`/`FCM_*`, Worker `ale-style-api.iacco85.workers.dev`), admin su Pages (`ale-style-admin`, dominio `admin.alestyle.it`), progetto Firebase e app Android registrata.

**Da fare**: Android Studio e prova sul telefono (passo 4 della sequenza sopra). Ripartenza dal **nuovo PC** (quello di lavoro non va toccato):
- Clonare il repo e `npm install` in `api/`, `app/`, `admin/`.
- File **non versionati** da ricreare: `api/.dev.vars` (copia di `.dev.vars.example`); `app/android/app/google-services.json` (da scaricare di nuovo: console Firebase → Impostazioni progetto → le tue app → `it.alestyle.loyalty`); `admin/.env.production.local` con `VITE_API_URL=https://ale-style-api.iacco85.workers.dev` (serve solo per ripubblicare l'admin).
- `npx wrangler login` da rifare, solo se serve ripubblicare. I segreti sono già sul Worker.
- La chiave privata del service account Firebase (file `...adminsdk...json`) **non va copiata** sul nuovo PC: il Worker la ha già. Va tolta dai Download del PC di lavoro.
- Installare Android Studio, abilitare il debug USB sul telefono, poi `npm run android` nella cartella `app/`.

## Prossimi passi

1. **Prova su telefono** (passo 8): installare Android Studio sul nuovo PC e compilare l'app. Sblocca anche la verifica delle push.
2. **Navigazione dell'app** (sezione sopra): tasto indietro di Android, cronologia pulita, pulsanti indietro nelle schermate secondarie.
3. **Notifiche push** sugli eventi utili: punti aggiunti, sconto sbloccato (e, in futuro, premio in scadenza). Toccandole l'app si apre sulla pagina giusta; l'aggiornamento automatico resta la fonte affidabile dei dati, la push è solo un avviso.
4. **Regole più strette sugli sconti** se servono (un solo sconto per appuntamento, scadenza degli sconti fedeltà).
5. Poi la **Fase 2** qui sotto.

## Backlog — Fase 2 (dopo il pilot base)

Idee emerse in fase di progettazione delle offerte, deliberatamente rimandate per non allargare lo scope del pilot: il Passo 3 (endpoint `/admin/*`) resta com'è oggi (offerte manuali create dalla sorella). Vanno fatte "al 100%", ma dopo che il giro base (punti → offerta manuale → push → ruota) funziona end-to-end. Rimandarle non richiede rework di quanto già costruito, a patto di rispettare la nota sotto su `last_visit_at`.

- **Offerta di compleanno**: `ALTER TABLE customers ADD COLUMN birth_date` (nullable, additivo); serve raccogliere la data (campo in più su `/login` o un futuro `PATCH /me`); un cron trigger giornaliero sul Worker (`scheduled()`, nativo Cloudflare) individua chi compie gli anni e genera offerta + push automatica.
- **Offerta "non viene da un po'" (win-back)**: **non aggiungere una colonna `last_visit_at` su `customers`** — si calcolerebbe da denormalizzare e richiederebbe un backfill da `points_log` per i clienti già esistenti. Meglio calcolare l'ultima visita on-the-fly con `MAX(created_at)` su `points_log` (già ha i timestamp): zero schema, zero migrazione. Servirà una funzione pura `isInactive()` (TDD, regola di eligibilità offerte) + un cron periodico che genera l'offerta.
- **Programma "porta un'amica"**: nuova tabella `referrals` (referrer_id, referred_id, stato/redeemed_at) — additiva; il flusso di login/signup accetta un codice invito opzionale (cambio additivo, non breaking); serve una regola di eligibilità per sbloccare lo sconto a entrambe le clienti quando la nuova cliente completa la prima visita; è l'unica delle tre che richiede anche superficie UI nuova nell'app (mostrare/condividere il proprio codice invito).

## Verifica end-to-end

- Backend: test degli endpoint con `curl`/Postman prima di collegare l'app (login crea cliente in D1, `/admin/.../points` aggiorna il saldo, `/admin/.../offers` crea offerta e devo vedere la chiamata a FCM nei log del Worker).
- App: `npm run dev` per le view in browser; poi build Android reale sul telefono della sorella via USB debugging (nessun account Play Store richiesto in questa fase).
- Admin: aprire `ale-style-admin` in browser, aggiungere punti a un cliente di test, creare un'offerta personalizzata e verificare che la notifica arrivi sul telefono Android collegato.
- Test broadcast: endpoint `/admin/broadcast` → verificare ricezione su più dispositivi di test.
- Test ruota: chiamare `POST /spin` più volte di fila con lo stesso cliente → deve rifiutare i tentativi prima di 7 giorni; verificare che sull'estrazione ripetuta (es. 100 chiamate di test con cooldown disattivato in un ambiente di prova) la distribuzione dei premi rispetti i pesi configurati.
