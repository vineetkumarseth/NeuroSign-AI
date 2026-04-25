const MODEL_URL = "https://teachablemachine.withgoogle.com/models/9BrflNvtp/";
const MEANINGS = {
  A:"Alphabet A", B:"Alphabet B", C:"Alphabet C",
  D:"Alphabet D", L:"Alphabet L", Y:"Alphabet Y",
  HELLO:"Hello / Namaste", THANK_YOU:"Thank You", NOTHING:""
};
const HINDI = {
  A:"अक्षर A", B:"अक्षर B", C:"अक्षर C",
  D:"अक्षर D", L:"अक्षर L", Y:"अक्षर Y",
  HELLO:"नमस्ते", THANK_YOU:"धन्यवाद", NOTHING:""
};

let model, webcam;
let lang = "en";
let word = "";
let hist = [];
let lastSign = "";
let speakCD = false;
let addCD = false;
let frames = 0;
let fpsTimer = Date.now();
let demoStarted = false;

// ── Pages ────────────────────────────────────
function goPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
  if (id === "demo" && !demoStarted) initDemo();
}

// ── Language ─────────────────────────────────
function setLang(l) {
  lang = l;
  document.getElementById("lb-en").classList.toggle("on", l === "en");
  document.getElementById("lb-hi").classList.toggle("on", l === "hi");
}

// ── Init ─────────────────────────────────────
async function initDemo() {
  demoStarted = true;
  document.getElementById("status").textContent = "⏳ Loading AI model...";
  try {
    model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
    webcam = new tmImage.Webcam(480, 380, true);
    await webcam.setup();
    await webcam.play();
    document.getElementById("webcam-container").appendChild(webcam.canvas);
    document.getElementById("status").textContent = "✅ AI Ready — Show your hand!";
    document.getElementById("hint").textContent = "Hand detection active ✋";
    requestAnimationFrame(loop);
  } catch (e) {
    document.getElementById("status").textContent = "❌ Model error — check MODEL_URL. " + e.message;
  }
}

// ── Loop ─────────────────────────────────────
async function loop() {
  webcam.update();
  frames++;
  if (Date.now() - fpsTimer > 1000) {
    document.getElementById("fps").textContent = frames + " FPS";
    frames = 0; fpsTimer = Date.now();
  }
  await predict();
  requestAnimationFrame(loop);
}

// ── Predict ──────────────────────────────────
async function predict() {
  const preds = await model.predict(webcam.canvas);
  preds.sort((a, b) => b.probability - a.probability);
  const top = preds[0];
  const conf = Math.round(top.probability * 100);
  const sign = top.className;

  if (sign !== "NOTHING" && conf > 68) {
    document.getElementById("letter").textContent = sign;
    document.getElementById("meaning").textContent =
      lang === "hi" ? (HINDI[sign] || sign) : (MEANINGS[sign] || sign);
    document.getElementById("conf-pct").textContent = conf + "%";
    document.getElementById("conf-fg").style.width = conf + "%";
    document.getElementById("letter-box").classList.add("glow");
    document.getElementById("hint").textContent = "✅ Detected: " + sign;

    if (sign !== lastSign && !addCD && sign !== "HELLO" && sign !== "THANK_YOU") {
      word += sign;
      updateWord();
      pushHist(sign);
      addCD = true;
      setTimeout(() => addCD = false, 1100);
    }

    if (sign !== lastSign && !speakCD) {
      speak(lang === "hi" ? (HINDI[sign] || sign) : sign);
      lastSign = sign;
      speakCD = true;
      setTimeout(() => { speakCD = false; lastSign = ""; }, 2200);
    }
  } else {
    document.getElementById("letter").textContent = "—";
    document.getElementById("meaning").textContent = "Waiting...";
    document.getElementById("conf-pct").textContent = "0%";
    document.getElementById("conf-fg").style.width = "0%";
    document.getElementById("letter-box").classList.remove("glow");
    document.getElementById("hint").textContent = "Point camera at hand ✋";
  }

  // Prediction bars
  document.getElementById("pred-list").innerHTML =
    preds.filter(p => p.className !== "NOTHING").slice(0, 5).map(p => {
      const pct = Math.round(p.probability * 100);
      return `<div class="pred-row">
        <div class="pn">${p.className}</div>
        <div class="pb"><div class="pf" style="width:${pct}%"></div></div>
        <div class="pp">${pct}%</div>
      </div>`;
    }).join("");
}

// ── Word Builder ──────────────────────────────
function updateWord() {
  document.getElementById("word-display").textContent = word || "_";
}
function addSpace() { word += " "; updateWord(); }
function delChar() { word = word.slice(0, -1); updateWord(); }
function clearWord() { word = ""; updateWord(); }
function speakWord() { if (word.trim()) speak(word); }

// ── History ───────────────────────────────────
function pushHist(sign) {
  hist.unshift(sign);
  if (hist.length > 30) hist.pop();
  document.getElementById("history").innerHTML =
    hist.map(s => `<span class="hc">${s}</span>`).join("");
}

// ── Voice ─────────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "hi" ? "hi-IN" : "en-US";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

// ── Loader ────────────────────────────────────
window.addEventListener("load", () => {
  setTimeout(() => document.getElementById("loader").style.display = "none", 900);
});