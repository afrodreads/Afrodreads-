// Monta imagens 1080x1350 (4:5) de antes/depois para anúncios, a partir das fotos do site.
const sharp = require("C:/dev/afrodreads-site/node_modules/sharp");
const path = require("path");
const fs = require("fs");

const PUB = "C:/dev/afrodreads-site/public";
const OUT = path.join(__dirname, "ads");
fs.mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1350, HALF = 540, PHOTO_H = 1230;
const YELLOW = "#F1BB09";

function overlay(footer) {
  const chip = (x, label) => `
    <rect x="${x}" y="28" rx="22" ry="22" width="${label.length * 22 + 44}" height="48" fill="#000" fill-opacity="0.72"/>
    <text x="${x + 22}" y="61" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="${YELLOW}" letter-spacing="2">${label}</text>`;
  return Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${HALF - 3}" y="0" width="6" height="${PHOTO_H}" fill="${YELLOW}"/>
    ${chip(24, "ANTES")}
    ${chip(HALF + 24, "DEPOIS")}
    <rect x="0" y="${PHOTO_H}" width="${W}" height="${H - PHOTO_H}" fill="#000"/>
    <text x="${W / 2}" y="${PHOTO_H + 72}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="#fff">${footer}</text>
  </svg>`);
}

async function beforeAfter(before, after, footer, out) {
  const half = (file) => sharp(path.join(PUB, file)).resize(HALF, PHOTO_H, { fit: "cover", position: "attention" }).toBuffer();
  const [a, b] = await Promise.all([half(before), half(after)]);
  await sharp({ create: { width: W, height: H, channels: 3, background: "#000" } })
    .composite([{ input: a, left: 0, top: 0 }, { input: b, left: HALF, top: 0 }, { input: overlay(footer), left: 0, top: 0 }])
    .jpeg({ quality: 90 })
    .toFile(path.join(OUT, out));
  console.log("ok", out);
}

(async () => {
  await beforeAfter("aplicacao-2-antes.jpg", "aplicacao-2-depois.jpg", "Afro Dreads · Pirituba, SP", "anuncio-1-transformacao.jpg");
  await beforeAfter("microlocs-antes.jpg", "microlocs-depois.jpg", "Afro Dreads · Pirituba, SP", "anuncio-2-transformacao-b.jpg");
})();
