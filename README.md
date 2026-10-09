# Ale Style Loyalty

App fedeltà per il salone di parrucchiera **Ale Style** (Rimini) — pilot reale, pensato in futuro come prodotto white-label da vendere ad altri negozi. Questo README spiega **cosa c'è, cosa fa, e a che punto siamo**, così da non dover ricostruire il contesto ogni volta. Per il "perché" delle decisioni prese vedi [PLAN.md](PLAN.md); per le convenzioni di codice vedi [CLAUDE.md](CLAUDE.md).

## Il progetto in breve

Un'app Android nativa dove la cliente vede la sua tessera punti, riceve notifiche push con offerte personalizzate, e può girare una "ruota della fortuna" settimanale per vincere sconti/premi. La sorella dell'utente (proprietaria del salone, **non tecnica**) gestisce tutto da un pannello admin web: aggiunge punti, crea offerte, configura i premi della ruota.

Tre componenti, che parlano solo tra loro attraverso un'API scritta da noi (nessun SDK di terzi usato direttamente da app o admin — vedi la sezione "Perché un backend nostro" in [PLAN.md](PLAN.md)):

```
[App Android]  ─┐
                 ├──HTTP──▶ [api/  Cloudflare Worker]  ──▶ [Cloudflare D1]
[Admin web]    ─┘                    │
                                      └──▶ Firebase Cloud Messaging (solo invio push)
```

## Stato attuale (aggiornare ad ogni cambiamento importante)

| Componente | Stato |
| --- | --- |
| `api/` — Cloudflare Worker | 🟡 Login cliente, saldo punti, offerte, device token, endpoint admin (lista clienti, punti, offerte singole/broadcast con push, premi ruota) protetti da password condivisa, e ruota della fortuna server-authoritative (`POST /spin`, `GET /spin/status`, cooldown 7 giorni, estrazione pesata testata TDD). Documentato con Swagger. **Manca**: deploy su Cloudflare |
| `app/` — App Android (Capacitor + Vue) | ⚪ Non ancora iniziato |
| `admin/` — Pannello web per la sorella (Vue) | 🟡 Login, lista/ricerca clienti, punti, offerte personali e broadcast, gestione premi ruota; verificato in locale contro l'API. **Manca**: deploy (Pages + CORS sul Worker) |

🟢 fatto e verificato · 🟡 in corso/parziale · ⚪ non iniziato

## Come vedere l'API funzionante adesso

Oggi l'unica cosa "viva" è il backend (`api/`), testabile in locale sul tuo computer (nessun account Cloudflare necessario per questo):

```bash
cd api
npm install
npm run dev
```

`npm run dev` prepara da solo tutto il necessario (segreto locale, dati di test) — non servono altri comandi manuali. Poi apri **http://localhost:8787/docs** nel browser: è una pagina interattiva (Swagger) dove puoi vedere e provare ogni endpoint dell'API senza scrivere codice — utile per capire cosa fa il backend senza leggere il codice sorgente. Dettagli e comandi completi in [api/README.md](api/README.md).

## Struttura del repo

```
ale-style-loyalty/
  PLAN.md          # decisioni architetturali e scope del pilot — il "perché"
  CLAUDE.md         # convenzioni di codice per chi (o cosa) scrive in questo repo
  README.md          # questo file — il "cosa" e "a che punto siamo"
  api/                 # backend, Cloudflare Worker — vedi api/README.md
  app/                  # (da creare) app Android Capacitor + Vue
  admin/                 # pannello admin web Vue — vedi admin/README.md
```

Ogni sottocartella avrà un proprio README.md con i dettagli specifici (comandi, come lanciarla, cosa fa) — questo file resta la mappa d'insieme.

## Riferimenti

- [PLAN.md](PLAN.md) — perché queste scelte tecniche, cosa copre il pilot, come funziona la ruota della fortuna
- [CLAUDE.md](CLAUDE.md) — convenzioni obbligatorie (TDD, single responsibility, ecc.) e best practice per lo stack
- [api/README.md](api/README.md) — comandi, endpoint, autenticazione del backend
- [admin/README.md](admin/README.md) — comandi e pagine del pannello admin
