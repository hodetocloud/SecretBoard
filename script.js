/* ───── CONFIG ───── */
const SECRET = "secret-key"; // 🔐 เปลี่ยนได้
const FONT_SIZE = 14; // ความละเอียดตัวอักษร
const PIXEL_SIZE = 10; // ขนาด LED 1 ช่อง
const GAP = 2; // ช่องไฟ
const ANIM_SPEED = 20; // ms ต่อคอลัมน์
/* ────────────────── */

const grid = document.getElementById("grid");
const input = document.getElementById("text");
const showBtn = document.getElementById("btn");
const copyBtn = document.getElementById("copy");
const copiedUi = document.getElementById("copied");

/* ---------- SHOW & ENCODE ---------- */
showBtn.addEventListener("click", () => {
  const raw = input.value.trim();
  if (!raw) return;

  // 1) Compress → 2) Encrypt
  const compressed = LZString.compressToEncodedURIComponent(raw);
  const cipher = CryptoJS.AES.encrypt(compressed, SECRET).toString();

  // 3) Put in URL
  const encoded = encodeURIComponent(cipher);
  const shareUrl = `${location.origin}${location.pathname}?msg=${encoded}`;
  history.replaceState({}, "", shareUrl);

  // 4) Enable copy button
  copyBtn.disabled = false;
  copyBtn.dataset.url = shareUrl;
  flashCopied(false); // ซ่อนข้อความ Copied (ถ้าเคยแสดง)

  renderMessage(raw);
});

/* ---------- COPY LINK ---------- */
copyBtn.addEventListener("click", async () => {
  const link = copyBtn.dataset.url || location.href;
  try {
    await navigator.clipboard.writeText(link);
    flashCopied(true);
  } catch {
    alert("คัดลอกไม่สำเร็จ ลองก็อปด้วยตัวเอง:\n" + link);
  }
});

/* ---------- ON LOAD: decode if ?msg= ---------- */
window.addEventListener("DOMContentLoaded", () => {
  const param = new URLSearchParams(location.search).get("msg");
  if (!param) return;

  try {
    const bytes = CryptoJS.AES.decrypt(decodeURIComponent(param), SECRET);
    const plain = bytes.toString(CryptoJS.enc.Utf8);
    const text = LZString.decompressFromEncodedURIComponent(plain);
    if (text) {
      input.value = text;
      copyBtn.disabled = false;
      copyBtn.dataset.url = location.href;
      renderMessage(text);
    }
  } catch (e) {
    console.error("Decrypt fail:", e);
  }
});

/* ---------- RENDER MESSAGE ---------- */
function renderMessage(text) {
  const cvs = document.createElement("canvas");
  const ctx = cvs.getContext("2d");

  ctx.font = `${FONT_SIZE}px monospace`;
  cvs.width = Math.ceil(ctx.measureText(text).width);
  cvs.height = FONT_SIZE;
  ctx.font = `${FONT_SIZE}px monospace`;
  ctx.fillStyle = "#fff";
  ctx.fillText(text, 0, FONT_SIZE - 2);

  const { data } = ctx.getImageData(0, 0, cvs.width, cvs.height);
  const COLS = cvs.width,
    ROWS = cvs.height;

  // สร้างกริด
  grid.innerHTML = "";
  grid.style.setProperty("--pixel", `${PIXEL_SIZE}px`);
  grid.style.setProperty("--gap", `${GAP}px`);
  grid.style.gridTemplateColumns = `repeat(${COLS}, ${PIXEL_SIZE}px)`;
  grid.style.gridTemplateRows = `repeat(${ROWS}, ${PIXEL_SIZE}px)`;

  const cells = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      grid.appendChild(cell);
      cells.push(cell);
      if (data[(y * COLS + x) * 4 + 3] > 128) cell.dataset.on = "1";
    }
  }

  // Animation
  let col = 0;
  const timer = setInterval(() => {
    for (let row = 0; row < ROWS; row++) {
      const idx = row * COLS + col;
      if (cells[idx]?.dataset.on) cells[idx].classList.add("active");
    }
    if (++col >= COLS) clearInterval(timer);
  }, ANIM_SPEED);
}

/* ---------- ช่วยแสดง/ซ่อน “Copied ✓” ---------- */
function flashCopied(show) {
  copiedUi.classList.toggle("hidden", !show);
  if (show) setTimeout(() => flashCopied(false), 1200);
}
