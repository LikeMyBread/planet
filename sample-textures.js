/**
 * Procedural sample texture generator for Pixel Planet Creator.
 * Generates beautiful cosmic textures without any external network dependencies.
 */

const SampleTextures = (() => {
  // Simple deterministic simplex-like pseudo random noise generator
  function createNoiseGenerator(seed = 12345) {
    let s = seed;
    function random() {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    }

    const perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const r = Math.floor(random() * (i + 1));
      const tmp = p[i];
      p[i] = p[r];
      p[r] = tmp;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(t, a, b) { return a + t * (b - a); }
    function grad(hash, x, y) {
      const h = hash & 7;
      const u = h < 4 ? x : y;
      const v = h < 4 ? y : x;
      return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
    }

    function noise2D(x, y) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      const u = fade(xf);
      const v = fade(yf);

      const a = perm[X] + Y;
      const b = perm[X + 1] + Y;

      return lerp(v,
        lerp(u, grad(perm[a], xf, yf), grad(perm[b], xf - 1, yf)),
        lerp(u, grad(perm[a + 1], xf, yf - 1), grad(perm[b + 1], xf - 1, yf - 1))
      );
    }

    function fbm(x, y, octaves = 5, lacunarity = 2.0, gain = 0.5) {
      let total = 0;
      let frequency = 1;
      let amplitude = 1;
      let maxValue = 0;
      for (let i = 0; i < octaves; i++) {
        total += noise2D(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
      }
      return total / maxValue;
    }

    return { noise2D, fbm };
  }

  // Generate Jupiter-like gas giant texture
  function generateJupiter(width = 1024, height = 768) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const noise = createNoiseGenerator(42);

    for (let y = 0; y < height; y++) {
      const ny = y / height;
      for (let x = 0; x < width; x++) {
        const nx = x / width;

        // Banding with turbulent distortion
        const distortion = noise.fbm(nx * 4, ny * 2, 4) * 0.15;
        const turbulentY = ny * 18 + distortion * 25;
        const bandVal = (Math.sin(turbulentY) + 1) * 0.5;
        const fineNoise = (noise.fbm(nx * 8 + distortion * 2, ny * 8, 4) + 1) * 0.5;

        // Swirl / Great Red Spot in bottom right
        const spotX = 0.65;
        const spotY = 0.62;
        const dx = (nx - spotX) * 2.2;
        const dy = (ny - spotY) * 4.0;
        const spotDist = Math.sqrt(dx * dx + dy * dy);
        const inSpot = Math.max(0, 1 - spotDist / 0.18);

        // Color ramp
        let r, g, b;
        if (bandVal > 0.6) {
          // Warm ochre / sandy bands
          r = 215 + fineNoise * 40;
          g = 175 + fineNoise * 30;
          b = 130 + fineNoise * 20;
        } else if (bandVal > 0.3) {
          // Brownish rust bands
          r = 180 + fineNoise * 50;
          g = 115 + fineNoise * 40;
          b = 75 + fineNoise * 30;
        } else {
          // Deep red-brown stripes
          r = 140 + fineNoise * 40;
          g = 70 + fineNoise * 30;
          b = 45 + fineNoise * 20;
        }

        // Great Red Spot overlay
        if (inSpot > 0) {
          const spotStrength = Math.pow(inSpot, 1.5);
          r = r * (1 - spotStrength) + (220 + fineNoise * 35) * spotStrength;
          g = g * (1 - spotStrength) + (70 + fineNoise * 30) * spotStrength;
          b = b * (1 - spotStrength) + (50 + fineNoise * 20) * spotStrength;
        }

        const idx = (y * width + x) * 4;
        data[idx] = Math.min(255, Math.max(0, r));
        data[idx + 1] = Math.min(255, Math.max(0, g));
        data[idx + 2] = Math.min(255, Math.max(0, b));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // Generate Terran (Earth-like) texture
  function generateEarth(width = 1024, height = 768) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const noise = createNoiseGenerator(999);
    const cloudNoise = createNoiseGenerator(555);

    for (let y = 0; y < height; y++) {
      const ny = y / height;
      const isPolar = Math.abs(ny - 0.5) > 0.42;

      for (let x = 0; x < width; x++) {
        const nx = x / width;

        const elevation = (noise.fbm(nx * 3.5, ny * 3.5, 6, 2.0, 0.52) + 1) * 0.5;
        const moisture = (noise.fbm(nx * 4 + 10, ny * 4 + 10, 4) + 1) * 0.5;
        const clouds = (cloudNoise.fbm(nx * 5 + 5, ny * 5 + 5, 4) + 1) * 0.5;

        let r, g, b;

        if (isPolar && elevation > 0.35) {
          // Polar ice sheet
          r = 230 + elevation * 25;
          g = 240 + elevation * 15;
          b = 250;
        } else if (elevation < 0.44) {
          // Deep ocean
          r = 15;
          g = 45 + elevation * 50;
          b = 130 + elevation * 80;
        } else if (elevation < 0.49) {
          // Shallow coastal waters
          r = 30 + (elevation - 0.44) * 120;
          g = 120 + (elevation - 0.44) * 160;
          b = 180 + (elevation - 0.44) * 80;
        } else if (elevation < 0.52) {
          // Sandy beach / coastline
          r = 210;
          g = 195;
          b = 140;
        } else if (elevation < 0.72) {
          // Plains, forests & savannas
          if (moisture > 0.5) {
            // Lush forest
            r = 35 + moisture * 30;
            g = 110 + moisture * 40;
            b = 40 + moisture * 20;
          } else {
            // Grassland / savanna
            r = 110 + moisture * 40;
            g = 145 + moisture * 30;
            b = 60 + moisture * 20;
          }
        } else if (elevation < 0.84) {
          // Mountain rocks
          r = 120;
          g = 105;
          b = 90;
        } else {
          // Snow capped peaks
          r = 240;
          g = 245;
          b = 255;
        }

        // Swirling white clouds
        if (clouds > 0.62) {
          const cloudAlpha = Math.min(1.0, (clouds - 0.62) * 3.5);
          r = r * (1 - cloudAlpha) + 245 * cloudAlpha;
          g = g * (1 - cloudAlpha) + 248 * cloudAlpha;
          b = b * (1 - cloudAlpha) + 255 * cloudAlpha;
        }

        const idx = (y * width + x) * 4;
        data[idx] = Math.min(255, Math.max(0, r));
        data[idx + 1] = Math.min(255, Math.max(0, g));
        data[idx + 2] = Math.min(255, Math.max(0, b));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // Generate Volcanic / Magma texture
  function generateMagma(width = 1024, height = 768) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const noise = createNoiseGenerator(777);

    for (let y = 0; y < height; y++) {
      const ny = y / height;
      for (let x = 0; x < width; x++) {
        const nx = x / width;

        // Voronoi-like / ridged noise for cracked tectonic crust
        const n1 = Math.abs(noise.noise2D(nx * 6, ny * 6));
        const n2 = Math.abs(noise.noise2D(nx * 12 + 5, ny * 12 + 5)) * 0.5;
        const crack = Math.pow(Math.min(1.0, n1 + n2), 2.2);

        let r, g, b;
        if (crack < 0.15) {
          // Blazing lava core (white/yellow-hot)
          const heat = 1 - crack / 0.15;
          r = 255;
          g = 220 * heat + 100 * (1 - heat);
          b = 120 * heat;
        } else if (crack < 0.35) {
          // Molten orange/red magma
          const t = (crack - 0.15) / 0.2;
          r = 255 * (1 - t * 0.4);
          g = 100 * (1 - t * 0.8);
          b = 15;
        } else {
          // Cooled dark basalt & obsidian crust
          const t = (crack - 0.35) / 0.65;
          const rockNoise = noise.fbm(nx * 16, ny * 16, 3) * 20;
          r = 35 + rockNoise;
          g = 28 + rockNoise;
          b = 32 + rockNoise;
        }

        const idx = (y * width + x) * 4;
        data[idx] = Math.min(255, Math.max(0, r));
        data[idx + 1] = Math.min(255, Math.max(0, g));
        data[idx + 2] = Math.min(255, Math.max(0, b));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // Generate Glacial / Ice texture
  function generateIce(width = 1024, height = 768) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const noise = createNoiseGenerator(333);

    for (let y = 0; y < height; y++) {
      const ny = y / height;
      for (let x = 0; x < width; x++) {
        const nx = x / width;

        const base = (noise.fbm(nx * 4, ny * 4, 5) + 1) * 0.5;
        const crevasse = Math.abs(noise.fbm(nx * 10, ny * 10, 4));

        let r, g, b;
        if (crevasse < 0.08) {
          // Deep abyssal ice crevasse (deep cobalt blue)
          r = 10;
          g = 60;
          b = 140;
        } else {
          // Crystalline cyan and pure snow frost
          r = 140 + base * 100;
          g = 210 + base * 45;
          b = 240 + base * 15;
        }

        const idx = (y * width + x) * 4;
        data[idx] = Math.min(255, Math.max(0, r));
        data[idx + 1] = Math.min(255, Math.max(0, g));
        data[idx + 2] = Math.min(255, Math.max(0, b));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // Generate Alien Nebula texture
  function generateNebula(width = 1024, height = 768) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const noise = createNoiseGenerator(888);

    for (let y = 0; y < height; y++) {
      const ny = y / height;
      for (let x = 0; x < width; x++) {
        const nx = x / width;

        const gas1 = (noise.fbm(nx * 3, ny * 3, 5) + 1) * 0.5;
        const gas2 = (noise.fbm(nx * 5 + 4, ny * 5 + 4, 4) + 1) * 0.5;

        // Deep cosmic purples, electric magentas, and bioluminescent cyans
        const r = Math.min(255, gas1 * 220 + gas2 * 60);
        const g = Math.min(255, gas2 * 110 + (1 - gas1) * 70);
        const b = Math.min(255, (1 - gas2) * 200 + gas1 * 120);

        const idx = (y * width + x) * 4;
        data[idx] = Math.min(255, Math.max(0, r));
        data[idx + 1] = Math.min(255, Math.max(0, g));
        data[idx + 2] = Math.min(255, Math.max(0, b));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  return {
    jupiter: generateJupiter,
    earth: generateEarth,
    magma: generateMagma,
    ice: generateIce,
    nebula: generateNebula,
  };
})();
