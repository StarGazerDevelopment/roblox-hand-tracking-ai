# Hand Tracking (MediaPipe) – Phase 1

Real-time, browser-based hand tracking using MediaPipe Hands. No frameworks; HTML + CSS + Vanilla JS. Tracks up to two hands and renders landmarks/bones/bounding boxes over a mirrored live video feed.

## Features
- Accesses webcam (with permission) and starts automatically
- MediaPipe Hands (WebAssembly) in the browser
- Tracks up to 2 hands, 21 landmarks per hand
- Canvas overlay: bounding boxes, square joints, and bone lines
- Smooth rendering with `requestAnimationFrame`
- FPS counter and “No hand detected” message
- Horizontal mirror mode (selfie) for intuitive interaction
- Handles resize/orientation changes
- Conservative adaptive performance to avoid lag
- Works in Chrome and Edge

## Run Locally
This app runs locally. Performance depends on your device; it may be slower on low-end hardware.

Because the camera API requires a secure origin, run from `http://localhost`:

### Option A: Node (http-server)
```bash
npx http-server -p 8080 .
```
Open `http://localhost:8080` in Chrome or Edge.

### Option B: Python
```bash
python -m http.server 8080
```
Open `http://localhost:8080`.

### Option C: VS Code Live Server
Use the Live Server extension to serve the project folder.

## Source Structure
- `index.html` – page markup and script tags
- `styles.css` – layout and overlay styles
- `app.js` – camera, MediaPipe Hands, drawing and FPS

## Deploy (Vercel via GitHub)
Once pushed to GitHub, you can import this repository in Vercel and deploy as a static site. No server code required.

## Push to GitHub
Target: `https://github.com/StarGazerDevelopment/roblox-hand-tracking-cloud-ai.git`

If the repository already exists and you have access:
```bash
git init
git add .
git commit -m "Phase 1: Browser hand tracking with MediaPipe"
git branch -M main
git remote add origin https://github.com/StarGazerDevelopment/roblox-hand-tracking-cloud-ai.git
git push -u origin main
```

If it does not exist yet, create it under your GitHub account (public or private), then run the commands above. If your environment requires authentication, configure a token or use `gh` CLI:
```bash
gh repo create StarGazerDevelopment/roblox-hand-tracking-cloud-ai --public --source . --remote origin --push
```

## Notes
- Uses official MediaPipe Hands JS via CDN and WebAssembly assets.
- Adaptive performance adjusts model complexity to maintain ≥25 FPS where possible, without overusing CPU/GPU.
- This is Phase 1; a future phase will stream landmark data to a Roblox game.
