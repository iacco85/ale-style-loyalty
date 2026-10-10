// Genera l'icona dell'app e quella delle notifiche partendo dal logo:
// ritaglia la "A" e la "S" in corsivo, le vettorializza e ci aggiunge un paio di forbici.
// Scrive in assets/ i sorgenti per `capacitor-assets` e in android/.../res le icone delle notifiche.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import potrace from "potrace";
import sharp from "sharp";

const appDir = fileURLToPath(new URL("..", import.meta.url));
const logoPath = `${appDir}src/assets/LogoAleStyle.jpg`;
const assetsDir = `${appDir}assets`;
const resDir = `${appDir}android/app/src/main/res`;

const GOLD = "#d4af37";
const BLACK = "#000000";
const WHITE = "#ffffff";
const INK_THRESHOLD = 25;

// Riquadri (in pixel del logo) che contengono per intero la lettera da staccare.
// Ci finiscono anche pezzi delle lettere vicine (la stanghetta della "t" passa sotto la "S"): si tiene solo la forma più grande.
const LETTERS = {
  A: { left: 25, top: 70, right: 290, bottom: 240 },
  S: { left: 600, top: 48, right: 762, bottom: 245 },
};
// Di quanto avvicinare la "S" alla "A" (nel logo in mezzo ci sono "le's").
const S_SHIFT = 308;
// Il ritaglio si ingrandisce prima di vettorializzarlo, per curve più morbide.
const TRACE_UPSCALE = 4;
// Il corsivo del logo è sottile per un'icona piccola: spessore aggiunto attorno alle lettere (in pixel del logo).
const LETTER_EXTRA_WEIGHT = 3;
// Spessore del tratto delle forbici (la favicon usa 1,5 su 24).
const SCISSORS_WEIGHT = 2.2;

// Forbici della favicon del sito alestyle.it (icona "scissors" di Lucide), in un riquadro 24×24.
const SCISSORS = `
  <g transform="rotate(-30 14.732 7.268)">
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
  </g>
`;

async function readLogo() {
  const { data, info } = await sharp(logoPath).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function labelShapes(logo) {
  const { data, width, height } = logo;
  const labels = new Int32Array(width * height);
  let next = 0;
  for (let start = 0; start < labels.length; start++) {
    if (data[start] <= INK_THRESHOLD || labels[start]) continue;
    floodFill(logo, labels, start, ++next);
  }
  return labels;
}

function floodFill({ data, width, height }, labels, start, label) {
  const stack = [start];
  labels[start] = label;
  while (stack.length) {
    const p = stack.pop();
    const x = p % width;
    const y = (p - x) / width;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = ny * width + nx;
        if (data[q] > INK_THRESHOLD && !labels[q]) {
          labels[q] = label;
          stack.push(q);
        }
      }
    }
  }
}

function largestShapeInside(labels, width, box) {
  const counts = new Map();
  for (let y = box.top; y < box.bottom; y++) {
    for (let x = box.left; x < box.right; x++) {
      const label = labels[y * width + x];
      if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
}

// Immagine della sola lettera (nero su bianco, come vuole potrace), senza pezzi delle lettere vicine.
function letterMask(logo, labels, box) {
  const letter = largestShapeInside(labels, logo.width, box);
  const width = box.right - box.left;
  const height = box.bottom - box.top;
  const pixels = Buffer.alloc(width * height, 255);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y + box.top) * logo.width + x + box.left;
      if (labels[p] === letter) pixels[y * width + x] = 255 - logo.data[p];
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 1 } }).resize({ width: width * TRACE_UPSCALE }).png().toBuffer();
}

async function traceLetter(mask) {
  const svg = await new Promise((resolve, reject) =>
    potrace.trace(mask, { threshold: 128, turdSize: 20 }, (error, result) => (error ? reject(error) : resolve(result))),
  );
  return svg.match(/ d="([^"]+)"/)[1];
}

async function tracedLetters() {
  const logo = await readLogo();
  const labels = labelShapes(logo);
  const traced = {};
  for (const [name, box] of Object.entries(LETTERS)) {
    traced[name] = await traceLetter(await letterMask(logo, labels, box));
  }
  return traced;
}

function letterPath(path, box, shiftX) {
  return `<path transform="translate(${box.left - shiftX} ${box.top}) scale(${1 / TRACE_UPSCALE})" d="${path}" />`;
}

// Inquadratura del monogramma in coordinate del logo, e posizione delle forbici sopra la coda della "A".
const LAYOUT = { viewBox: "24 36 428 212", scissors: "translate(24 38) scale(5)" };

// Monogramma in un riquadro 1000×1000: "A" e "S" come nel logo ma vicine, forbici in alto a sinistra.
function monogram(letters, color) {
  return `
    <svg width="1000" height="1000" viewBox="${LAYOUT.viewBox}">
      <g transform="${LAYOUT.scissors}" fill="none" stroke="${color}" stroke-width="${SCISSORS_WEIGHT}"
         stroke-linecap="round" stroke-linejoin="round">${SCISSORS}</g>
      <g fill="${color}" stroke="${color}" stroke-width="${LETTER_EXTRA_WEIGHT * TRACE_UPSCALE}" stroke-linejoin="round">
        ${letterPath(letters.A, LETTERS.A, 0)}
        ${letterPath(letters.S, LETTERS.S, S_SHIFT)}
      </g>
    </svg>`;
}

// Le sole forbici in un riquadro 1000×1000: a 24 px il monogramma non si legge.
function scissorsOnly(color) {
  return `
    <svg width="1000" height="1000" viewBox="-1 -1 26 26" fill="none" stroke="${color}" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">${SCISSORS}</svg>`;
}

function iconSvg(content, { size, padding, background }) {
  const scale = (size - 2 * padding) / 1000;
  const fill = background ? `<rect width="${size}" height="${size}" fill="${background}" />` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    ${fill}<g transform="translate(${padding} ${padding}) scale(${scale})">${content}</g></svg>`;
}

const render = (svg, path) => sharp(Buffer.from(svg)).png().toFile(path);

async function writeAppIconSources(letters) {
  await mkdir(assetsDir, { recursive: true });
  const goldMonogram = monogram(letters, GOLD);
  const fullIcon = iconSvg(goldMonogram, { size: 1024, padding: 110, background: BLACK });
  await writeFile(`${assetsDir}/icon.svg`, fullIcon);
  await render(fullIcon, `${assetsDir}/icon-only.png`);
  // Dell'icona adattiva si vede al massimo il cerchio centrale (72dp su 108): il monogramma, largo, ci sta appena dentro.
  await render(iconSvg(goldMonogram, { size: 1024, padding: 170 }), `${assetsDir}/icon-foreground.png`);
  await render(iconSvg("", { size: 1024, padding: 0, background: BLACK }), `${assetsDir}/icon-background.png`);
}

// Icona della barra di stato: sagoma bianca su trasparente, 24dp per ogni densità.
const NOTIFICATION_SIZES = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };

async function writeNotificationIcons() {
  for (const [density, size] of Object.entries(NOTIFICATION_SIZES)) {    const dir = `${resDir}/drawable-${density}`;
    await mkdir(dir, { recursive: true });
    await render(iconSvg(scissorsOnly(WHITE), { size, padding: 0 }), `${dir}/ic_stat_notify.png`);
  }
}

const letters = await tracedLetters();
await writeAppIconSources(letters);
await writeNotificationIcons();
console.log("Icone generate in assets/ e android/app/src/main/res/drawable-*/ic_stat_notify.png");
