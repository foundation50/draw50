# Draw50

Draw50 is a small, dependency-free, browser-based drawing canvas inspired by the focused, dark interface of modern digital drawing apps.

## Running locally

Serve the project directory with any static web server, then open the printed local URL:

```sh
cd /Users/coltonoscopy/dev/web/draw50
python3 -m http.server 8000
```

Visit <http://localhost:8000> in a modern browser such as Chrome, Edge, Firefox, or Safari.

The app is also fully static: [index.html](index.html), [style.css](style.css), and [app.js](app.js). No installation, build step, or dependencies are required.

## Controls

| Action | Control |
| --- | --- |
| Draw | Drag with a mouse, pen, or single finger |
| Select a stroke color | Use the color picker in the top-left toolbar |
| Change base stroke width | Use the width slider (1–60 px) |
| Toggle fullscreen | Click the fullscreen button or press `F` |
| Exit fullscreen | Press `Esc` |
| Clear the canvas | Double-click the canvas, then confirm |

## Behavior

- The canvas fills the complete browser viewport and starts with a dark grey, editor-like background.
- Strokes are white by default.
- Pointer input is captured during a stroke, so a stroke continues even if the pointer leaves the canvas momentarily.
- Drawing uses real-time quadratic curves between pointer midpoints, producing smooth rounded paths as the user draws rather than applying smoothing afterward.
- On pressure-capable pens and devices, pressure subtly affects stroke width.
- The canvas uses device-pixel-ratio scaling for crisp high-DPI rendering.
- Entering or leaving fullscreen, rotating a device, or resizing the window preserves the current drawing. The saved raster content is scaled to the new canvas size.
- The fullscreen request asks the browser to hide navigation UI where the browser permits it. Browsers require fullscreen to be initiated from a user action.

## Browser notes

The app uses the Pointer Events API and the Fullscreen API, both supported in current major desktop and mobile browsers. Fullscreen behavior and browser UI hiding remain subject to each browser's platform policies.
