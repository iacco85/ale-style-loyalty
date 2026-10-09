// Gestione dei servizi di sviluppo (api, admin, app).
//   node scripts/dev.mjs start  → avvia in background, log in .dev-logs/, il terminale resta libero
//   node scripts/dev.mjs stop   → ferma tutto
//   node scripts/dev.mjs logs   → segue i log (Ctrl+C chiude solo la visualizzazione)
//   node scripts/dev.mjs fg     → avvia in primo piano con i log a schermo (Ctrl+C ferma tutto)
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

const services = [
  { name: "api", color: 34, dir: "api", url: "http://localhost:8787/docs" },
  { name: "admin", color: 35, dir: "admin", url: "http://localhost:5173" },
  { name: "app", color: 32, dir: "app", url: "http://localhost:5174" },
];
const ports = [8787, 5173, 5174];
const logDir = ".dev-logs";
const pidFile = `${logDir}/pids.json`;
const graceMs = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function spawnService({ dir }, stdio) {
  // detached: ogni servizio ha un proprio process group, così si chiude con tutti i suoi figli (es. workerd)
  return spawn("npm", ["--prefix", dir, "run", "dev"], { detached: true, stdio });
}

function killGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch {
    // gruppo già terminato
  }
}

function freePorts() {
  spawnSync("fuser", ["-k", ...ports.map((port) => `${port}/tcp`)], { stdio: "ignore" });
}

function readPids() {
  return existsSync(pidFile) ? JSON.parse(readFileSync(pidFile, "utf8")) : [];
}

async function stop() {
  const pids = readPids();
  pids.forEach((pid) => killGroup(pid, "SIGTERM"));
  if (pids.length) await sleep(graceMs);
  pids.forEach((pid) => killGroup(pid, "SIGKILL"));
  freePorts();
  rmSync(pidFile, { force: true });
}

async function isUp(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(1000) })).ok;
  } catch {
    return false;
  }
}

async function waitUntilUp({ name, url }) {
  for (let i = 0; i < 60; i++) {
    if (await isUp(url)) return console.log(`  ✓ ${name.padEnd(5)} ${url}`);
    await sleep(1000);
  }
  console.log(`  ✗ ${name.padEnd(5)} non risponde: guarda i log con "npm run logs"`);
}

async function start() {
  await stop();
  mkdirSync(logDir, { recursive: true });

  const pids = services.map((service) => {
    const log = openSync(`${logDir}/${service.name}.log`, "w");
    const child = spawnService(service, ["ignore", log, log]);
    child.unref();
    return child.pid;
  });
  writeFileSync(pidFile, JSON.stringify(pids));

  console.log("Avvio in background...");
  await Promise.all(services.map(waitUntilUp));
  console.log('\nServizi attivi. Comandi: "npm run logs" (log), "npm run stop" (ferma tutto).');
}

function logs() {
  if (!existsSync(logDir)) return console.log('Nessun log: avvia prima i servizi con "npm run dev".');
  const files = services.map(({ name }) => `${logDir}/${name}.log`);
  spawn("tail", ["-n", "20", "-F", ...files], { stdio: "inherit" });
}

function foreground() {
  let stopping = false;
  const children = services.map((service) => {
    const child = spawnService(service, ["ignore", "pipe", "pipe"]);
    const prefix = (line) => console.log(`\x1b[${service.color}m[${service.name}]\x1b[0m ${line}`);
    createInterface({ input: child.stdout }).on("line", prefix);
    createInterface({ input: child.stderr }).on("line", prefix);
    child.on("exit", () => shutdown());
    return child;
  });

  function shutdown() {
    if (stopping) return;
    stopping = true;
    console.log("\nChiudo tutto...");
    children.forEach((child) => killGroup(child.pid, "SIGTERM"));
    setTimeout(() => {
      children.forEach((child) => killGroup(child.pid, "SIGKILL"));
      process.exit(0);
    }, graceMs);
  }

  ["SIGINT", "SIGTERM", "SIGHUP"].forEach((signal) => process.on(signal, shutdown));
}

const commands = { start, stop, logs, fg: foreground };
const command = commands[process.argv[2]];
if (!command) {
  console.error(`Uso: node scripts/dev.mjs <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}
await command();
