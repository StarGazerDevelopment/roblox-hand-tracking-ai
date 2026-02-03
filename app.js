const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d', { alpha: true });
const fpsEl = document.getElementById('fps');
const noHandsEl = document.getElementById('no-hands');
const errorEl = document.getElementById('error');
const startBtn = document.getElementById('startBtn');

let lastFpsTime = performance.now();
let frameCount = 0;
let avgFps = 0;
let complexityLevel = 0; // 0 (fast) or 1 (balanced)
let lastPerfAdjust = performance.now();

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20]
];

function resizeCanvas() {
  const w = video.videoWidth || canvas.clientWidth;
  const h = video.videoHeight || canvas.clientHeight;
  if (!w || !h) return;
  const needResize = canvas.width !== w || canvas.height !== h;
  if (needResize) {
    canvas.width = w;
    canvas.height = h;
  }
}

function drawSquare(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
}

function drawBoundingBox(points, color = '#38bdf8') {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const pad = 8;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(minX - pad, minY - pad, (maxX - minX) + 2 * pad, (maxY - minY) + 2 * pad);
}

function drawBones(points, color = '#22d3ee') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [a, b] of HAND_CONNECTIONS) {
    const pA = points[a];
    const pB = points[b];
    ctx.moveTo(pA.x, pA.y);
    ctx.lineTo(pB.x, pB.y);
  }
  ctx.stroke();
}

function updateFps() {
  frameCount++;
  const now = performance.now();
  const dt = now - lastFpsTime;
  if (dt >= 500) {
    const fps = Math.round((frameCount * 1000) / dt);
    avgFps = avgFps ? Math.round((avgFps * 0.6) + (fps * 0.4)) : fps;
    fpsEl.textContent = `FPS: ${fps}`;
    frameCount = 0;
    lastFpsTime = now;
  }
}

function adjustPerformance() {
  const now = performance.now();
  if (now - lastPerfAdjust < 3000) return;
  lastPerfAdjust = now;
  if (avgFps && avgFps < 25 && complexityLevel !== 0) {
    complexityLevel = 0;
    hands.setOptions({ modelComplexity: 0 });
  } else if (avgFps && avgFps > 40 && complexityLevel !== 1) {
    complexityLevel = 1;
    hands.setOptions({ modelComplexity: 1 });
  }
}

function onResults(results) {
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const hasHands = Array.isArray(results.multiHandLandmarks) && results.multiHandLandmarks.length > 0;
  noHandsEl.classList.toggle('hidden', hasHands);

  if (hasHands) {
    for (const hand of results.multiHandLandmarks) {
      const points = hand.map(lm => ({
        x: lm.x * canvas.width,
        y: lm.y * canvas.height
      }));
      drawBones(points, '#22d3ee');
      drawBoundingBox(points, '#38bdf8');
      for (const p of points) {
        drawSquare(p.x, p.y, 6, '#34d399');
      }
    }
  }

  updateFps();
  adjustPerformance();
}

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 0,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  selfieMode: true
});
hands.onResults(onResults);

async function startCamera() {
  errorEl.classList.add('hidden');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    resizeCanvas();
    startProcessingLoop();
  } catch (err) {
    errorEl.textContent = `Camera error: ${err && err.message ? err.message : 'Unavailable or permission denied.'}`;
    errorEl.classList.remove('hidden');
    startBtn.classList.remove('hidden');
  }
}

function startProcessingLoop() {
  let processing = false;
  const processFrame = async () => {
    if (!processing) {
      processing = true;
      try {
        await hands.send({ image: video });
      } finally {
        processing = false;
      }
    }
    requestAnimationFrame(processFrame);
  };

  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    const rfc = async (_now, _meta) => {
      if (!video.srcObject) return;
      try {
        await hands.send({ image: video });
      } finally {
        video.requestVideoFrameCallback(rfc);
      }
    };
    video.requestVideoFrameCallback(rfc);
  } else {
    requestAnimationFrame(processFrame);
  }
}

window.addEventListener('resize', () => {
  resizeCanvas();
});

video.addEventListener('loadedmetadata', () => {
  resizeCanvas();
});

startBtn.addEventListener('click', () => {
  startCamera();
});

window.addEventListener('load', () => {
  startCamera();
});
