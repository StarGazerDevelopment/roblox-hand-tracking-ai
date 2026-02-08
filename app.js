const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d', { alpha: true });
const fpsEl = document.getElementById('fps');
const noHandsEl = document.getElementById('no-hands');
const errorEl = document.getElementById('error');
const startBtn = document.getElementById('startBtn');
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hand-data') : null;
let swReady = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(() => {
    swReady = true;
  });
}

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

function idleWorldHand() {
  return [
    { x: 0.0, y: -0.05, z: 0.02 },
    { x: 0.02, y: -0.03, z: 0.015 },
    { x: 0.035, y: -0.01, z: 0.01 },
    { x: 0.05, y: 0.01, z: 0.005 },
    { x: 0.065, y: 0.03, z: 0.0 },
    { x: 0.015, y: 0.0, z: 0.015 },
    { x: 0.02, y: 0.03, z: 0.01 },
    { x: 0.02, y: 0.06, z: 0.005 },
    { x: 0.02, y: 0.09, z: 0.0 },
    { x: 0.0, y: 0.0, z: 0.015 },
    { x: 0.0, y: 0.035, z: 0.01 },
    { x: 0.0, y: 0.07, z: 0.005 },
    { x: 0.0, y: 0.105, z: 0.0 },
    { x: -0.015, y: 0.0, z: 0.015 },
    { x: -0.015, y: 0.03, z: 0.01 },
    { x: -0.015, y: 0.06, z: 0.005 },
    { x: -0.015, y: 0.09, z: 0.0 },
    { x: -0.03, y: -0.005, z: 0.015 },
    { x: -0.03, y: 0.02, z: 0.01 },
    { x: -0.03, y: 0.045, z: 0.005 },
    { x: -0.03, y: 0.07, z: 0.0 }
  ];
}
let lastWorldHands = null;
const modelCanvas = document.getElementById('model');
const modelCtx = modelCanvas ? modelCanvas.getContext('2d') : null;
const modelLabelEl = document.getElementById('modelLabel');
const modelHandsEl = document.getElementById('modelHands');

function resizeModelCanvas() {
  if (!modelCanvas) return;
  const w = modelCanvas.clientWidth || modelCanvas.parentElement.clientWidth;
  const h = modelCanvas.clientHeight || modelCanvas.parentElement.clientHeight;
  const rect = modelCanvas.parentElement.getBoundingClientRect();
  const cw = Math.floor(rect.width);
  const ch = Math.floor(rect.height);
  if (cw && ch && (modelCanvas.width !== cw || modelCanvas.height !== ch)) {
    modelCanvas.width = cw;
    modelCanvas.height = ch;
  }
}

function rotMatrix(yaw, pitch) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  return [
    [ cy, 0, sy ],
    [ sy*sp, cp, -cy*sp ],
    [ -sy*cp, sp, cy*cp ]
  ];
}
function applyRot(p, m) {
  return {
    x: p.x*m[0][0] + p.y*m[0][1] + p.z*m[0][2],
    y: p.x*m[1][0] + p.y*m[1][1] + p.z*m[1][2],
    z: p.x*m[2][0] + p.y*m[2][1] + p.z*m[2][2]
  };
}
function project3D(pt, scale) {
  const d = 0.6;
  const z = pt.z + d;
  const f = scale;
  return {
    x: modelCanvas.width*0.5 + (pt.x * f) / Math.max(0.1, z),
    y: modelCanvas.height*0.5 - (pt.y * f) / Math.max(0.1, z)
  };
}
function drawHand3DWorld(points, label) {
  if (!modelCtx || !modelCanvas) return;
  resizeModelCanvas();
  modelCtx.clearRect(0, 0, modelCanvas.width, modelCanvas.height);
  const center = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }), { x: 0, y: 0, z: 0 });
  center.x /= points.length; center.y /= points.length; center.z /= points.length;
  const centered = points.map(p => ({ x: p.x - center.x, y: -(p.y - center.y), z: p.z - center.z }));
  const m = rotMatrix(0, 0);
  const rotated = centered.map(p => applyRot(p, m));
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of rotated) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (p.z > maxZ) maxZ = p.z;
  }
  const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
  const diag = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
  const scale = Math.min(modelCanvas.width, modelCanvas.height) * 0.65;
  const s = scale / diag;
  modelCtx.lineWidth = 2;
  modelCtx.strokeStyle = '#22d3ee';
  modelCtx.beginPath();
  for (const [a,b] of HAND_CONNECTIONS) {
    const pa = project3D(rotated[a], s);
    const pb = project3D(rotated[b], s);
    modelCtx.moveTo(pa.x, pa.y);
    modelCtx.lineTo(pb.x, pb.y);
  }
  modelCtx.stroke();
  modelCtx.fillStyle = '#34d399';
  for (const p of rotated) {
    const pp = project3D(p, s);
    modelCtx.fillRect(pp.x - 3, pp.y - 3, 6, 6);
  }
  if (modelLabelEl) modelLabelEl.textContent = `Model: ${label || '-'}`;
}

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

  if (bc) {
    let worldHands = null;
    if (Array.isArray(results.multiHandWorldLandmarks) && results.multiHandWorldLandmarks.length > 0) {
      worldHands = results.multiHandWorldLandmarks.map(hand => hand.map(lm => ({ x: lm.x, y: lm.y, z: lm.z })));
      lastWorldHands = worldHands;
    } else if (Array.isArray(results.multiHandLandmarks) && results.multiHandLandmarks.length > 0) {
      worldHands = results.multiHandLandmarks.map(hand => hand.map(lm => ({
        x: lm.x - 0.5,
        y: lm.y - 0.5,
        z: lm.z
      })));
      lastWorldHands = worldHands;
    } else if (lastWorldHands) {
      worldHands = lastWorldHands;
    } else {
      worldHands = [idleWorldHand()];
    }
    const classify = (pts) => {
      let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.z < minZ) minZ = p.z;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
        if (p.z > maxZ) maxZ = p.z;
      }
      const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
      const diag = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      let sum = 0, cnt = 0;
      for (const [a, b] of HAND_CONNECTIONS) {
        const pa = pts[a], pb = pts[b];
        const lx = pa.x - pb.x, ly = pa.y - pb.y, lz = pa.z - pb.z;
        sum += Math.sqrt(lx * lx + ly * ly + lz * lz);
        cnt++;
      }
      const avg = sum / Math.max(cnt, 1);
      const ratio = avg / diag;
      let label = 'Medium';
      if (ratio < 0.09) label = 'Small';
      else if (ratio > 0.14) label = 'Large';
      return { bbox: { dx, dy, dz, diag }, avgBone: avg, ratio, label };
    };
    const meta = worldHands.map(classify);
    bc.postMessage({ ts: performance.now(), hands: worldHands, meta });
    if (swReady) {
      const msg = { type: 'landmarksUpdate', ts: performance.now(), hands: worldHands, meta };
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(msg);
      } else {
        navigator.serviceWorker.ready.then(reg => {
          if (reg.active) reg.active.postMessage(msg);
        });
      }
    }
    if (worldHands && worldHands.length > 0) {
      drawHand3DWorld(worldHands[0], meta && meta[0] ? meta[0].label : 'Live');
      if (modelHandsEl) modelHandsEl.textContent = `Hands: ${worldHands.length}`;
    } else {
      drawHand3DWorld(idleWorldHand(), 'Idle');
      if (modelHandsEl) modelHandsEl.textContent = `Hands: 0`;
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
