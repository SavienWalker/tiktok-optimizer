const { FFmpeg } = FFmpegWASM;
const { toBlobURL, fetchFile } = FFmpegUtil;

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
const WORKER_URL = "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/814.ffmpeg.js";

const els = {
  dropzone: document.getElementById("dropzone"),
  pickBtn: document.getElementById("pick-btn"),
  fileInput: document.getElementById("file-input"),
  fileInfo: document.getElementById("file-info"),
  fileName: document.getElementById("file-name"),
  fileSize: document.getElementById("file-size"),
  clearBtn: document.getElementById("clear-btn"),
  encodeBtn: document.getElementById("encode-btn"),
  crfRange: document.getElementById("crf-range"),
  crfValue: document.getElementById("crf-value"),
  resolutionSelect: document.getElementById("resolution-select"),
  cropToggle: document.getElementById("crop-toggle"),
  progressWrap: document.getElementById("progress-wrap"),
  progressFill: document.getElementById("progress-fill"),
  progressLabel: document.getElementById("progress-label"),
  progressPct: document.getElementById("progress-pct"),
  resultPanel: document.getElementById("result-panel"),
  resultVideo: document.getElementById("result-video"),
  sizeOriginal: document.getElementById("size-original"),
  sizeOptimized: document.getElementById("size-optimized"),
  sizeWarning: document.getElementById("size-warning"),
  downloadLink: document.getElementById("download-link"),
  errorPanel: document.getElementById("error-panel"),
  errorMessage: document.getElementById("error-message"),
};

let selectedFile = null;
let ffmpeg = null;
let ffmpegLoaded = false;
let lastCropMatch = null;
let lastSarInfo = null;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let val = bytes;
  let i = -1;
  do {
    val /= 1024;
    i++;
  } while (val >= 1024 && i < units.length - 1);
  return `${val.toFixed(1)} ${units[i]}`;
}

function showError(message) {
  els.errorMessage.textContent = message;
  els.errorPanel.hidden = false;
}

function hideError() {
  els.errorPanel.hidden = true;
}

function setFile(file) {
  if (!file) return;
  if (!file.type.startsWith("video/")) {
    showError("Lütfen bir video dosyası seç.");
    return;
  }
  hideError();
  selectedFile = file;
  els.fileName.textContent = file.name;
  els.fileSize.textContent = formatBytes(file.size);
  els.fileInfo.hidden = false;
  els.encodeBtn.disabled = false;
  els.resultPanel.hidden = true;
}

function clearFile() {
  selectedFile = null;
  els.fileInput.value = "";
  els.fileInfo.hidden = true;
  els.encodeBtn.disabled = true;
}

els.pickBtn.addEventListener("click", () => els.fileInput.click());
els.dropzone.addEventListener("click", (e) => {
  if (e.target === els.pickBtn) return;
  els.fileInput.click();
});
els.dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    els.fileInput.click();
  }
});

els.fileInput.addEventListener("change", () => {
  setFile(els.fileInput.files[0]);
});

["dragenter", "dragover"].forEach((evt) => {
  els.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropzone.classList.add("drag-active");
  });
});

["dragleave", "drop"].forEach((evt) => {
  els.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropzone.classList.remove("drag-active");
  });
});

els.dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  setFile(file);
});

els.clearBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  clearFile();
});

els.crfRange.addEventListener("input", () => {
  els.crfValue.textContent = els.crfRange.value;
});

function setProgress(pct, label) {
  els.progressFill.style.width = `${pct}%`;
  els.progressPct.textContent = `${Math.round(pct)}%`;
  if (label) els.progressLabel.textContent = label;
}

async function ensureFfmpeg() {
  if (ffmpegLoaded) return ffmpeg;
  ffmpeg = new FFmpeg();
  ffmpeg.on("progress", ({ progress }) => {
    const pct = Math.min(100, Math.max(0, progress * 100));
    setProgress(pct, "Encode ediliyor…");
  });
  ffmpeg.on("log", ({ message }) => {
    const cropMatch = message.match(/crop=(\d+):(\d+):(\d+):(\d+)/);
    if (cropMatch) lastCropMatch = cropMatch[0];
    const sarMatch = message.match(/SAR \d+:\d+ DAR \d+:\d+/);
    if (sarMatch) lastSarInfo = sarMatch[0];
  });
  setProgress(0, "Motor yükleniyor…");

  // @ffmpeg/ffmpeg's UMD build forces {type: "module"} whenever classWorkerURL
  // is passed, but its worker chunk is a classic script (uses importScripts).
  // Without classWorkerURL it falls back to a cross-origin CDN URL, which the
  // Worker constructor rejects outright. Route the one worker it creates to a
  // same-origin blob while keeping the classic (non-module) type it needs.
  const workerBlobURL = await toBlobURL(WORKER_URL, "text/javascript");
  const OriginalWorker = window.Worker;
  window.Worker = function (_url, opts) {
    return new OriginalWorker(workerBlobURL, { name: opts && opts.name });
  };

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
  } finally {
    window.Worker = OriginalWorker;
  }

  ffmpegLoaded = true;
  return ffmpeg;
}

async function detectCrop(engine, inputName) {
  lastCropMatch = null;
  await engine.exec([
    "-i", inputName,
    "-t", "3",
    "-vf", "cropdetect=64:2:0",
    "-f", "null",
    "-",
  ]);
  return lastCropMatch;
}

async function encode() {
  if (!selectedFile) return;
  hideError();
  els.encodeBtn.disabled = true;
  els.resultPanel.hidden = true;
  els.progressWrap.hidden = false;
  setProgress(0, "Motor yükleniyor…");

  try {
    const engine = await ensureFfmpeg();
    const maxSide = els.resolutionSelect.value;
    const crf = els.crfRange.value;

    const inputName = "input" + (selectedFile.name.match(/\.\w+$/)?.[0] || ".mp4");
    const outputName = "output.mp4";

    await engine.writeFile(inputName, await fetchFile(selectedFile));

    let cropFilter = "";
    if (els.cropToggle.checked) {
      setProgress(0, "Kenarlar taranıyor…");
      const crop = await detectCrop(engine, inputName);
      if (crop) cropFilter = `${crop},`;
    }

    // Normalize non-square SAR into pixel dimensions first (setsar=1). Then
    // cap short/long edges with a single uniform scale factor so aspect is
    // never touched: shortCap protects the short edge from being shrunk
    // past 1080 (a plain long-edge cap was previously over-shrinking tall
    // portrait sources), longCap only kicks in when it doesn't force the
    // short edge under that floor — whichever constraint is less
    // aggressive wins, so neither edge is sacrificed for the other.
    const shortCap = Math.min(1080, Number(maxSide));
    const longCap = Number(maxSide);
    const scaleExpr = `max(min(1,${shortCap}/min(iw,ih)),min(1,${longCap}/max(iw,ih)))`;
    const vf =
      `${cropFilter}` +
      `scale='trunc(iw*sar/2)*2:trunc(ih/2)*2',setsar=1,` +
      `scale='trunc(iw*${scaleExpr}/2)*2':'trunc(ih*${scaleExpr}/2)*2',setsar=1`;

    setProgress(0, "Encode ediliyor…");
    await engine.exec([
      "-i", inputName,
      "-vf", vf,
      "-c:v", "libx264",
      "-profile:v", "high",
      "-level", "4.2",
      "-crf", crf,
      "-maxrate", "12M",
      "-bufsize", "16M",
      "-preset", "slow",
      "-pix_fmt", "yuv420p",
      "-colorspace", "bt709",
      "-color_primaries", "bt709",
      "-color_trc", "bt709",
      "-c:a", "aac",
      "-b:a", "320k",
      "-movflags", "+faststart",
      outputName,
    ]);

    setProgress(100, "Tamamlandı");

    lastSarInfo = null;
    try {
      await engine.exec(["-i", outputName]);
    } catch {
      // ffmpeg exits non-zero here since no real output is given to this
      // probe call; the stream info (incl. SAR/DAR) is already logged by then.
    }
    console.log("Çıktı SAR/DAR:", lastSarInfo || "tespit edilemedi");

    const data = await engine.readFile(outputName);
    const blob = new Blob([data.buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);

    els.resultVideo.src = url;
    els.downloadLink.href = url;
    els.sizeOriginal.textContent = formatBytes(selectedFile.size);
    els.sizeOptimized.textContent = formatBytes(blob.size);
    els.resultPanel.hidden = false;

    if (blob.size > selectedFile.size * 3) {
      els.sizeWarning.hidden = false;
    } else {
      els.sizeWarning.hidden = true;
    }

    await engine.deleteFile(inputName);
    await engine.deleteFile(outputName);

    els.resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error(err);
    showError("Encode sırasında bir hata oluştu: " + (err?.message || String(err)));
  } finally {
    els.encodeBtn.disabled = false;
    els.progressWrap.hidden = true;
  }
}

els.encodeBtn.addEventListener("click", encode);
