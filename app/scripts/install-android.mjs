// Compila l'APK di debug e lo installa sul dispositivo collegato via USB.
// `cap run android` su Windows non trova `gradlew` (la shell può non cercare nella cartella corrente):
// qui si chiama il wrapper giusto per il sistema, con il percorso completo.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const androidDir = fileURLToPath(new URL("../android", import.meta.url));
const isWindows = process.platform === "win32";
const gradlew = join(androidDir, isWindows ? "gradlew.bat" : "gradlew");

const result = spawnSync(gradlew, ["installDebug"], { cwd: androidDir, stdio: "inherit", shell: isWindows });
process.exit(result.status ?? 1);
