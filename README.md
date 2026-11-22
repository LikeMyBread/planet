# 🪐 Pixel Planet Creator

A web application that turns uploaded images into retro pixel art planets.

## Features

- **Uploaded Image Viewport (Main Area)**:
  - Supports uploading images (PNG, JPG, WEBP, SVG) via file browser, drag-and-drop, or clipboard paste (`Ctrl+V` / `Cmd+V`).
  - Includes 5 procedural sample textures (Gas Giant, Terran, Volcanic, Glacial, Alien Nebula) ready to use immediately.
  - Interactive circular selector overlay with diameter badge and center crosshairs.
  - Click or drag anywhere on the source image to place and move the selection circle.
  - Viewport zoom controls (Zoom In, Zoom Out, Fit to Screen, Mouse Wheel zoom).

- **Upper-Right Preview Box**:
  - Real-time rendering of the generated pixel art planet.
  - Native pixelated rendering (`image-rendering: pixelated`) with selectable zoom levels (1×, 2×, 4×, 6×).
  - Background view toggle (Deep Space with stars, Transparent Checkerboard, Black, White).
  - One-click **Export PNG** and **Copy to Clipboard**.

- **Transformation Controls (Below Preview Box)**:
  1. **Selection Width**: Defines the circular selector diameter in source image pixels.
  2. **Output Width**: Defines the target pixel art width/height (with quick presets for 24, 32, 64, 96, 128 px).
  3. **Scaling Algorithm**: Nearest Neighbor (crisp retro pixel art) or Bilinear (smooth downsampling).
  4. **3D Spherical Warp**: Maps flat textures onto a 3D unit sphere with adjustable curvature bulge.
  5. **Sunlight & Planetary Shadow**: Configurable light angle (0°–360°), shadow darkness, and terminator softness.
  6. **Flatten Colors (Adaptive Image Quantization)**: Flattens the image colors down to a custom number of colors (selected via slider or numeric input) derived directly from the image's own colors using Median Cut clustering. Includes live color swatches.
  7. **Retro Color Palettes**: Full Color, Generic (32, 64, 128 colors), PICO-8 (16 colors), Game Boy (4 greens), Cyberpunk Neon, Solar Flare, Deep Space, and 16-shade Monochrome.
  8. **Pixel Dithering**: Bayer 2×2 and Bayer 4×4 ordered dithering.
  9. **Pixel Outline**: Crisp contour border around the planet.

## How to Run

You can open `index.html` directly in any modern web browser or serve it using any local static server:

```bash
# Node
node server.js

# Or Python 3
python3 -m http.server 8088
```

Then visit `http://localhost:8088` in your browser.
