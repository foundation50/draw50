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
| Cycle red, green, blue, and white | Click the color swatch or press `F13` |
| Change stroke size | Use the discrete size slider (0–9, with 0 as the thinnest default) |
| Toggle fullscreen | Click the fullscreen button or press `F` |
| Exit fullscreen | Press `Esc` |
| Clear the current canvas immediately | Press `C` |
| Clear the current canvas with confirmation | Double-click the canvas |
| Previous canvas page | Up Arrow |
| Next canvas page | Down Arrow |
| Undo the last stroke | Backspace |
| Spot erase | Draw with the Slim Pen 2 rear eraser button |

## Behavior

- The canvas fills the complete browser viewport and starts with a dark grey, editor-like background. Its CSS cursor is hidden so the browser does not draw a canvas reticle while a pen is nearby.
- Strokes are white by default.
- Pointer input is captured during a stroke, so a stroke continues even if the pointer leaves the canvas momentarily.
- Drawing uses real-time quadratic curves between pointer midpoints, producing smooth rounded paths as the user draws rather than applying smoothing afterward.
- On pressure-capable pens and devices, pressure subtly affects stroke width. The rear eraser works as a traditional spot eraser, removing only the pixels it passes over with a 2.5× wider footprint.
- Pages are addressed by integer position, starting at page `0`. Up Arrow can create and open page `-1`; Down Arrow can create and open page `1`. Navigation is unbounded in either direction, each page retains its own drawing for the browser session, and a short directional slide cue indicates movement.
- The canvas uses device-pixel-ratio scaling for crisp high-DPI rendering.
- Entering or leaving fullscreen, rotating a device, or resizing the window preserves every page. Page surfaces grow when the viewport grows and center their existing drawing in the added space; a smaller viewport displays the centered portion without shrinking the underlying page.
- Each page automatically downloads a PNG 15 seconds after its most recent drawing, erase, clear, or undo activity. The timer resets for subsequent activity, and untouched pages do not download files. Chrome may ask permission before allowing repeated automatic downloads.
- The fullscreen request asks the browser to hide navigation UI where the browser permits it. Browsers require fullscreen to be initiated from a user action.

## Slim Pen 2 top-button helper (Windows)

The Slim Pen 2 top Bluetooth button can launch the included, windowless [F13Helper.exe](pen-helper/Program.cs). The helper sends an `F13` key press to the foreground application and exits immediately. Draw50 maps `F13` to color cycling, so Chrome receives the shortcut without needing the pen tip to touch the display.

### Obtaining the executable

Tag a release with `pen-helper-v*` (for example, `pen-helper-v1.0.0`). The [release workflow](.github/workflows/release-pen-helper.yml) builds `F13Helper.exe` on a GitHub-hosted Windows runner and attaches it to the GitHub Release. A manually dispatched workflow run uploads the same executable as an Actions artifact.

The helper is source-built in [pen-helper/](pen-helper/) as a self-contained, single-file .NET 8 executable. It has no window, installation step, or runtime dependency on the Surface.

### Configuring the Surface

1. Download `F13Helper.exe` from the release and copy it to a permanent location, such as `C:\Tools\PenHelper\F13Helper.exe`.
2. Bluetooth-pair the Slim Pen 2.
3. In **Settings > Bluetooth & devices > Pen & Windows Ink**, configure the pen shortcut button's **Single-click** action to open a program.
4. Select `C:\Tools\PenHelper\F13Helper.exe`.
5. Keep Draw50 open and focused in Chrome. Clicking the pen's top button now cycles the color.

The helper sends its keystroke to whichever application Windows considers foreground. Chrome must remain focused for Draw50 to receive `F13`.

### Troubleshooting top-button presses

Each helper launch records its `SendInput` result in `%LOCALAPPDATA%\Draw50\F13Helper.log`.

- No new log line after a top-button click means Windows did not launch the configured program; revisit the Pen & Windows Ink shortcut-button mapping.
- `SendInput=2/2 InputSize=40` means the helper launched and Windows accepted both the F13 key-down and key-up events. Ensure Chrome is focused and confirm the deployed Draw50 page contains the current `F13` handler.
- A value other than `2/2` means Windows did not accept both keyboard input events.

## Browser notes

The app uses the Pointer Events API and the Fullscreen API, both supported in current major desktop and mobile browsers. Fullscreen behavior and browser UI hiding remain subject to each browser's platform policies. The rear eraser is handled through pen pointer events. Operating-system-level pen indicators are outside a web page's control.
