# Hand Tracking (MediaPipe)

Real-time, browser-based hand tracking powered by Google’s MediaPipe. Tracks up to two hands and overlays landmarks, bones, and bounding boxes directly on the live camera feed. Includes a rotatable 3D model view.

## How It Works
- Uses MediaPipe Hands (WebAssembly) entirely in the browser.
- Accesses your webcam (with permission) and starts tracking automatically.
- Detects 21 landmarks per hand for up to 2 hands.
- Draws:
  - Bounding box for each detected hand
  - Small squares for each joint/landmark
  - Lines between joints to show finger bones
- Smooth rendering via `requestAnimationFrame` on a Canvas overlay.
- Shows live FPS and a “No hand detected” message when empty.
- Handles resize/orientation and flips video horizontally (mirror mode) for intuitive interaction.

## Components
- `index.html` — Main page with live camera and overlay
- `styles.css` — Layout and visual styles
- `app.js` — Camera access, MediaPipe Hands integration, overlays, FPS, and inline 3D model
- `viewer.html` — Standalone 3D viewer page
- `viewer.js` — 3D projection and rotation; consumes world landmarks

## Usage
- Open the site, allow camera permission, and move your hands in view.
- Open `viewer.html` for a 3D skeleton view; drag to rotate.
- Works in Chrome and Edge.

## Credits
- Powered by Google’s MediaPipe
