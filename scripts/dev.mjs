// Gestione dei servizi di sviluppo (api, admin, app).
//   node scripts/dev.mjs start  → avvia in background, log in .dev-logs/, il terminale resta libero
//   node scripts/dev.mjs stop   → ferma tutto
//   node scripts/dev.mjs logs   → segue i log (Ctrl+C chiude solo la visualizzazione)
//   node scripts/dev.mjs fg     → avvia in primo piano con i log a schermo (Ctrl+C ferma tutto)
// Funziona su Linux, Mac e Windows.
import { spawn, spawnSync } from "node:child_process";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  watchFile,
  writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const services = [
  { name: "api", color: 34, dir: "api", url: "http://localhost:8787/docs" },
  { name: "admin", color: 35, dir: "admin", url: "http://localhost:5173" },
  { name: "app", color: 32, dir: "app", url: "http://localhost:5174" },
];
const ports = [8787, 5173, 5174];
const logDir = ".dev-logs";
const pidFile = `${logDir}/pids.json`;
const graceMs = 2000;
const isWindows = process.platform === "win32";
const scriptPath = fileURLToPath(import.meta.url);
const logLines = 20;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Ogni servizio passa da un processo node intermedio (comando "service"), avviato detached: ha un proprio
// process group, così si chiude con tutti i suoi figli (es. workerd), e su Windows sopravvive alla fine di
// "start". La shell non è detached perché su Windows un processo senza console fa perdere l'output ai suoi figli.
function spawnService({ dir }, stdio) {
  return spawn(process.execPath, [scriptPath, "service", dir], { detached: true, windowsHide: true, stdio });
}

// shell: su Windows npm è npm.cmd, che si avvia solo tramite shell
function runService(dir) {
  const child = spawn(`npm --prefix ${dir} run dev`, { shell: true, windowsHide: true, stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 1));
}

function killTree(pid, signal) {
  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(-pid, signal);
  } catch {
    // gruppo già terminato
  }
}

function freePorts() {
  if (isWindows) return windowsListeningPids().forEach((pid) => killTree(pid));
  spawnSync("fuser", ["-k", ...ports.map((port) => `${port}/tcp`)], { stdio: "ignore" });
}

// Righe di "netstat -ano": TCP <locale> <remoto> <stato> <pid>. In ascolto = remoto 0.0.0.0:0 o [::]:0
function windowsListeningPids() {
  const { stdout } = spawnSync("netstat", ["-ano"], { encoding: "utf8" });
  const pids = stdout
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter(([proto, local = "", remote]) => proto === "TCP" && isDevPort(local) && /^(0\.0\.0\.0|\[::\]):0$/.test(remote))
    .map((columns) => columns.at(-1));
  return [...new Set(pids)].filter((pid) => pid !== "0");
}

function isDevPort(address) {
  return ports.some((port) => address.endsWith(`:${port}`));
}

function printLine({ name, color }, line) {
  console.log(`\x1b[${color}m[${name}]\x1b[0m ${line}`);
}

function readPids() {
  return existsSync(pidFile) ? JSON.parse(readFileSync(pidFile, "utf8")) : [];
}

async function stop() {
  const pids = readPids();
  pids.forEach((pid) => killTree(pid, "SIGTERM"));
  if (pids.length) await sleep(graceMs);
  pids.forEach((pid) => killTree(pid, "SIGKILL"));
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
  services.forEach(followLog);
}

// Come "tail -F": ultime righe, poi quelle nuove; riparte da capo se il log viene ricreato da un nuovo avvio
function followLog(service) {
  const file = `${logDir}/${service.name}.log`;
  const content = existsSync(file) ? readFileSync(file) : Buffer.alloc(0);
  content.toString().split(/\r?\n/).filter(Boolean).slice(-logLines).forEach((line) => printLine(service, line));
  let position = content.length;
  watchFile(file, { interval: 500 }, ({ size }) => {
    if (size < position) position = 0;
    if (size === position) return;
    printRange(service, file, position, size);
    position = size;
  });
}

function printRange(service, file, start, end) {
  const input = createReadStream(file, { start, end: end - 1 });
  createInterface({ input }).on("line", (line) => printLine(service, line));
}

function foreground() {
  let stopping = false;
  const children = services.map((service) => {
    const child = spawnService(service, ["ignore", "pipe", "pipe"]);
    const prefix = (line) => printLine(service, line);
    createInterface({ input: child.stdout }).on("line", prefix);
    createInterface({ input: child.stderr }).on("line", prefix);
    child.on("exit", () => shutdown());
    return child;
  });

  function shutdown() {
    if (stopping) return;
    stopping = true;
    console.log("\nChiudo tutto...");
    children.forEach((child) => killTree(child.pid, "SIGTERM"));
    setTimeout(() => {
      children.forEach((child) => killTree(child.pid, "SIGKILL"));
      process.exit(0);
    }, graceMs);
  }

  ["SIGINT", "SIGTERM", "SIGHUP"].forEach((signal) => process.on(signal, shutdown));
}

const commands = { start, stop, logs, fg: foreground, service: () => runService(process.argv[3]) };
const command = commands[process.argv[2]];
if (!command) {
  console.error(`Uso: node scripts/dev.mjs <${Object.keys(commands).join("|")}>`);
  process.exit(1);
}
await command();
