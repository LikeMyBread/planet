/**
 * Pixel Planet Creator - Main Application Logic
 */

(function () {
  'use strict';

  // ==========================================================================
  // Color Palettes for Pixel Art Quantization
  // ==========================================================================
  const PALETTES = {
    pico8: [
      [0, 0, 0], [29, 43, 83], [126, 37, 83], [0, 135, 81],
      [171, 82, 54], [95, 87, 79], [194, 195, 199], [255, 241, 232],
      [255, 0, 77], [255, 163, 0], [255, 236, 39], [0, 228, 54],
      [41, 173, 255], [131, 118, 156], [255, 119, 168], [255, 204, 170]
    ],
    gameboy: [
      [15, 56, 15],
      [48, 98, 48],
      [139, 172, 15],
      [155, 188, 15]
    ],
    cyberpunk: [
      [13, 2, 33], [45, 12, 77], [107, 33, 168], [192, 38, 211],
      [236, 72, 153], [244, 63, 94], [6, 182, 212], [34, 211, 238],
      [14, 165, 233], [250, 204, 21], [254, 240, 138], [15, 23, 42]
    ],
    solar: [
      [20, 10, 8], [60, 20, 10], [120, 30, 15], [180, 50, 20],
      [225, 95, 25], [245, 150, 30], [255, 205, 50], [255, 245, 150],
      [255, 255, 230], [80, 40, 25], [140, 70, 35], [200, 110, 40]
    ],
    deepspace: [
      [3, 7, 18], [15, 23, 42], [30, 41, 59], [12, 74, 110],
      [2, 132, 199], [14, 165, 233], [56, 189, 248], [186, 230, 253],
      [6, 78, 59], [5, 150, 105], [52, 211, 153], [209, 250, 229]
    ],
    mono16: Array.from({ length: 16 }, (_, i) => {
      const v = Math.round((i / 15) * 255);
      return [v, v, v];
    })
  };

  // 4x4 Bayer Matrix for dithering
  const BAYER_4X4 = [
    [ 0 / 16 - 0.5,  8 / 16 - 0.5,  2 / 16 - 0.5, 10 / 16 - 0.5],
    [12 / 16 - 0.5,  4 / 16 - 0.5, 14 / 16 - 0.5,  6 / 16 - 0.5],
    [ 3 / 16 - 0.5, 11 / 16 - 0.5,  1 / 16 - 0.5,  9 / 16 - 0.5],
    [15 / 16 - 0.5,  7 / 16 - 0.5, 13 / 16 - 0.5,  5 / 16 - 0.5]
  ];

  const BAYER_2X2 = [
    [ 0 / 4 - 0.5,  2 / 4 - 0.5],
    [ 3 / 4 - 0.5,  1 / 4 - 0.5]
  ];

  // ==========================================================================
  // Application State
  // ==========================================================================
  const state = {
    sourceImage: null,
    sourceCanvas: document.getElementById('sourceCanvas'),
    sourceCtx: null,
    overlayCanvas: document.getElementById('overlayCanvas'),
    overlayCtx: null,
    previewCanvas: document.getElementById('previewCanvas'),
    previewCtx: null,

    // Selection properties
    selection: {
      x: 0,
      y: 0,
      width: 256 // Selection Width (diameter in source pixels)
    },

    // Output properties
    outputWidth: 64, // Output Width in pixels

    // Transformations
    scalingAlgo: 'nearest', // 'nearest' or 'bilinear'
    sphereWarp: {
      enabled: true,
      curvature: 1.0
    },
    lighting: {
      enabled: true,
      angleDeg: 315,
      darkness: 0.70,
      softness: 0.30
    },
    palette: 'original',
    dither: 'none',
    outline: {
      enabled: true,
      color: '#10131c'
    },

    // Viewport display
    zoom: 1.0,
    previewZoom: 4,
    previewBg: 'space',
    isDraggingSelection: false,
    hoverPos: null
  };

  state.sourceCtx = state.sourceCanvas.getContext('2d');
  state.overlayCtx = state.overlayCanvas.getContext('2d');
  state.previewCtx = state.previewCanvas.getContext('2d', { willReadFrequently: true });

  // DOM Elements
  const elements = {
    viewport: document.getElementById('viewport'),
    canvasWrapper: document.getElementById('canvasWrapper'),
    fileInput: document.getElementById('imageFileInput'),
    emptyState: document.getElementById('emptyState'),
    dropZone: document.getElementById('dropZone'),
    toast: document.getElementById('toast'),

    // Core Controls
    selectionWidthInput: document.getElementById('selectionWidthInput'),
    selectionWidthSlider: document.getElementById('selectionWidthSlider'),
    outputWidthInput: document.getElementById('outputWidthInput'),
    outputWidthSlider: document.getElementById('outputWidthSlider'),

    // Status bar info
    imageDimensionsInfo: document.getElementById('imageDimensionsInfo'),
    selectionCenterInfo: document.getElementById('selectionCenterInfo'),
    zoomLevelInfo: document.getElementById('zoomLevelInfo'),
    previewBadge: document.getElementById('previewBadge'),

    // Transformation controls
    sphereWarpToggle: document.getElementById('sphereWarpToggle'),
    sphereCurvatureSlider: document.getElementById('sphereCurvatureSlider'),
    sphereCurvatureVal: document.getElementById('sphereCurvatureVal'),

    lightingToggle: document.getElementById('lightingToggle'),
    lightAngleSlider: document.getElementById('lightAngleSlider'),
    lightAngleVal: document.getElementById('lightAngleVal'),
    shadowDarknessSlider: document.getElementById('shadowDarknessSlider'),
    shadowDarknessVal: document.getElementById('shadowDarknessVal'),
    shadowSoftnessSlider: document.getElementById('shadowSoftnessSlider'),
    shadowSoftnessVal: document.getElementById('shadowSoftnessVal'),

    paletteSelect: document.getElementById('paletteSelect'),
    ditherSelect: document.getElementById('ditherSelect'),

    outlineToggle: document.getElementById('outlineToggle'),
    outlineColorInput: document.getElementById('outlineColorInput'),

    // Buttons
    downloadBtn: document.getElementById('downloadBtn'),
    copyBtn: document.getElementById('copyBtn'),
    resetControlsBtn: document.getElementById('resetControlsBtn'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    zoomFitBtn: document.getElementById('zoomFitBtn'),
    previewBackdrop: document.getElementById('previewBackdrop')
  };

  // ==========================================================================
  // Image Loading & Initialization
  // ==========================================================================

  function loadSamplePreset(presetKey) {
    if (typeof SampleTextures === 'undefined' || !SampleTextures[presetKey]) return;
    const canvas = SampleTextures[presetKey](1024, 768);
    const img = new Image();
    img.onload = () => {
      setImage(img);
    };
    img.src = canvas.toDataURL();
  }

  function setImage(img) {
    state.sourceImage = img;
    state.sourceCanvas.width = img.naturalWidth || img.width;
    state.sourceCanvas.height = img.naturalHeight || img.height;
    state.overlayCanvas.width = state.sourceCanvas.width;
    state.overlayCanvas.height = state.sourceCanvas.height;

    // Draw source
    state.sourceCtx.clearRect(0, 0, state.sourceCanvas.width, state.sourceCanvas.height);
    state.sourceCtx.drawImage(img, 0, 0);

    // Initial selection in center
    state.selection.x = Math.floor(state.sourceCanvas.width / 2);
    state.selection.y = Math.floor(state.sourceCanvas.height / 2);

    // Dynamic max for selection width slider only
    const maxDimension = Math.min(state.sourceCanvas.width, state.sourceCanvas.height);
    elements.selectionWidthSlider.max = Math.max(1024, maxDimension);

    elements.emptyState.style.display = 'none';
    elements.imageDimensionsInfo.textContent = `${state.sourceCanvas.width} × ${state.sourceCanvas.height} px`;

    fitImageToViewport();
    drawOverlay();
    updatePlanetPreview();
  }

  function fitImageToViewport() {
    if (!state.sourceImage) return;
    const vpRect = elements.viewport.getBoundingClientRect();
    const availableW = vpRect.width - 40;
    const availableH = vpRect.height - 40;

    const scaleW = availableW / state.sourceCanvas.width;
    const scaleH = availableH / state.sourceCanvas.height;
    const fitScale = Math.min(scaleW, scaleH, 1.0);

    setZoom(fitScale);
  }

  function setZoom(val) {
    state.zoom = Math.max(0.1, Math.min(val, 5.0));
    elements.canvasWrapper.style.transform = `scale(${state.zoom})`;
    elements.zoomLevelInfo.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  // ==========================================================================
  // Selection Control (Core Control #1: Selection Width)
  // ==========================================================================

  function setSelectionWidth(newWidth, updateInput = true) {
    const width = Math.max(1, Math.round(newWidth));
    state.selection.width = width;
    if (updateInput) {
      elements.selectionWidthInput.value = width;
    }

    // Slider snaps to its min/max bounds without restricting typed values
    const sliderMin = parseInt(elements.selectionWidthSlider.min, 10) || 16;
    const sliderMax = parseInt(elements.selectionWidthSlider.max, 10) || 1024;
    elements.selectionWidthSlider.value = Math.max(sliderMin, Math.min(width, sliderMax));

    drawOverlay();
    updatePlanetPreview();
  }

  function setSelectionCenter(x, y) {
    // Clamp inside image bounds
    state.selection.x = Math.max(0, Math.min(Math.round(x), state.sourceCanvas.width));
    state.selection.y = Math.max(0, Math.min(Math.round(y), state.sourceCanvas.height));

    elements.selectionCenterInfo.textContent = `X: ${state.selection.x}, Y: ${state.selection.y}`;
    drawOverlay();
    updatePlanetPreview();
  }

  // Draw circular selector on overlay canvas
  function drawOverlay() {
    const ctx = state.overlayCtx;
    const w = state.overlayCanvas.width;
    const h = state.overlayCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!state.sourceImage) return;

    const { x, y, width } = state.selection;
    const radius = width / 2;

    // 1. Darken outer region slightly so the circular selection stands out
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 14, 0.45)';
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.arc(x, y, radius, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();

    // 2. Glowing circular border
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(2, Math.round(2 / state.zoom));
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Dashed inner ring
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = Math.max(1, Math.round(1 / state.zoom));
    ctx.setLineDash([6, 4]);
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Center crosshair
    const chSize = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - chSize, y);
    ctx.lineTo(x + chSize, y);
    ctx.moveTo(x, y - chSize);
    ctx.lineTo(x, y + chSize);
    ctx.stroke();

    // 4. Center small dot
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Dimension tag above circle
    const label = `Ø ${Math.round(width)} px`;
    ctx.font = '11px "JetBrains Mono", monospace';
    const textWidth = ctx.measureText(label).width;
    const tagX = x - textWidth / 2 - 8;
    const tagY = y - radius - 18;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, textWidth + 16, 20, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(label, tagX + 8, tagY + 14);

    ctx.restore();

    // 6. Hover ghost circle (if hovering away from current center)
    if (state.hoverPos && !state.isDraggingSelection) {
      const hx = state.hoverPos.x;
      const hy = state.hoverPos.y;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hx, hy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ==========================================================================
  // Output Width Control (Core Control #2)
  // ==========================================================================

  function setOutputWidth(newWidth, updateInput = true) {
    const w = Math.max(1, Math.round(newWidth));
    state.outputWidth = w;
    if (updateInput) {
      elements.outputWidthInput.value = w;
    }

    // Slider snaps to its min/max bounds without restricting typed values
    const sliderMin = parseInt(elements.outputWidthSlider.min, 10) || 16;
    const sliderMax = parseInt(elements.outputWidthSlider.max, 10) || 256;
    elements.outputWidthSlider.value = Math.max(sliderMin, Math.min(w, sliderMax));

    elements.previewBadge.textContent = `${w} × ${w} px`;

    // Highlight preset button if matches
    document.querySelectorAll('[data-output-size]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.outputSize) === w);
    });

    updatePreviewCanvasSize();
    updatePlanetPreview();
  }

  function updatePreviewCanvasSize() {
    state.previewCanvas.width = state.outputWidth;
    state.previewCanvas.height = state.outputWidth;
    applyPreviewDisplayScale();
  }

  function applyPreviewDisplayScale() {
    const displaySize = state.outputWidth * state.previewZoom;
    state.previewCanvas.style.width = `${displaySize}px`;
    state.previewCanvas.style.height = `${displaySize}px`;

    // If displaySize exceeds preview backdrop container (256px), fit inside neatly
    if (displaySize > 256) {
      state.previewCanvas.style.maxWidth = '100%';
      state.previewCanvas.style.maxHeight = '100%';
      state.previewCanvas.style.objectFit = 'contain';
    } else {
      state.previewCanvas.style.maxWidth = 'none';
      state.previewCanvas.style.maxHeight = 'none';
    }
  }

  // ==========================================================================
  // Helper Math & Color Functions
  // ==========================================================================

  function hexToRgb(hex) {
    const sanitized = hex.replace('#', '');
    const bigint = parseInt(sanitized, 16);
    return [
      (bigint >> 16) & 255,
      (bigint >> 8) & 255,
      bigint & 255
    ];
  }

  function findClosestPaletteColor(r, g, b, paletteName, ditherOffset = 0) {
    const palette = PALETTES[paletteName];
    if (!palette) return [r, g, b];

    // Apply dither offset
    const dr = Math.min(255, Math.max(0, r + ditherOffset * 48));
    const dg = Math.min(255, Math.max(0, g + ditherOffset * 48));
    const db = Math.min(255, Math.max(0, b + ditherOffset * 48));

    let bestDist = Infinity;
    let bestColor = palette[0];

    for (let i = 0; i < palette.length; i++) {
      const c = palette[i];
      // Weighted perceptual color distance
      const d = (c[0] - dr) * (c[0] - dr) * 0.299 +
                (c[1] - dg) * (c[1] - dg) * 0.587 +
                (c[2] - db) * (c[2] - db) * 0.114;
      if (d < bestDist) {
        bestDist = d;
        bestColor = c;
      }
    }
    return bestColor;
  }

  // ==========================================================================
  // Planet Generator & Transformation Pipeline
  // ==========================================================================

  function updatePlanetPreview() {
    if (!state.sourceImage) return;

    const outW = state.outputWidth;
    const outH = state.outputWidth;
    const ctx = state.previewCtx;

    // Target image data
    const outputImgData = ctx.createImageData(outW, outH);
    const outPixels = outputImgData.data;

    // Source context pixel data for sampling
    const srcW = state.sourceCanvas.width;
    const srcH = state.sourceCanvas.height;
    const srcPixels = state.sourceCtx.getImageData(0, 0, srcW, srcH).data;

    const selCenterX = state.selection.x;
    const selCenterY = state.selection.y;
    const selRadius = state.selection.width / 2;

    const outRadius = outW / 2;
    const outCenterX = outRadius;
    const outCenterY = outRadius;

    // Transformation parameters
    const useNearest = state.scalingAlgo === 'nearest';
    const useSphere = state.sphereWarp.enabled;
    const curvature = state.sphereWarp.curvature;

    const useLighting = state.lighting.enabled;
    const lightAngleRad = (state.lighting.angleDeg * Math.PI) / 180;
    const lightDirX = Math.cos(lightAngleRad);
    const lightDirY = Math.sin(lightAngleRad);
    const lightDirZ = 0.45;
    const lightLen = Math.sqrt(lightDirX * lightDirX + lightDirY * lightDirY + lightDirZ * lightDirZ);
    const lX = lightDirX / lightLen;
    const lY = lightDirY / lightLen;
    const lZ = lightDirZ / lightLen;
    const shadowDarkness = state.lighting.darkness;
    const shadowSoftness = Math.max(0.01, state.lighting.softness);

    const useOutline = state.outline.enabled;
    const outlineColor = hexToRgb(state.outline.color);

    const paletteName = state.palette;
    const ditherMode = state.dither;

    // Sample function: nearest or bilinear from source
    function sampleSource(px, py) {
      if (useNearest) {
        const sx = Math.floor(Math.max(0, Math.min(px, srcW - 1)));
        const sy = Math.floor(Math.max(0, Math.min(py, srcH - 1)));
        const idx = (sy * srcW + sx) * 4;
        return [srcPixels[idx], srcPixels[idx + 1], srcPixels[idx + 2], srcPixels[idx + 3]];
      } else {
        // Bilinear interpolation
        const x0 = Math.max(0, Math.min(Math.floor(px), srcW - 1));
        const y0 = Math.max(0, Math.min(Math.floor(py), srcH - 1));
        const x1 = Math.min(x0 + 1, srcW - 1);
        const y1 = Math.min(y0 + 1, srcH - 1);
        const fx = px - x0;
        const fy = py - y0;

        const idx00 = (y0 * srcW + x0) * 4;
        const idx10 = (y0 * srcW + x1) * 4;
        const idx01 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;

        const r = (1 - fx) * (1 - fy) * srcPixels[idx00] + fx * (1 - fy) * srcPixels[idx10] +
                  (1 - fx) * fy * srcPixels[idx01] + fx * fy * srcPixels[idx11];
        const g = (1 - fx) * (1 - fy) * srcPixels[idx00 + 1] + fx * (1 - fy) * srcPixels[idx10 + 1] +
                  (1 - fx) * fy * srcPixels[idx01 + 1] + fx * fy * srcPixels[idx11 + 1];
        const b = (1 - fx) * (1 - fy) * srcPixels[idx00 + 2] + fx * (1 - fy) * srcPixels[idx10 + 2] +
                  (1 - fx) * fy * srcPixels[idx01 + 2] + fx * fy * srcPixels[idx11 + 2];
        const a = (1 - fx) * (1 - fy) * srcPixels[idx00 + 3] + fx * (1 - fy) * srcPixels[idx10 + 3] +
                  (1 - fx) * fy * srcPixels[idx01 + 3] + fx * fy * srcPixels[idx11 + 3];

        return [r, g, b, a];
      }
    }

    // Main pixel rendering loop
    for (let py = 0; py < outH; py++) {
      for (let px = 0; px < outW; px++) {
        const outIdx = (py * outW + px) * 4;

        // Normalized coordinate relative to planet center: -1.0 to 1.0
        const u = (px + 0.5 - outCenterX) / outRadius;
        const v = (py + 0.5 - outCenterY) / outRadius;
        const distSq = u * u + v * v;
        const dist = Math.sqrt(distSq);

        // If outside the planet circle -> transparent
        if (dist > 1.0) {
          outPixels[outIdx] = 0;
          outPixels[outIdx + 1] = 0;
          outPixels[outIdx + 2] = 0;
          outPixels[outIdx + 3] = 0;
          continue;
        }

        // --- Inside the planet circle ---

        // 1. Check if pixel outline is active and at boundary
        const pixelRadiusThickness = 1.25 / outRadius;
        const isBorder = useOutline && (dist > 1.0 - pixelRadiusThickness);

        if (isBorder) {
          let r = outlineColor[0];
          let g = outlineColor[1];
          let b = outlineColor[2];
          if (paletteName !== 'original') {
            [r, g, b] = findClosestPaletteColor(r, g, b, paletteName, 0);
          }
          outPixels[outIdx] = r;
          outPixels[outIdx + 1] = g;
          outPixels[outIdx + 2] = b;
          outPixels[outIdx + 3] = 255;
          continue;
        }

        // 2. Map coordinates: flat vs 3D spherical warp
        let sampleOffsetX, sampleOffsetY;
        let nz = 1.0;

        if (useSphere) {
          // 3D Unit sphere z coordinate
          nz = Math.sqrt(Math.max(0, 1.0 - distSq));

          // Spherical arc warp
          const sphereDist = Math.asin(Math.min(1.0, dist)) / (Math.PI / 2);
          const warpFactor = curvature * sphereDist + (1.0 - curvature) * dist;
          const scale = dist > 0.0001 ? warpFactor / dist : 1.0;

          sampleOffsetX = u * scale * selRadius;
          sampleOffsetY = v * scale * selRadius;
        } else {
          // Flat direct crop
          sampleOffsetX = u * selRadius;
          sampleOffsetY = v * selRadius;
        }

        // Source pixel coordinates
        const srcX = selCenterX + sampleOffsetX;
        const srcY = selCenterY + sampleOffsetY;

        // Sample color
        let [r, g, b, a] = sampleSource(srcX, srcY);

        // 3. Apply Sunlight & Shadow (Terminator)
        if (useLighting) {
          // Surface normal on sphere
          const nx = u;
          const ny = v;
          const normalZ = useSphere ? nz : Math.sqrt(Math.max(0, 1.0 - distSq));

          // Diffuse dot product: N · L
          const dot = nx * lX + ny * lY + normalZ * lZ;

          // Stepped / smoothed terminator lighting
          // Softness controls how gradual or crisp the light/dark transition is
          const minAmbient = 1.0 - shadowDarkness;
          const lightFactor = Math.max(0, Math.min(1.0, (dot + shadowSoftness) / (shadowSoftness * 2)));
          const finalLight = minAmbient + (1.0 - minAmbient) * lightFactor;

          r *= finalLight;
          g *= finalLight;
          b *= finalLight;
        }

        // 4. Dithering offset
        let ditherVal = 0;
        if (ditherMode === 'bayer4') {
          ditherVal = BAYER_4X4[py % 4][px % 4];
        } else if (ditherMode === 'bayer2') {
          ditherVal = BAYER_2X2[py % 2][px % 2];
        }

        // 7. Color Palette Quantization
        if (paletteName !== 'original') {
          [r, g, b] = findClosestPaletteColor(r, g, b, paletteName, ditherVal);
        } else if (ditherMode !== 'none') {
          // Subtle dithering even in full color
          r = Math.min(255, Math.max(0, r + ditherVal * 20));
          g = Math.min(255, Math.max(0, g + ditherVal * 20));
          b = Math.min(255, Math.max(0, b + ditherVal * 20));
        }

        outPixels[outIdx] = Math.round(r);
        outPixels[outIdx + 1] = Math.round(g);
        outPixels[outIdx + 2] = Math.round(b);
        outPixels[outIdx + 3] = a > 0 ? 255 : 0;
      }
    }

    ctx.putImageData(outputImgData, 0, 0);
  }

  // ==========================================================================
  // Event Listeners & Interaction Handling
  // ==========================================================================

  // Map mouse/pointer event in viewport to source image coordinates
  function getSourceCoordinatesFromEvent(e) {
    const rect = state.sourceCanvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const displayX = clientX - rect.left;
    const displayY = clientY - rect.top;

    const imgX = (displayX / rect.width) * state.sourceCanvas.width;
    const imgY = (displayY / rect.height) * state.sourceCanvas.height;

    return { x: imgX, y: imgY };
  }

  // Viewport interactions (click to place, drag to move)
  function initViewportInteractions() {
    const viewport = elements.viewport;

    viewport.addEventListener('mousedown', (e) => {
      if (!state.sourceImage) return;
      if (e.button !== 0) return; // Left click only

      const coords = getSourceCoordinatesFromEvent(e);
      if (coords.x >= 0 && coords.x <= state.sourceCanvas.width &&
          coords.y >= 0 && coords.y <= state.sourceCanvas.height) {
        state.isDraggingSelection = true;
        setSelectionCenter(coords.x, coords.y);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.sourceImage) return;

      const coords = getSourceCoordinatesFromEvent(e);
      const isInside = coords.x >= 0 && coords.x <= state.sourceCanvas.width &&
                       coords.y >= 0 && coords.y <= state.sourceCanvas.height;

      if (isInside) {
        state.hoverPos = coords;
      } else {
        state.hoverPos = null;
      }

      if (state.isDraggingSelection) {
        setSelectionCenter(coords.x, coords.y);
      } else {
        drawOverlay();
      }
    });

    window.addEventListener('mouseup', () => {
      if (state.isDraggingSelection) {
        state.isDraggingSelection = false;
        drawOverlay();
      }
    });

    // Touch support for mobile/tablets
    viewport.addEventListener('touchstart', (e) => {
      if (!state.sourceImage || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const coords = getSourceCoordinatesFromEvent(touch);
      if (coords.x >= 0 && coords.x <= state.sourceCanvas.width &&
          coords.y >= 0 && coords.y <= state.sourceCanvas.height) {
        state.isDraggingSelection = true;
        setSelectionCenter(coords.x, coords.y);
        e.preventDefault();
      }
    }, { passive: false });

    viewport.addEventListener('touchmove', (e) => {
      if (!state.isDraggingSelection || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const coords = getSourceCoordinatesFromEvent(touch);
      setSelectionCenter(coords.x, coords.y);
      e.preventDefault();
    }, { passive: false });

    viewport.addEventListener('touchend', () => {
      state.isDraggingSelection = false;
    });

    // Mouse wheel zoom
    viewport.addEventListener('wheel', (e) => {
      if (!state.sourceImage) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(state.zoom + delta);
    }, { passive: false });
  }

  // Core Controls Listeners
  function initControls() {
    // Selection Width (Input & Slider)
    elements.selectionWidthInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        setSelectionWidth(val, false);
      }
    });

    elements.selectionWidthInput.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        setSelectionWidth(val, true);
      } else {
        setSelectionWidth(state.selection.width, true);
      }
    });

    elements.selectionWidthSlider.addEventListener('input', (e) => {
      setSelectionWidth(parseInt(e.target.value, 10), true);
    });

    // Output Width (Input & Slider & Presets)
    elements.outputWidthInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        setOutputWidth(val, false);
      }
    });

    elements.outputWidthInput.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        setOutputWidth(val, true);
      } else {
        setOutputWidth(state.outputWidth, true);
      }
    });

    elements.outputWidthSlider.addEventListener('input', (e) => {
      setOutputWidth(parseInt(e.target.value, 10), true);
    });

    document.querySelectorAll('[data-output-size]').forEach(btn => {
      btn.addEventListener('click', () => {
        setOutputWidth(parseInt(btn.dataset.outputSize, 10));
      });
    });

    // Scaling Algorithm
    document.querySelectorAll('input[name="scalingAlgo"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        state.scalingAlgo = e.target.value;
        updatePlanetPreview();
      });
    });

    // 3D Spherical Warp
    elements.sphereWarpToggle.addEventListener('change', (e) => {
      state.sphereWarp.enabled = e.target.checked;
      updatePlanetPreview();
    });

    elements.sphereCurvatureSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.sphereWarp.curvature = val / 100;
      elements.sphereCurvatureVal.textContent = `${val}%`;
      updatePlanetPreview();
    });

    // Lighting & Shading
    elements.lightingToggle.addEventListener('change', (e) => {
      state.lighting.enabled = e.target.checked;
      updatePlanetPreview();
    });

    elements.lightAngleSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.lighting.angleDeg = val;
      elements.lightAngleVal.textContent = `${val}°`;
      updatePlanetPreview();
    });

    elements.shadowDarknessSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.lighting.darkness = val / 100;
      elements.shadowDarknessVal.textContent = `${val}%`;
      updatePlanetPreview();
    });

    elements.shadowSoftnessSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.lighting.softness = val / 100;
      elements.shadowSoftnessVal.textContent = `${val}%`;
      updatePlanetPreview();
    });

    // Palette & Dither
    elements.paletteSelect.addEventListener('change', (e) => {
      state.palette = e.target.value;
      updatePlanetPreview();
    });

    elements.ditherSelect.addEventListener('change', (e) => {
      state.dither = e.target.value;
      updatePlanetPreview();
    });

    // Outline
    elements.outlineToggle.addEventListener('change', (e) => {
      state.outline.enabled = e.target.checked;
      updatePlanetPreview();
    });

    elements.outlineColorInput.addEventListener('input', (e) => {
      state.outline.color = e.target.value;
      updatePlanetPreview();
    });

    // Zoom buttons
    elements.zoomInBtn.addEventListener('click', () => setZoom(state.zoom + 0.15));
    elements.zoomOutBtn.addEventListener('click', () => setZoom(state.zoom - 0.15));
    elements.zoomFitBtn.addEventListener('click', () => fitImageToViewport());

    // Preview zoom chip buttons
    document.querySelectorAll('[data-preview-zoom]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-preview-zoom]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.previewZoom = parseInt(btn.dataset.previewZoom, 10);
        applyPreviewDisplayScale();
      });
    });

    // Preview background chip buttons
    document.querySelectorAll('[data-bg]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-bg]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const bg = btn.dataset.bg;
        elements.previewBackdrop.className = `preview-canvas-backdrop bg-${bg}`;
      });
    });

    // Reset controls button
    elements.resetControlsBtn.addEventListener('click', () => {
      setSelectionWidth(256);
      setOutputWidth(64);
      document.querySelector('input[name="scalingAlgo"][value="nearest"]').checked = true;
      state.scalingAlgo = 'nearest';

      elements.sphereWarpToggle.checked = true;
      state.sphereWarp.enabled = true;
      elements.sphereCurvatureSlider.value = 100;
      state.sphereWarp.curvature = 1.0;
      elements.sphereCurvatureVal.textContent = '100%';

      elements.lightingToggle.checked = true;
      state.lighting.enabled = true;
      elements.lightAngleSlider.value = 315;
      state.lighting.angleDeg = 315;
      elements.lightAngleVal.textContent = '315°';
      elements.shadowDarknessSlider.value = 70;
      state.lighting.darkness = 0.70;
      elements.shadowDarknessVal.textContent = '70%';
      elements.shadowSoftnessSlider.value = 30;
      state.lighting.softness = 0.30;
      elements.shadowSoftnessVal.textContent = '30%';

      elements.paletteSelect.value = 'original';
      state.palette = 'original';
      elements.ditherSelect.value = 'none';
      state.dither = 'none';

      elements.outlineToggle.checked = true;
      state.outline.enabled = true;
      elements.outlineColorInput.value = '#10131c';
      state.outline.color = '#10131c';

      updatePlanetPreview();
    });
  }

  // File Upload & Preset Listeners
  function initFileHandling() {
    // Preset buttons
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadSamplePreset(btn.dataset.preset);
      });
    });

    // File input
    elements.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      loadFromFile(file);
    });

    // Drag and Drop
    const dropZone = elements.dropZone;
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        loadFromFile(file);
      }
    });

    // Paste from clipboard (Ctrl+V / Cmd+V)
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            loadFromFile(file);
            break;
          }
        }
      }
    });
  }

  function loadFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
        setImage(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Export Actions: Download PNG & Copy to Clipboard
  function initExportActions() {
    function showToast(msg) {
      elements.toast.textContent = msg;
      elements.toast.style.display = 'block';
      setTimeout(() => {
        elements.toast.style.display = 'none';
      }, 2500);
    }

    elements.downloadBtn.addEventListener('click', () => {
      if (!state.previewCanvas) return;
      const link = document.createElement('a');
      link.download = `pixel-planet-${state.outputWidth}x${state.outputWidth}.png`;
      link.href = state.previewCanvas.toDataURL('image/png');
      link.click();
      showToast(`Exported ${state.outputWidth}×${state.outputWidth} PNG!`);
    });

    elements.copyBtn.addEventListener('click', () => {
      if (!state.previewCanvas) return;
      state.previewCanvas.toBlob((blob) => {
        if (!blob) return;
        if (navigator.clipboard && navigator.clipboard.write) {
          navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]).then(() => {
            showToast('Planet copied to clipboard!');
          }).catch(() => {
            // Fallback: download
            elements.downloadBtn.click();
          });
        } else {
          elements.downloadBtn.click();
        }
      });
    });
  }

  // Window resize handler
  function initResizeHandler() {
    window.addEventListener('resize', () => {
      if (state.sourceImage) {
        fitImageToViewport();
      }
    });
  }

  // ==========================================================================
  // Application Startup
  // ==========================================================================
  function init() {
    initControls();
    initViewportInteractions();
    initFileHandling();
    initExportActions();
    initResizeHandler();

    updatePreviewCanvasSize();

    // Load initial Jupiter sample preset
    loadSamplePreset('jupiter');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
