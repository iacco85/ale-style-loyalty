// Avvia API, admin e app insieme. Ctrl+C chiude subito tutto l'albero di processi:
// niente attesa di Vite/Wrangler per le connessioni aperte del browser.
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const services = [
  { name: "api", color: 34, dir: "api" },
  { name: "admin", color: 35, dir: "admin" },
  { name: "app", color: 32, dir: "app" },
];

const graceMs = 2000;
let stopping = false;

function pipeWithPrefix(stream, name, color) {
  createInterface({ input: stream }).on("line", (line) => console.log(`\x1b[${color}m[${name}]\x1b[0m ${line}`));
}

function start({ name, color, dir }) {
  // detached: ogni servizio ha un proprio process group, così si può chiudere con tutti i suoi figli (es. workerd)
  const child = spawn("npm", ["--prefix", dir, "run", "dev"], { detached: true, stdio: ["ignore", "pipe", "pipe"] });
  pipeWithPrefix(child.stdout, name, color);
  pipeWithPrefix(child.stderr, name, color);
  child.on("exit", (code, signal) => {
    if (!stopping) console.log(`\x1b[${color}m[${name}]\x1b[0m terminato (${signal ?? code}), fermo tutto`);
    stop();
  });
  return child;
}

const children = services.map(start);

function killGroup(child, signal) {
  try {
    process.kill(-child.pid, signal);
  } catch {
    // gruppo già terminato
  }
}

function stop() {
  if (stopping) return;
  stopping = true;
  console.log("\nChiudo tutto...");
  children.forEach((child) => killGroup(child, "SIGTERM"));
  setTimeout(() => {
    children.forEach((child) => killGroup(child, "SIGKILL"));
    process.exit(0);
  }, graceMs).unref();
  const timer = setInterval(() => {
    if (children.every((child) => child.exitCode !== null || child.signalCode !== null)) {
      clearInterval(timer);
      process.exit(0);
    }
  }, 100);
}

["SIGINT", "SIGTERM", "SIGHUP"].forEach((signal) => process.on(signal, stop));
