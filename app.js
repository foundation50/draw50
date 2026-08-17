const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d', { alpha: false }); // opaque for better performance

const colorInput = document.getElementById('color');
const widthInput = document.getElementById('width');
const fsBtn = document.getElementById('fullscreen-btn');

let isDrawing = false;
let points = []; // store last few points for smoothing
const baseWidth = parseInt(widthInput.value, 10) || 6;

function resizeCanvas(preserveContent = true){
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Snapshot current drawing before the canvas is resized (which clears it).
  let snapshot = null;
  if(preserveContent && canvas.width > 0 && canvas.height > 0){
    snapshot = document.createElement('canvas');
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext('2d').drawImage(canvas, 0, 0);
  }

  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Fill background first.
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg') || '#1f2226';
  ctx.fillRect(0, 0, w, h);

  // Restore the saved drawing scaled to the new CSS size.
  if(snapshot){
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // draw in raw pixel space
    ctx.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Restore stroke settings (setTransform resets them).
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colorInput.value || '#fff';
  ctx.lineWidth = parseFloat(widthInput.value) || 6;
}

// Utility
function pt(x,y){ return {x, y}; }
function midpoint(p1,p2){ return { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 }; }

function setStrokeFromUI(e){
  ctx.strokeStyle = colorInput.value || '#fff';
  // width controlled here but also modulated by pressure
  ctx.lineWidth = parseFloat(widthInput.value) || 6;
}

setStrokeFromUI();

// Smooth drawing using quadratic curves between midpoints.
function drawSmooth(){
  if(points.length < 2) return;
  // When >=3 points, draw quadratic between midpoints of (p0,p1) and (p1,p2)
  if(points.length >= 3){
    const p0 = points[points.length-3];
    const p1 = points[points.length-2];
    const p2 = points[points.length-1];
    const m1 = midpoint(p0,p1);
    const m2 = midpoint(p1,p2);

    ctx.beginPath();
    ctx.moveTo(m1.x, m1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, m2.x, m2.y);
    ctx.stroke();
  } else {
    // just two points — draw a line
    const a = points[0];
    const b = points[1];
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

// pointer handlers
canvas.addEventListener('pointerdown', (e) => {
  // only handle primary button
  if (e.button && e.button !== 0) return;
  canvas.setPointerCapture(e.pointerId);
  isDrawing = true;
  points = [];
  // set stroke style/width for this pointer
  setStrokeFromUI();
  const pressure = e.pressure || 0.5;
  ctx.lineWidth = (parseFloat(widthInput.value) || baseWidth) * (pressure < 0.01 ? 1 : (0.5 + pressure));

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  points.push(pt(x,y));
  // For a crisp start draw a tiny dot
  ctx.beginPath();
  ctx.arc(x, y, ctx.lineWidth/2, 0, Math.PI*2);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
});

canvas.addEventListener('pointermove', (e) => {
  if(!isDrawing) return;
  // update width via pressure if available
  const pressure = e.pressure || 0.5;
  ctx.lineWidth = (parseFloat(widthInput.value) || baseWidth) * (pressure < 0.01 ? 1 : (0.5 + pressure));

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  points.push(pt(x,y));
  // limit length to keep smoothing stable
  if(points.length > 100) points.shift();
  drawSmooth();
});

function endStroke(e){
  if(!isDrawing) return;
  isDrawing = false;
  canvas.releasePointerCapture?.(e?.pointerId);
  // finalize remaining points (if any)
  if(points.length === 2){
    drawSmooth();
  }
  points = [];
}

canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);

// UI bindings
colorInput.addEventListener('input', () => {
  ctx.strokeStyle = colorInput.value;
});
widthInput.addEventListener('input', () => {
  ctx.lineWidth = parseFloat(widthInput.value);
});

// Fullscreen toggle
async function enterFullscreen(){
  try{
    if(document.fullscreenElement){
      await document.exitFullscreen();
    } else {
      // prefer fullscreen on the canvas element to remove browser chrome
      await canvas.requestFullscreen({ navigationUI: 'hide' });
    }
  }catch(err){
    console.warn('Fullscreen error', err);
  }
}
fsBtn.addEventListener('click', enterFullscreen);

// keyboard: F toggles fullscreen
window.addEventListener('keydown', (e) => {
  if(e.key === 'f' || e.key === 'F'){
    enterFullscreen();
  }
});

// keep canvas sized
window.addEventListener('resize', resizeCanvas);
// on orientation change too
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 200));

// initialize
resizeCanvas();

// Helpful: prevent two-finger gestures on touch from scrolling
window.addEventListener('touchmove', (e)=>{ if(e.touches && e.touches.length>1) e.preventDefault(); }, { passive:false });

// Expose a quick clear via double click
canvas.addEventListener('dblclick', (e)=>{
  const r = confirm('Clear canvas?');
  if(r){
    resizeCanvas(false);
  }
});
