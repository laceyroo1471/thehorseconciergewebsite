const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "Images", "challenge-og");
const CACHE = path.join(OUT_DIR, "_logos");

const MB =
  "https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Logos%2FMBlogo.png?alt=media&token=5cf42881-655b-4a1a-98c3-a8ccc03ae120";
const CRS =
  "https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2Fcrs.jpg?alt=media&token=bb9ad3a1-573f-4d28-8271-4edaed8beeb9";
const MYLER =
  "https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2FMyler%20Bits.jpg?alt=media&token=29eed792-20a4-4861-9112-565fddf0107a";
const TOKLAT =
  "https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2F0000165_Toklat-Vertical.png?alt=media&token=b759e6e5-f986-41e0-9ee8-1ec66a905d60";
const DENVER =
  "https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2Fdenver%20uni.svg?alt=media&token=a5e0bbb8-7bae-47a6-b2d8-ab9f001dabc9";
const DDT =
  "https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2FDouble%20D%20Horse%20Trailers%20Logo.png?alt=media&token=c6c26f68-aa70-4d21-be4d-7d0c5b9e178e";
const FOUR =
  "https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2F4Hooves.webp?alt=media&token=26f97c59-1887-4b68-b7f7-3562b304a679";

const WEEKS = [
  {
    slug: "week-01-nutrition",
    html: "horsemanship-challenge-week-01-nutrition.html",
    week: 1,
    topic: "Nutrition Basics",
    credit: "Presented by Mad Barn",
    logos: [{ url: MB, plate: true, maxW: 520, maxH: 150 }],
  },
  {
    slug: "week-02-anatomy",
    html: "horsemanship-challenge-week-02-anatomy.html",
    week: 2,
    topic: "Anatomy & Conformation",
    credit: "Presented by Equine Education Institute",
    logos: [
      {
        file: "Images/challenge-partners/equine-education-institute-on-dark.svg",
        maxW: 640,
        maxH: 150,
      },
    ],
  },
  {
    slug: "week-03-hoof-care",
    html: "horsemanship-challenge-week-03-hoof-care.html",
    week: 3,
    topic: "Hoof Care & Lameness",
    credit: "Presented by CRS Horseshoes",
    logos: [{ url: CRS, plate: true, maxW: 220, maxH: 160 }],
  },
  {
    slug: "week-04-ride",
    html: "horsemanship-challenge-week-04-ride.html",
    week: 4,
    topic: "Riding & Saving",
    credit: "The Horse Concierge in partnership with Draw It Out",
    logos: [
      { file: "Images/ColorLogo.svg", maxW: 280, maxH: 130 },
      { file: "Images/challenge-partners/draw-it-out.png", maxW: 280, maxH: 80 },
    ],
  },
  {
    slug: "week-05-saddle-yef",
    html: "horsemanship-challenge-week-05-saddle-yef.html",
    week: 5,
    topic: "Saddle Fit",
    credit: "Presented by Your Expert Fitter",
    logos: [
      {
        file: "Images/challenge-partners/yef/yef-logo.png",
        plate: true,
        maxW: 520,
        maxH: 150,
      },
    ],
  },
  {
    slug: "week-06-saddle-myler",
    html: "horsemanship-challenge-week-06-saddle-myler.html",
    week: 6,
    topic: "Bits & Communication",
    credit: "Myler presented by Toklat",
    logos: [
      { url: MYLER, plate: true, maxW: 220, maxH: 150 },
      { url: TOKLAT, plate: true, maxW: 180, maxH: 150 },
    ],
  },
  {
    slug: "week-07-ride",
    html: "horsemanship-challenge-week-07-ride.html",
    week: 7,
    topic: "Recovery",
    credit: "Presented by Draw It Out",
    logos: [{ file: "Images/challenge-partners/draw-it-out.png", maxW: 520, maxH: 110 }],
  },
  {
    slug: "week-08-equine-behavior",
    html: "horsemanship-challenge-week-08-equine-behavior.html",
    week: 8,
    topic: "Equine Behavior",
    credit: "Presented by University of Denver",
    logos: [{ url: DENVER, plate: true, maxW: 360, maxH: 160 }],
  },
  {
    slug: "week-09-first-aid",
    html: "horsemanship-challenge-week-09-first-aid.html",
    week: 9,
    topic: "First Aid",
    credit: "Presented by Equine Education Institute",
    logos: [
      {
        file: "Images/challenge-partners/equine-education-institute-on-dark.svg",
        maxW: 640,
        maxH: 150,
      },
    ],
  },
  {
    slug: "week-10-trailer-safety",
    html: "horsemanship-challenge-trailer-safety.html",
    week: 10,
    topic: "Trailer Safety",
    credit: "Presented by Double D Trailers",
    logos: [{ url: DDT, plate: true, maxW: 240, maxH: 160 }],
  },
  {
    slug: "week-11-emergency",
    html: "horsemanship-challenge-week-11-emergency.html",
    week: 11,
    topic: "Emergency Preparedness",
    credit: "Presented by 4 Hooves Large Animal Services",
    logos: [{ url: FOUR, plate: true, maxW: 360, maxH: 160 }],
  },
  {
    slug: "week-12-ride-catchup",
    html: "horsemanship-challenge-week-12-ride-catchup.html",
    week: 12,
    topic: "Ride Week & Catch Up",
    credit: "The Horse Concierge in partnership with Draw It Out",
    logos: [
      { file: "Images/ColorLogo.svg", maxW: 280, maxH: 130 },
      { file: "Images/challenge-partners/draw-it-out.png", maxW: 280, maxH: 80 },
    ],
  },
  {
    slug: "week-13-horse-history",
    html: "horsemanship-challenge-week-13-horse-history.html",
    week: 13,
    topic: "Horse History & Competition Wrap",
    credit: "The Horse Concierge in partnership with Draw It Out",
    logos: [
      { file: "Images/ColorLogo.svg", maxW: 280, maxH: 130 },
      { file: "Images/challenge-partners/draw-it-out.png", maxW: 280, maxH: 80 },
    ],
  },
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error("HTTP " + res.statusCode + " " + url));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function topicSize(topic) {
  if (topic.length > 30) return 50;
  if (topic.length > 22) return 58;
  return 70;
}

async function loadLogo(logo) {
  if (logo.url) {
    const key = crypto.createHash("sha1").update(logo.url).digest("hex");
    const dest = path.join(CACHE, key);
    if (!fs.existsSync(dest)) {
      fs.writeFileSync(dest, await fetchBuffer(logo.url));
    }
    return dest;
  }
  return path.join(ROOT, logo.file);
}

async function fitLogo(file, maxW, maxH) {
  const img = sharp(file, { density: 240 });
  const meta = await img.metadata();
  const w = meta.width || maxW;
  const h = meta.height || maxH;
  const scale = Math.min(maxW / w, maxH / h, 1);
  const width = Math.max(1, Math.round(w * scale));
  const height = Math.max(1, Math.round(h * scale));
  const buffer = await sharp(file, { density: 240 })
    .resize(width, height, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  return { buffer, width, height };
}

async function plateLogo(fitted, padX = 28, padY = 20) {
  const width = fitted.width + padX * 2;
  const height = fitted.height + padY * 2;
  const bg = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 245, g: 237, b: 220, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const buffer = await sharp(bg)
    .composite([{ input: fitted.buffer, left: padX, top: padY }])
    .png()
    .toBuffer();
  return { buffer, width, height };
}

function textSvg(week, topic, credit) {
  const size = topicSize(topic);
  return Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#0a0a0a"/>
    <text x="600" y="92" text-anchor="middle" fill="#cbb26a" font-family="Georgia, 'Times New Roman', serif" font-size="20" letter-spacing="5">WEEK ${week}</text>
    <text x="600" y="122" text-anchor="middle" fill="#8a7a4d" font-family="Georgia, 'Times New Roman', serif" font-size="15" letter-spacing="3">HORSEMANSHIP CHALLENGE</text>
    <text x="600" y="220" text-anchor="middle" fill="#F5EDDC" font-family="Georgia, 'Times New Roman', serif" font-size="${size}">${escapeXml(topic)}</text>
    <line x1="420" y1="252" x2="780" y2="252" stroke="#8a7a4d" stroke-width="1"/>
    <text x="600" y="548" text-anchor="middle" fill="#cbb26a" font-family="Georgia, 'Times New Roman', serif" font-size="20">${escapeXml(credit)}</text>
    <text x="600" y="586" text-anchor="middle" fill="rgba(245,237,220,0.45)" font-family="Georgia, 'Times New Roman', serif" font-size="14" letter-spacing="3">THE HORSE CONCIERGE</text>
  </svg>`);
}

const OG_BLOCK = (slug, topic) => `<!-- challenge og -->
<meta property="og:site_name" content="The Horse Concierge">
<meta property="og:image" content="https://www.thehorseconcierge.com/Images/challenge-og/${slug}.png">
<meta property="og:image:secure_url" content="https://www.thehorseconcierge.com/Images/challenge-og/${slug}.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${topic} — Horsemanship Challenge">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://www.thehorseconcierge.com/Images/challenge-og/${slug}.png">`;

function addOgTags(htmlFile, slug, topic) {
  const file = path.join(ROOT, htmlFile);
  let html = fs.readFileSync(file, "utf8");
  if (html.includes(`Images/challenge-og/${slug}.png`)) {
    console.log("og tags already", htmlFile);
    return;
  }
  const typeLine = '<meta property="og:type" content="website">';
  if (!html.includes(typeLine)) {
    console.log("no og:type", htmlFile);
    return;
  }
  html = html.replace(typeLine, typeLine + "\n" + OG_BLOCK(slug, topic));
  fs.writeFileSync(file, html);
  console.log("og tags", htmlFile);
}

async function renderWeek(week) {
  const fitted = [];
  for (const logo of week.logos) {
    const file = await loadLogo(logo);
    let piece = await fitLogo(file, logo.maxW, logo.maxH);
    if (logo.plate) piece = await plateLogo(piece);
    fitted.push(piece);
  }

  const gap = 36;
  const rowW = fitted.reduce((sum, p) => sum + p.width, 0) + gap * (fitted.length - 1);
  let x = Math.round((1200 - rowW) / 2);
  const maxH = Math.max(...fitted.map((p) => p.height));
  const y = 300 + Math.round((180 - maxH) / 2);

  const composites = fitted.map((p) => {
    const left = x;
    x += p.width + gap;
    return { input: p.buffer, left, top: y };
  });

  const dest = path.join(OUT_DIR, week.slug + ".png");
  await sharp(textSvg(week.week, week.topic, week.credit))
    .png()
    .composite(composites)
    .toFile(dest);
  console.log("wrote", path.relative(ROOT, dest));
  addOgTags(week.html, week.slug, week.topic);
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  for (const week of WEEKS) {
    await renderWeek(week);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
