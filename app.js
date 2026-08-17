const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const colorInput = document.getElementById('color');
const widthInput = document.getElementById('width');
const fsBtn = document.getElementById('fullscreen-btn');
const pageIndicator = document.getElementById('page-indicator');

const pages = new Map();
const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffffff'];
let activePageIndex = 0;
let isDrawing = false;
let isErasing = false;
let points = [];
let viewport = { width: 0, height: 0, dpr: 1 };

function createPage(width, height, dpr) {
  const surface = document.createElement('canvas');
  surface.width = Math.round(width * dpr);
  surface.height = Math.round(height * dpr);
  const surfaceCtx = surface.getContext('2d');
  surfaceCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  surfaceCtx.lineCap = 'round';
  surfaceCtx.lineJoin = 'round';
  return { surface, ctx: surfaceCtx, width, height, dpr };
}

function getPage(index = activePageIndex) {
  let page = pages.get(index);
  if (!page) {
    page = createPage(viewport.width, viewport.height, viewport.dpr);
    pages.set(index, page);
  }
  return page;
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

function render() {
  const page = getPage();
  const offset = getViewportOffset(page);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#1f2226';
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

function resizeCanvas() {
  viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.max(window.devicePixelRatio || 1, 1),
  };
  canvas.width = Math.round(viewport.width * viewport.dpr);
  canvas.height = Math.round(viewport.height * viewport.dpr);
  for (const page of pages.values()) {
    expandPage(page, viewport.width, viewport.height);
  }
  render();
}

function clearPage() {
  const page = getPage();
  page.ctx.setTransform(1, 0, 0, 1, 0, 0);
  page.ctx.clearRect(0, 0, page.surface.width, page.surface.height);
  page.ctx.setTransform(page.dpr, 0, 0, page.dpr, 0, 0);
  render();
}

function changePage(direction) {
  activePageIndex += direction;
  getPage();
  pageIndicator.textContent = `Page ${activePageIndex}`;
  render();
}

function midpoint(first, second) {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function setStrokeFromUI() {
  const page = getPage();
  page.ctx.strokeStyle = colorInput.value || '#ffffff';
  page.ctx.lineWidth = parseFloat(widthInput.value) || 6;
}

function drawSmooth() {
  if (points.length < 2) return;

  const drawCtx = getPage().ctx;
  drawCtx.beginPath();
  if (points.length === 2) {
    drawCtx.moveTo(points[0].x, points[0].y);
    drawCtx.lineTo(points[1].x, points[1].y);
  } else {
    const firstMidpoint = midpoint(points[points.length - 3], points[points.length - 2]);
    const lastPoint = points[points.length - 2];
    const secondMidpoint = midpoint(lastPoint, points[points.length - 1]);
    drawCtx.moveTo(firstMidpoint.x, firstMidpoint.y);
    drawCtx.quadraticCurveTo(lastPoint.x, lastPoint.y, secondMidpoint.x, secondMidpoint.y);
  }
  drawCtx.stroke();
  render();
}

function isRearEraser(event) {
  return event.pointerType === 'pen' && (event.button === 5 || (event.buttons & 32) !== 0);
}

function isBarrelButton(event) {
  return event.pointerType === 'pen' && (event.button === 2 || (event.buttons & 2) !== 0);
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const offset = getViewportOffset(getPage());
  return {
    x: event.clientX - rect.left + offset.x,
    y: event.clientY - rect.top + offset.y,
  };
}

function strokeWidth(event) {
  const pressure = event.pressure || 0.5;
  const baseWidth = parseFloat(widthInput.value) || 6;
  return baseWidth * (pressure < 0.01 ? 1 : 0.5 + pressure);
}

canvas.addEventListener('pointerdown', (event) => {
  if (isBarrelButton(event)) {
    const colorIndex = colors.indexOf(colorInput.value.toLowerCase());
    colorInput.value = colors[(colorIndex + 1) % colors.length];
    setStrokeFromUI();
    event.preventDefault();
    return;
  }

  if (event.button && event.button !== 0 && !isRearEraser(event)) return;
  canvas.setPointerCapture(event.pointerId);
  isDrawing = true;
  isErasing = isRearEraser(event);
  points = [pointFromEvent(event)];

  const page = getPage();
  page.ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
  page.ctx.lineWidth = strokeWidth(event);
  page.ctx.beginPath();
  page.ctx.arc(points[0].x, points[0].y, page.ctx.lineWidth / 2, 0, Math.PI * 2);
  page.ctx.fillStyle = isErasing ? '#000000' : page.ctx.strokeStyle;
  page.ctx.fill();
  render();
});

canvas.addEventListener('pointermove', (event) => {
  if (!isDrawing) return;
  const page = getPage();
  page.ctx.lineWidth = strokeWidth(event);
  points.push(pointFromEvent(event));
  if (points.length > 3) points.shift();
  drawSmooth();
});

function endStroke(event) {
  if (!isDrawing) return;
  isDrawing = false;
  isErasing = false;
  canvas.releasePointerCapture?.(event.pointerId);
  getPage().ctx.globalCompositeOperation = 'source-over';
  points = [];
}

canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

colorInput.addEventListener('input', setStrokeFromUI);
widthInput.addEventListener('input', setStrokeFromUI);

async function enterFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await canvas.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch (error) {
    console.warn('Fullscreen error', error);
  }
}

fsBtn.addEventListener('click', enterFullscreen);

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement) return;

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    changePage(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    changePage(1);
  } else if (event.key.toLowerCase() === 'c') {
    clearPage();
  } else if (event.key.toLowerCase() === 'f') {
    enterFullscreen();
  }
});

canvas.addEventListener('dblclick', () => {
  if (confirm('Clear canvas?')) clearPage();
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
setStrokeFromUI();
