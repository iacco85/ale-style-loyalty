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
2. ✅ **Firebase / push**: `push.ts` implementato (JWT del service account + API HTTP v1). Progetto Firebase `ale-style-loyalty` creato, app Android `it.alestyle.loyalty` registrata, segreti `FCM_*` caricati sul Worker. Provata il 10 ottobre 2026 sul tablet: offerta dall'admin → notifica ricevuta ad app chiusa.
3. ✅ **Endpoint admin** protetti da password condivisa: clienti, punti, offerte singole e broadcast, premi, più reset PIN, regola fedeltà, premi vinti e riscatti.
4. ✅ **Ruota**: `POST /spin`, `GET /spin/status`, `GET /prizes`, estrazione pesata e cooldown di 7 giorni lato server (interruttore solo-sviluppo per disattivarlo).
5. 🟡 **App mobile**: tutte le schermate funzionano e sono provate nel browser; piattaforma Android generata con `cap add android`. **Mai compilata** per Android (serve Android Studio) né provata su telefono.
6. ✅ **Admin web**: clienti, dettaglio (punti, fedeltà, premi vinti, offerte, reset PIN), offerta a tutti, premi della ruota, regola fedeltà.
7. ✅ **Deploy**: Worker (`api.alestyle.it`, anche `ale-style-api.iacco85.workers.dev`), D1 remoto con schema, segreti `AUTH_SECRET` e `ADMIN_PASSWORD`, admin su Pages (`ale-style-admin.pages.dev`) provato con login. Dominio `admin.alestyle.it` attivo su Pages (record DNS su Cloudflare). Segreti `FCM_*` caricati.
8. 🟡 **Prova su dispositivo reale**: 10 ottobre 2026, su tablet Samsung Galaxy Tab A7 (SM-T500, Android 12) via debug USB. Compilazione e installazione ok, registrazione, login, logout e nuovo login col solo PIN ok, permesso notifiche concesso e token FCM ottenuto. Prima **push vera ricevuta** (offerta creata dall'admin con l'app chiusa). **Mancano**: sblocco biometrico (il tablet non ha impronta né volto utilizzabile: va provato su un telefono). Su Windows `npx cap run android` fallisce ("gradlew non riconosciuto"): per ora si compila con `.\gradlew.bat installDebug` in `app/android`.

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

**Verificato sul tablet (10 ottobre 2026)**: barra in basso sempre visibile, tasto indietro di Android funzionante e ruota che gira (poi bloccata dal cooldown settimanale, come previsto). Il difetto visto nel browser non si ripresenta sul dispositivo, quindi i punti qui sotto sono rifiniture e non hanno urgenza.

Cosa va deciso e fatto:

- **Tasto/gesto indietro di Android** gestito esplicitamente (`@capacitor/app`, evento `backButton`): da una sezione diversa dalla Home riporta alla **Home**; dalla Home chiude l'app (non torna al login né a pagine precedenti). Non deve mai riportare allo splash o al login quando si è già dentro.
- **Barra in basso senza accumulare cronologia**: cambiare sezione con la barra sostituisce la voce di cronologia invece di aggiungerne una, così "indietro" non ripassa da tutte le sezioni visitate.
- **Pulsante "indietro" dentro la pagina** per le schermate che non sono sezioni principali (se ne aggiungeremo, ad esempio un dettaglio di un premio), così non si dipende solo dal gesto di sistema.
- **Durante il giro della ruota** "indietro" va ignorato fino a fine animazione, per non perdere il risultato mostrato.
- **Con il blocco biometrico attivo** "indietro" non deve aggirare la schermata di blocco.
- **Prova su telefono** del comportamento, perché nel browser il tasto indietro è quello del browser e non quello di Android.

## Difetti emersi dalla prova sul tablet (10 ottobre 2026)

- **La ruota non si aggiorna da sola**: `useWheel` legge premi e stato del giro solo all'apertura della schermata; un premio aggiunto o modificato dall'admin compare solo uscendo e rientrando nella Ruota. Va collegata allo stesso aggiornamento automatico di tessera, offerte e premi (`useAutoRefresh`), ma **mai durante l'animazione del giro**, altrimenti gli spicchi cambiano sotto la ruota che gira.
- **Nell'admin non si possono eliminare i premi della ruota**: manca sia il pulsante sia l'endpoint. Un premio già vinto è citato da `spins` e da "I tuoi premi", quindi non si cancella davvero: va **disattivato** (colonna `active`, migrazione D1), sparisce dalla ruota e dall'estrazione ma resta nello storico. Si può cancellare per davvero solo un premio mai uscito. Serve una conferma prima di eliminare. L'estrazione pesata (TDD) deve ignorare i premi disattivati.
- **Il campo "peso" non è chiaro**: è un numero senza etichetta, "Peso" è solo il testo segnaposto che sparisce quando si scrive, e la probabilità si vede solo dopo aver salvato. Da rendere comprensibile per la titolare: etichetta visibile con una spiegazione breve, e **anteprima della probabilità in percentuale mentre si modifica** (calcolata sul totale con il nuovo valore). Valutare un selettore a livelli (es. "raro / medio / frequente") al posto del numero libero.

- **Ogni quanto si può girare la ruota va deciso dall'admin** (richiesta dell'utente). Oggi sono 7 giorni fissi nel codice (`COOLDOWN_DAYS` in `services/spinCooldown.ts`). Come farlo:
  - salvare l'intervallo in giorni in D1, in una nuova tabella a riga unica `wheel_settings` (default 7, minimo 1), come per la regola fedeltà;
  - `getSpinAvailability` riceve l'intervallo come parametro, con test TDD prima;
  - nella pagina Ruota dell'admin, un campo "La cliente può girare ogni N giorni".
  - Un cambio vale subito per tutte: il prossimo giro si calcola dall'ultimo giro fatto più il nuovo intervallo.
  - Il flag di sviluppo `SPIN_COOLDOWN_DISABLED` resta.
  - **Deciso dall'utente**: con gli appuntamenti la ruota si sblocca **dopo ogni appuntamento segnato come fatto** (vedi "Gestione appuntamenti"). L'intervallo in giorni serve quindi solo finché gli appuntamenti non esistono: da decidere se farlo comunque o aspettare direttamente gli appuntamenti.
- **Dalla notifica non si capisce quale app l'ha mandata**: la prima push vera è arrivata (offerta creata dall'admin, app chiusa), ma l'app ha ancora l'**icona predefinita di Capacitor** (la X blu) e nessuna icona dedicata alle notifiche, quindi Android ne mostra solo la sagoma. Da fare: icona dell'app col logo Ale Style (generata dal logo con `@capacitor/assets` per tutte le densità e per l'icona adattiva) e un'**icona per le notifiche** bianca su sfondo trasparente, collegata nel manifest (`com.google.firebase.messaging.default_notification_icon`), con il colore oro del tema (`default_notification_color`).
- ✅ **Toccando la notifica l'app si apre sulla Home** (fatto il 10 ottobre 2026, da provare dopo il deploy): deve aprire la sezione giusta, per le offerte **Offerte**. La push porta nei `data` la destinazione (es. `route: "/offers"`), decisa dal Worker in `notifications.ts`, e l'app ascolta `pushNotificationActionPerformed` in `usePush` e naviga lì. Deve funzionare anche ad app chiusa (avvio a freddo: navigare dopo login o sblocco, non prima) e servirà anche per le push sui punti (→ Tessera).

## Icona dell'app e notifiche personalizzate (da fare)

Richiesta dopo la prima push sul tablet, completa i due punti sopra su icona e apertura della sezione giusta:

- **Icona dell'app** col logo Ale Style, nero e oro, al posto di quella di Capacitor: icona adattiva (sfondo + logo) e icona tonda, generate per tutte le densità con `@capacitor/assets`, partendo da un logo quadrato ad alta risoluzione. Va verificata anche nel cassetto delle app e nella schermata delle app recenti.
- **Notifiche riconoscibili come Ale Style**:
  - piccola icona bianca nella barra di stato;
  - colore oro;
  - nome dell'app nell'intestazione;
  - canale di notifica con un nome comprensibile nelle impostazioni Android (es. "Offerte e punti", poi "Appuntamenti"), così la cliente può disattivarne solo alcuni.
- **Titolo e testo** scritti dal Worker per ogni tipo di evento (offerta, punti, appuntamento), con la destinazione nei `data` per aprire la sezione giusta.
- Da valutare: logo grande a destra nella notifica, suono personalizzato.

## Gestione appuntamenti (da progettare)

Richiesta dell'utente: è una funzionalità nuova e più grande delle altre, va progettata prima di scriverla. Idea di partenza:

- **Calendario nell'admin**:
  - vista per giorno e per settimana degli appuntamenti del salone;
  - creare, spostare e annullare un appuntamento scegliendo cliente, data, ora, durata e servizio.
- **Notifica alla cliente**: quando l'appuntamento è creato o spostato, arriva una push. Toccandola si apre la nuova sezione **Appuntamenti** dell'app (prossimi appuntamenti e storico).
- **Aggiunta al calendario del telefono**: dall'app, pulsante "Aggiungi al calendario" che apre l'app calendario di Android con l'evento già compilato (intent `ACTION_INSERT` di `CalendarContract`, tramite un plugin Capacitor; in alternativa un file `.ics`). Così non servono permessi di lettura/scrittura sul calendario.
- **Dati**: nuova tabella D1 `appointments` (cliente, inizio, durata, servizio, note, stato: in programma / fatto / non presentata / annullato, chi ha annullato, quando è stato segnato), con migrazione e indice su cliente e data. Le regole (sovrapposizioni, orari di apertura, chi può spostare cosa) vanno scritte in TDD.
- **Esito di ogni appuntamento** (deciso dall'utente): dopo l'orario la titolare lo segna come **fatto** oppure **non fatto**. Per i non fatti si distingue tra "la cliente non si è presentata" e "annullato", e per gli annullati chi l'ha annullato. Finché non viene segnato, l'appuntamento resta "da segnare" e l'admin lo evidenzia.
- **Ruota sbloccata dagli appuntamenti** (deciso dall'utente): ogni appuntamento segnato come **fatto** dà alla cliente **un giro della ruota**, che si sblocca in automatico (con una push "Hai un giro della ruota!"). Prende il posto dell'intervallo in giorni. Lato server: `spins` ottiene una colonna `appointment_id`, e si può girare se esiste un appuntamento fatto non ancora usato per un giro. È una regola di eligibilità, quindi va scritta in TDD. Da decidere: se una cliente fa due appuntamenti senza girare ha due giri o uno solo, e se un giro non usato scade.
- **Storico e statistiche** (richiesta dell'utente):
  - **per cliente**, nel dettaglio dell'admin: elenco degli appuntamenti passati con l'esito, e i conteggi di fatti, non presentata e annullati;
  - **per il salone**: appuntamenti fatti per mese, percentuale di non presentate, clienti che vengono più spesso.
  - Le statistiche si calcolano con query su `appointments`, senza colonne di riepilogo da tenere aggiornate (stesso principio di `last_visit_at` nella Fase 2).
  - Servono anche per l'offerta "non viene da un po'", perché l'ultima visita diventa l'ultimo appuntamento fatto.
- **Collegamenti con il resto**:
  - segnare l'appuntamento come "fatto" può proporre l'aggiunta dei punti;
  - si appoggia alla regola "un solo sconto per appuntamento", se la faremo;
  - si può aggiungere un promemoria il giorno prima con un cron del Worker.

**Da decidere prima di progettare**:
1. "Confermare l'appuntamento" significa avvisare la cliente che è confermato, oppure chiederle di confermare la presenza con un pulsante "Confermo / Non posso venire"?
2. Gli appuntamenti li crea solo la titolare, o un domani la cliente può anche prenotare dall'app?
3. La titolare oggi usa già un'agenda (carta, Google Calendar, un'app del salone)? Se sì, va capito se sostituirla o sincronizzarla.
4. Servizi e durate: elenco fisso configurabile dall'admin o testo libero?
5. Le clienti che non hanno l'app: si registra solo il nome, senza notifica?

## ORM al posto delle query SQL scritte a mano (da fare, dopo)

Richiesta dell'utente: oggi `api/src/db.ts` contiene le query come stringhe SQL. Sono sicure, perché sempre parametrizzate con `.bind()`, ma sono scomode da mantenere:
- i tipi dei risultati sono dichiarati a mano (`.first<T>()`) e TypeScript non si accorge se la query e il tipo non corrispondono;
- un nome di colonna sbagliato si scopre solo eseguendo la query;
- lo schema vive in `schema.sql` separato dal codice.

Proposta: **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`).
- Supporta D1 nativamente e gira nei Worker senza dipendenze pesanti.
- Le query restano vicine all'SQL, con i tipi dedotti dallo schema. È coerente con la regola "inferenza dei tipi sempre".
- Lo schema diventa codice TypeScript (`schema.ts`), e `drizzle-kit` genera le migrazioni SQL che si applicano con `wrangler d1 migrations apply`, come previsto per le evoluzioni di D1.
- Alternativa più leggera da valutare: **Kysely** (solo query builder tipizzato, senza gestione dello schema).

Come procedere:
- Si fa **prima della gestione appuntamenti**, che aggiunge tabelle e query nuove: conviene scriverle già con l'ORM.
- Passaggio graduale, una tabella o un gruppo di funzioni di `db.ts` alla volta, senza cambiare le firme usate dai `services`. I test sulle route con D1 reale fanno da rete di sicurezza.
- Va scritto lo schema Drizzle identico a quello di produzione e generata una **migrazione iniziale vuota** (baseline), così il D1 remoto non viene toccato.
- `npm run dev` e il setup dei test (`test/setup.ts`, che oggi applica `schema.sql`) vanno adattati alle migrazioni.
- Aggiornare il README di `api/` e CLAUDE.md (sezione D1).

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

Fatte, guidate passo passo: Cloudflare (login, D1 `ale-style-loyalty`, schema remoto, segreti `AUTH_SECRET`/`ADMIN_PASSWORD`/`FCM_*`, Worker `ale-style-api.iacco85.workers.dev` e dominio `api.alestyle.it`), admin su Pages (`ale-style-admin`, dominio `admin.alestyle.it`), progetto Firebase e app Android registrata.

**Da fare**: Android Studio e prova sul telefono (passo 4 della sequenza sopra). Ripartenza dal **nuovo PC** (quello di lavoro non va toccato):
- Clonare il repo e `npm install` in `api/`, `app/`, `admin/`.
- File **non versionati** da ricreare: `api/.dev.vars` (copia di `.dev.vars.example`); `app/android/app/google-services.json` (da scaricare di nuovo: console Firebase → Impostazioni progetto → le tue app → `it.alestyle.loyalty`); `admin/.env.production.local` con `VITE_API_URL=https://api.alestyle.it` (serve solo per ripubblicare l'admin).
- `npx wrangler login` da rifare, solo se serve ripubblicare. I segreti sono già sul Worker.
- La chiave privata del service account Firebase (file `...adminsdk...json`) **non va copiata** sul nuovo PC: il Worker la ha già. Va tolta dai Download del PC di lavoro.
- Installare Android Studio, abilitare il debug USB sul telefono, poi `npm run android` nella cartella `app/`.

**Nuovo PC (Windows 11) — 9 ottobre 2026**: fatti clone, Node 24 LTS, dipendenze, `google-services.json`, `api/.dev.vars`; `npm run dev` e `npm run dev:fg` resi compatibili con Windows (restano compatibili con Linux). In PowerShell serve `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, altrimenti `npm` è bloccato. Fatti anche `wrangler login`, Android Studio e Java 21 (Temurin, richiesto da Gradle 8.14 di Capacitor 8: con il Java 25 incluso in Android Studio non compila). Dominio `api.alestyle.it` aggiunto al Worker. Mancano: `admin/.env.production.local`, compilazione e prova sul telefono.

## Deploy automatico di API e admin (da fare)

Oggi il deploy è manuale da terminale: `npm run deploy` in `api/`, e `npm run build` + `npx wrangler pages deploy dist --project-name ale-style-admin` in `admin/`. Scelta dell'utente: **automatizzarlo con il push su GitHub**, come già fatto per il sito `ale-style`, usando l'integrazione Git di Cloudflare (non GitHub Actions, così non serve un token API di Cloudflare su GitHub).

- **API**: collegare il Worker `ale-style-api` al repo da dashboard (Workers → Settings → Builds), root directory `api`, comando di deploy `npx wrangler deploy`, build watch path `api/*` per non ripubblicare a ogni modifica di `app/` o `admin/`. I segreti restano quelli già caricati.
- **Admin**: il progetto Pages `ale-style-admin` è nato come *caricamento diretto* e Cloudflare non permette di convertirlo in un progetto collegato a Git. Va creato un nuovo progetto Pages collegato al repo (root `admin`, build `npm run build`, output `dist`, variabile `VITE_API_URL=https://api.alestyle.it`, watch path `admin/*`), provato sul suo indirizzo `.pages.dev`, poi spostato il dominio `admin.alestyle.it` ed eliminato il vecchio progetto. Lo spostamento va fatto quando la titolare non usa il pannello (pochi minuti di possibile disservizio).
- **Da tenere presente**: le migrazioni di `schema.sql` sul D1 remoto restano manuali (il deploy del Worker non tocca il database); decidere se far girare i test prima del deploy (es. `npm test && npx wrangler deploy` come comando).
- Guidato passo passo come le altre configurazioni, partendo dal Worker. Aggiornare i README di `api/` e `admin/` (sezione deploy) quando è fatto.

## Prossimi passi

1. **Prova su dispositivo** (passo 8): fatta sul tablet, push compresa; la biometria va provata su un telefono.
2. **Difetti emersi dalla prova sul tablet** (sezione sopra): ruota che si aggiorna da sola, eliminazione dei premi, campo peso comprensibile, intervallo della ruota impostabile dall'admin.
3. **Icona dell'app e notifiche personalizzate** (sezione sopra).
4. **Deploy automatico** di API e admin col push su GitHub (sezione sopra).
5. **Navigazione dell'app** (sezione sopra): tasto indietro di Android, cronologia pulita, pulsanti indietro nelle schermate secondarie.
6. 🟡 **Notifiche push sugli eventi utili**: fatte nel codice il 10 ottobre 2026, **da pubblicare** (deploy dell'API) e provare sul tablet.
   - **Punti aggiunti dall'admin** (solo `delta` positivo): saldo aggiornato, o "Hai sbloccato uno sconto di 5 €!" se l'aggiunta sblocca uno sconto.
   - **Conferma quando si usa** uno sconto fedeltà o un premio della ruota: fa da ricevuta, così uno sconto scalato per errore o alla cliente sbagliata si nota subito.
   - **Niente push** quando si tolgono punti a mano né per i punti vinti alla ruota.
   - **Toccando la notifica** si apre la schermata giusta (Offerte, Tessera, I tuoi premi), anche ad app chiusa. I testi sono in `api/src/services/pushMessages.ts`, le schermate in `app/src/pushScreen.ts`, entrambi testati.
   - **Resta da fare**: push per premio in scadenza (serve un cron).
7. **ORM (Drizzle)** al posto delle query SQL scritte a mano (sezione sopra), prima degli appuntamenti.
8. **Gestione appuntamenti** (sezione sopra): prima rispondere alle domande aperte, poi progettare; calendario nell'admin, push di conferma, aggiunta al calendario del telefono.
9. **Regole più strette sugli sconti** se servono (un solo sconto per appuntamento, scadenza degli sconti fedeltà).
10. Poi la **Fase 2** qui sotto.

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
