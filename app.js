const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const app = document.getElementById('draw-app');
const transitionCanvas = document.getElementById('transition-canvas');
const transitionCtx = transitionCanvas.getContext('2d');
const colorInput = document.getElementById('color');
const widthInput = document.getElementById('width');
const widthValue = document.getElementById('width-value');
const fsBtn = document.getElementById('fullscreen-btn');
const pageIndicator = document.getElementById('page-indicator');

const AUTO_SAVE_DELAY_MS = 15_000;
const AUTO_DOWNLOAD_ENABLED = false;
const colors = ['#ff0000', '#ffff00', '#0000ff', '#ffffff'];
const strokeWidths = [2, 3, 4, 6, 8, 11, 14, 18, 23, 29];
const pages = new Map();

let activePageIndex = 0;
let activeStroke = null;
let viewport = { width: 0, height: 0, dpr: 1 };

function createPage(width, height, dpr) {
  const surface = document.createElement('canvas');
  surface.width = Math.round(width * dpr);
  surface.height = Math.round(height * dpr);
  const surfaceCtx = surface.getContext('2d');
  surfaceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  surfaceCtx.lineCap = 'round';
  surfaceCtx.lineJoin = 'round';
  return {
    surface,
    ctx: surfaceCtx,
    width,
    height,
    dpr,
    strokes: [],
    revision: 0,
    saveTimer: null,
  };
}

function getPage(index = activePageIndex) {
  let page = pages.get(index);
  if (!page) {
    page = createPage(viewport.width, viewport.height, viewport.dpr);
    pages.set(index, page);
  }
  return page;
}

function prepareContext(page) {
  page.ctx.setTransform(page.dpr, 0, 0, page.dpr, 0, 0);
  page.ctx.lineCap = 'round';
  page.ctx.lineJoin = 'round';
}

function expandPage(page, width, height) {
  const nextWidth = Math.max(page.width, width);
  const nextHeight = Math.max(page.height, height);
  if (nextWidth === page.width && nextHeight === page.height) return;

  const expanded = createPage(nextWidth, nextHeight, page.dpr);
  const offsetX = (nextWidth - page.width) / 2;
  const offsetY = (nextHeight - page.height) / 2;
  expanded.ctx.drawImage(
    page.surface,
    0,
    0,
    page.surface.width,
    page.surface.height,
    offsetX,
    offsetY,
    page.width,
    page.height,
  );

  for (const stroke of page.strokes) {
    for (const point of stroke.points) {
      point.x += offsetX;
      point.y += offsetY;
    }
  }

  page.surface = expanded.surface;
  page.ctx = expanded.ctx;
  page.width = nextWidth;
  page.height = nextHeight;
}

function getViewportOffset(page) {
  return {
    x: (page.width - viewport.width) / 2,
    y: (page.height - viewport.height) / 2,
  };
}

function backgroundColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#1f2226';
}

function render() {
  const page = getPage();
  const offset = getViewportOffset(page);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = backgroundColor();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    page.surface,
    Math.round(offset.x * page.dpr),
    Math.round(offset.y * page.dpr),
    Math.round(viewport.width * page.dpr),
    Math.round(viewport.height * page.dpr),
    0,
    0,
    canvas.width,
    canvas.height,
  );
}

function renderStroke(page, stroke) {
  const drawCtx = page.ctx;
  const { points } = stroke;
  if (points.length === 0) return;

  drawCtx.globalCompositeOperation = stroke.isErasing ? 'destination-out' : 'source-over';
  drawCtx.strokeStyle = stroke.color;
  drawCtx.fillStyle = stroke.isErasing ? '#000000' : stroke.color;
  drawCtx.lineWidth = points[0].width;
  drawCtx.beginPath();
  drawCtx.arc(points[0].x, points[0].y, drawCtx.lineWidth / 2, 0, Math.PI * 2);
  drawCtx.fill();

  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    drawCtx.lineWidth = current.width;
    drawCtx.beginPath();
    if (index === 1) {
      drawCtx.moveTo(points[0].x, points[0].y);
      drawCtx.lineTo(current.x, current.y);
    } else {
      const firstMidpoint = midpoint(points[index - 2], points[index - 1]);
      const secondMidpoint = midpoint(points[index - 1], current);
      drawCtx.moveTo(firstMidpoint.x, firstMidpoint.y);
      drawCtx.quadraticCurveTo(points[index - 1].x, points[index - 1].y, secondMidpoint.x, secondMidpoint.y);
    }
    drawCtx.stroke();
  }
}

function redrawPage(page) {
  page.ctx.setTransform(1, 0, 0, 1, 0, 0);
  page.ctx.clearRect(0, 0, page.surface.width, page.surface.height);
  prepareContext(page);
  for (const stroke of page.strokes) {
    renderStroke(page, stroke);
  }
  page.ctx.globalCompositeOperation = 'source-over';
}

function resizeCanvas() {
  viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.max(window.devicePixelRatio || 1, 1),
  };
  canvas.width = Math.round(viewport.width * viewport.dpr);
  canvas.height = Math.round(viewport.height * viewport.dpr);
  transitionCanvas.width = canvas.width;
  transitionCanvas.height = canvas.height;
  for (const page of pages.values()) {
    expandPage(page, viewport.width, viewport.height);
  }
  render();
}

function markPageDirty(page, index = activePageIndex) {
  page.revision += 1;
  if (page.saveTimer) clearTimeout(page.saveTimer);
  page.saveTimer = null;
  if (!AUTO_DOWNLOAD_ENABLED) return;

  const revision = page.revision;
  page.saveTimer = setTimeout(() => {
    page.saveTimer = null;
    if (page.revision === revision) downloadPage(index);
  }, AUTO_SAVE_DELAY_MS);
}

function downloadPage(index) {
  const page = getPage(index);
  const offset = getViewportOffset(page);
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = Math.round(viewport.width * viewport.dpr);
  exportCanvas.height = Math.round(viewport.height * viewport.dpr);
  const exportCtx = exportCanvas.getContext('2d');
  exportCtx.fillStyle = backgroundColor();
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportCtx.drawImage(
    page.surface,
    Math.round(offset.x * page.dpr),
    Math.round(offset.y * page.dpr),
    exportCanvas.width,
    exportCanvas.height,
    0,
    0,
    exportCanvas.width,
    exportCanvas.height,
  );
  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `draw50-page-${index}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }, 'image/png');
}

function clearPage(index = activePageIndex) {
  const page = getPage(index);
  page.strokes = [];
  redrawPage(page);
  markPageDirty(page, index);
  if (index === activePageIndex) render();
}

function undoLastStroke() {
  const page = getPage();
  if (page.strokes.length === 0) return;
  page.strokes.pop();
  redrawPage(page);
  markPageDirty(page);
  render();
}

function changePage(direction) {
  transitionCanvas.classList.remove('page-exit-up', 'page-exit-down');
  transitionCtx.setTransform(1, 0, 0, 1, 0, 0);
  transitionCtx.clearRect(0, 0, transitionCanvas.width, transitionCanvas.height);
  transitionCtx.drawImage(canvas, 0, 0);

  activePageIndex += direction;
  getPage();
  pageIndicator.textContent = `Page ${activePageIndex}`;
  canvas.classList.remove('page-enter-up', 'page-enter-down');
  render();
  void canvas.offsetWidth;
  canvas.classList.add(direction < 0 ? 'page-enter-up' : 'page-enter-down');
  transitionCanvas.classList.add(direction < 0 ? 'page-exit-up' : 'page-exit-down');
}

function midpoint(first, second) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function selectedStrokeWidth() {
  return strokeWidths[Number(widthInput.value)] ?? strokeWidths[0];
}

function setStrokeFromUI() {
  const selectedColor = colors.includes(colorInput.value.toLowerCase()) ? colorInput.value : '#ffffff';
  colorInput.value = selectedColor;
  colorInput.style.backgroundColor = selectedColor;
  widthValue.textContent = widthInput.value;
}

function adjustStrokeSize(direction) {
  const nextSize = Math.min(
    Number(widthInput.max),
    Math.max(Number(widthInput.min), Number(widthInput.value) + direction),
  );
  widthInput.value = String(nextSize);
  setStrokeFromUI();
}

function cycleColor() {
  const colorIndex = colors.indexOf(colorInput.value.toLowerCase());
  colorInput.value = colors[(colorIndex + 1) % colors.length];
  setStrokeFromUI();
}

function isRearEraser(event) {
  return event.pointerType === 'pen' && (event.button === 5 || (event.buttons & 32) !== 0);
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const offset = getViewportOffset(getPage());
  return {
    x: event.clientX - rect.left + offset.x,
    y: event.clientY - rect.top + offset.y,
  };
}

function strokeWidth(event, isEraser = false) {
  const pressure = event.pressure || 0.5;
  const pressureWidth = selectedStrokeWidth() * (pressure < 0.01 ? 1 : 0.5 + pressure);
  if (!isEraser) return pressureWidth;
  return pressureWidth * (Number(widthInput.value) === 0 ? 18 : 8);
}

function addStrokePoint(event, preserveEndpoint = false) {
  const lastPoint = activeStroke.points.at(-1);
  const rawPoint = pointFromEvent(event);
  if (lastPoint && Math.hypot(lastPoint.x - rawPoint.x, lastPoint.y - rawPoint.y) < 0.1) return;

  const smoothingFactor = selectedStrokeWidth() >= 14 ? 0.55 : 0.72;
  const point = lastPoint && !preserveEndpoint
    ? {
        x: lastPoint.x + (rawPoint.x - lastPoint.x) * smoothingFactor,
        y: lastPoint.y + (rawPoint.y - lastPoint.y) * smoothingFactor,
      }
    : rawPoint;
  const targetWidth = strokeWidth(event, activeStroke.isErasing);
  const width = lastPoint ? lastPoint.width * 0.7 + targetWidth * 0.3 : targetWidth;
  activeStroke.points.push({ ...point, width });
  renderStroke(getPage(), {
    ...activeStroke,
    points: activeStroke.points.slice(-3),
  });
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.button && event.button !== 0 && !isRearEraser(event)) return;
  canvas.setPointerCapture(event.pointerId);

  const page = getPage();
  const isErasing = isRearEraser(event);
  activeStroke = {
    color: colorInput.value,
    isErasing,
    points: [{ ...pointFromEvent(event), width: strokeWidth(event, isErasing) }],
  };
  page.strokes.push(activeStroke);
  renderStroke(page, activeStroke);
  render();
});

canvas.addEventListener('pointermove', (event) => {
  if (!activeStroke) return;
  const coalescedEvents = event.getCoalescedEvents?.() ?? [event];
  for (const coalescedEvent of coalescedEvents) {
    addStrokePoint(coalescedEvent);
  }
  addStrokePoint(event);
  render();
});

function endStroke(event) {
  if (!activeStroke) return;
  addStrokePoint(event, true);
  canvas.releasePointerCapture?.(event.pointerId);
  activeStroke = null;
  markPageDirty(getPage());
}

canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('dblclick', () => undefined);
canvas.addEventListener('animationend', () => canvas.classList.remove('page-enter-up', 'page-enter-down'));
transitionCanvas.addEventListener('animationend', () => {
  transitionCanvas.classList.remove('page-exit-up', 'page-exit-down');
  transitionCtx.clearRect(0, 0, transitionCanvas.width, transitionCanvas.height);
});

colorInput.addEventListener('click', cycleColor);
widthInput.addEventListener('input', setStrokeFromUI);

async function enterFullscreen() {
  if (window.draw50Desktop) {
    await window.draw50Desktop.toggleFullscreen();
    return;
  }

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await app.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch (error) {
    console.warn('Fullscreen error', error);
  }
}

fsBtn.addEventListener('click', enterFullscreen);

if (window.draw50Desktop) {
  document.documentElement.classList.add('desktop-fullscreen');
  window.draw50Desktop.onFullscreenChange((isFullscreen) => {
    document.documentElement.classList.toggle('desktop-fullscreen', isFullscreen);
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'F13') {
    cycleColor();
    return;
  }

  if (event.code === 'KeyC') {
    event.preventDefault();
    clearPage();
    return;
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    undoLastStroke();
    return;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    adjustStrokeSize(-1);
    return;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    adjustStrokeSize(1);
    return;
  }

  if (event.target instanceof HTMLInputElement) return;

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    changePage(-1);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    changePage(1);
  } else if (event.key.toLowerCase() === 'f') {
    enterFullscreen();
  }
});

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 200));
window.addEventListener(
  'touchmove',
  (event) => {
    if (event.touches.length > 1) event.preventDefault();
  },
  { passive: false },
);

resizeCanvas();
colorInput.value = '#ffffff';
setStrokeFromUI();
