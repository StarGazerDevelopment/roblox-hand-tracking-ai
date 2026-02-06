const canvas = document.getElementById('viewer');
const ctx = canvas.getContext('2d');
const modelLabel = document.getElementById('modelLabel');
const handCountEl = document.getElementById('handCount');
const viewerError = document.getElementById('viewerError');
const viewerFpsEl = document.getElementById('viewerFps');
const video = document.getElementById('viewerVideo');
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hand-data') : null;

let yaw = 0;
let pitch = 0;
let dragging = false;
let lastX = 0;
let lastY = 0;
let lastData = null;
let hands = null;
let lastFpsTime = performance.now();
let frameCount = 0;

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

function resize() {
  const w = canvas.clientWidth || canvas.parentElement.clientWidth;
  const h = canvas.clientHeight || canvas.parentElement.clientHeight;
  const rect = canvas.parentElement.getBoundingClientRect();
  const cw = Math.floor(rect.width);
  const ch = Math.floor(rect.height);
  if (cw && ch && (canvas.width !== cw || canvas.height !== ch)) {
    canvas.width = cw;
    canvas.height = ch;
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

function project(pt, scale) {
  const d = 0.6;
  const z = pt.z + d;
  const f = scale;
  return {
    x: canvas.width*0.5 + (pt.x * f) / Math.max(0.1, z),
    y: canvas.height*0.5 - (pt.y * f) / Math.max(0.1, z)
  };
}

function drawHand3D(points) {
  resize();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const center = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + p.z }), { x: 0, y: 0, z: 0 });
  center.x /= points.length; center.y /= points.length; center.z /= points.length;
  const centered = points.map(p => ({ x: p.x - center.x, y: -(p.y - center.y), z: p.z - center.z }));
  const m = rotMatrix(yaw, pitch);
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
  const scale = Math.min(canvas.width, canvas.height) * 0.65;
  const s = scale / diag;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#22d3ee';
  ctx.beginPath();
  const bones = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20]
  ];
  for (const [a,b] of bones) {
    const pa = project(rotated[a], s);
    const pb = project(rotated[b], s);
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
  }
  ctx.stroke();
  ctx.fillStyle = '#34d399';
  for (const p of rotated) {
    const pp = project(p, s);
    ctx.fillRect(pp.x - 3, pp.y - 3, 6, 6);
  }
}

function render() {
  if (lastData && lastData.hands && lastData.hands.length > 0) {
    const first = lastData.hands[0];
    drawHand3D(first);
    const label = lastData.meta && lastData.meta[0] ? lastData.meta[0].label : '-';
    modelLabel.textContent = `Model: ${label}`;
    handCountEl.textContent = `Hands: ${lastData.hands.length}`;
  } else {
    if (!lastData) {
      lastData = { ts: performance.now(), hands: [idleWorldHand()], meta: [{ label: 'Idle' }] };
    }
    const first = lastData.hands[0];
    drawHand3D(first);
    const label = lastData.meta && lastData.meta[0] ? lastData.meta[0].label : 'Idle';
    modelLabel.textContent = `Model: ${label}`;
    handCountEl.textContent = `Hands: ${lastData.hands.length}`;
  }
  requestAnimationFrame(render);
}

function updateFps() {
  frameCount++;
  const now = performance.now();
  const dt = now - lastFpsTime;
  if (dt >= 500) {
    const fps = Math.round((frameCount * 1000) / dt);
    viewerFpsEl.textContent = `FPS: ${fps}`;
    frameCount = 0;
    lastFpsTime = now;
  }
}

canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  yaw += dx * 0.01;
  pitch += dy * 0.01;
  lastX = e.clientX;
  lastY = e.clientY;
});
window.addEventListener('pointerup', () => {
  dragging = false;
});
window.addEventListener('resize', resize);

if (!bc) {
  viewerError.classList.remove('hidden');
  viewerError.textContent = 'BroadcastChannel not supported.';
}

if (bc) {
  bc.onmessage = (ev) => {
    const data = ev.data;
    if (data && Array.isArray(data.hands) && data.hands.length > 0) {
      lastData = data;
    }
  };
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    startProcessing();
  } catch (err) {
    viewerError.classList.remove('hidden');
    viewerError.textContent = `Camera error: ${err && err.message ? err.message : 'Unavailable or permission denied.'}`;
  }
}

function onResults(results) {
  if (Array.isArray(results.multiHandWorldLandmarks) && results.multiHandWorldLandmarks.length > 0) {
    const worldHands = results.multiHandWorldLandmarks.map(hand => hand.map(lm => ({ x: lm.x, y: lm.y, z: lm.z })));
    const meta = worldHands.map(() => ({ label: 'Live' }));
    lastData = { ts: performance.now(), hands: worldHands, meta };
  } else if (Array.isArray(results.multiHandLandmarks) && results.multiHandLandmarks.length > 0) {
    const imgHands = results.multiHandLandmarks.map(hand => hand.map(lm => ({ x: lm.x - 0.5, y: lm.y - 0.5, z: lm.z })));
    const meta = imgHands.map(() => ({ label: 'Live2D' }));
    lastData = { ts: performance.now(), hands: imgHands, meta };
  }
  updateFps();
}

function startProcessing() {
  if (!hands) {
    hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      selfieMode: true
    });
    hands.onResults(onResults);
  }
  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    const rfc = async () => {
      if (!video.srcObject) return;
      await hands.send({ image: video });
      video.requestVideoFrameCallback(rfc);
    };
    video.requestVideoFrameCallback(rfc);
  } else {
    const loop = async () => {
      await hands.send({ image: video });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

resize();
requestAnimationFrame(render);
startCamera();
