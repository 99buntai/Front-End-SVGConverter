/**
 * Batch Processor for Image to SVG conversion.
 * Processes multiple images sequentially using the same pipeline as the
 * single-image converter, packages results as a ZIP download via JSZip.
 */

(function () {
  'use strict';

  // --- Shared image processing (same algorithms as potrace-demo.js) ---

  function applyImageAdjustments(data, brightness, contrast, brilliance, shadows) {
    const contrastFactor = (100 + contrast) / 100;
    const brillianceFactor = brilliance / 100;
    const shadowsFactor = shadows / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];
      const alpha = data[i + 3];

      if (alpha < 255) {
        const af = alpha / 255;
        r = Math.round(r * af + 255 * (1 - af));
        g = Math.round(g * af + 255 * (1 - af));
        b = Math.round(b * af + 255 * (1 - af));
        data[i + 3] = 255;
      }

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      if (shadows !== 0) {
        const adj = shadowsFactor * Math.max(0, 1 - lum * 2.5) * 50;
        r += adj; g += adj; b += adj;
      }
      if (brilliance !== 0) {
        const adj = brillianceFactor * (1 - Math.abs(lum - 0.5) * 2) * 50;
        r += adj; g += adj; b += adj;
      }

      r += brightness * 2.55; g += brightness * 2.55; b += brightness * 2.55;
      r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
      g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
      b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;

      data[i] = Math.min(255, Math.max(0, Math.round(r)));
      data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
      data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
    }
  }

  function invertImageData(data) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
  }

  function enhanceEdges(data, width, height, sensitivity) {
    const output = new Uint8ClampedArray(data);
    const factor = Math.min(1.8, Math.max(1.0, sensitivity));
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const ci = (y * width + x) * 4;
        let rS = 0, gS = 0, bS = 0, cnt = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            rS += data[idx]; gS += data[idx + 1]; bS += data[idx + 2]; cnt++;
          }
        }
        output[ci] = Math.min(255, Math.max(0, data[ci] + factor * (data[ci] - rS / cnt)));
        output[ci + 1] = Math.min(255, Math.max(0, data[ci + 1] + factor * (data[ci + 1] - gS / cnt)));
        output[ci + 2] = Math.min(255, Math.max(0, data[ci + 2] + factor * (data[ci + 2] - bS / cnt)));
        output[ci + 3] = data[ci + 3];
      }
    }
    return output;
  }

  function applyBlur(pixels, width, height, radius) {
    if (radius <= 0.5) return;
    const temp = new Uint8ClampedArray(pixels);
    const ir = Math.floor(radius);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, c = 0;
        for (let i = -ir; i <= ir; i++) {
          const nx = Math.min(Math.max(x + i, 0), width - 1);
          const idx = (y * width + nx) * 4;
          r += temp[idx]; g += temp[idx + 1]; b += temp[idx + 2]; c++;
        }
        const oi = (y * width + x) * 4;
        pixels[oi] = Math.round(r / c); pixels[oi + 1] = Math.round(g / c); pixels[oi + 2] = Math.round(b / c);
      }
    }
    for (let i = 0; i < pixels.length; i++) temp[i] = pixels[i];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, c = 0;
        for (let j = -ir; j <= ir; j++) {
          const ny = Math.min(Math.max(y + j, 0), height - 1);
          const idx = (ny * width + x) * 4;
          r += temp[idx]; g += temp[idx + 1]; b += temp[idx + 2]; c++;
        }
        const oi = (y * width + x) * 4;
        pixels[oi] = Math.round(r / c); pixels[oi + 1] = Math.round(g / c); pixels[oi + 2] = Math.round(b / c);
      }
    }
  }

  function applyThreshold(data, width, height, threshold, invertColors) {
    const out = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const isBlack = gray < threshold;
      const val = (invertColors ? !isBlack : isBlack) ? 0 : 255;
      out[i] = val; out[i + 1] = val; out[i + 2] = val; out[i + 3] = 255;
    }
    return out;
  }

  function optimizeSvgString(svg) {
    return svg
      .replace(/<\?xml[^>]*>\s*/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+version="[^"]*"/g, '')
      .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
      .replace(/<desc[^>]*>[\s\S]*?<\/desc>/gi, '')
      .replace(/<metadata[^>]*>[\s\S]*?<\/metadata>/gi, '')
      .replace(/(\d+\.\d{3,})/g, m => parseFloat(m).toFixed(2))
      .replace(/(\d+)\.0(?=\s|"|'|,)/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/<g>\s*<\/g>/g, '');
  }

  // --- Single-image conversion using global Potrace ---

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image: ' + file.name));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file: ' + file.name));
      reader.readAsDataURL(file);
    });
  }

  function prepareCanvas(img, params) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;

    if (params.brightness !== 0 || params.contrast !== 0 || params.brilliance !== 0 || params.shadows !== 0) {
      applyImageAdjustments(d, params.brightness, params.contrast, params.brilliance, params.shadows);
    }
    if (params.invertSource) invertImageData(d);
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  /**
   * NYCES preprocessCanvas pipeline for silhouette (exact copy).
   * For lineart mode, uses the standalone edge-enhance/blur/threshold pipeline.
   */
  function traceWithPotrace(canvas, img, params, mode) {
    const pc = document.createElement('canvas');
    const pctx = pc.getContext('2d', { willReadFrequently: true });
    pc.width = canvas.width;
    pc.height = canvas.height;

    if (mode === 'silhouette') {
      // --- NYCES preprocessCanvas (exact copy) ---
      // Start from the raw image, not the pre-adjusted canvas
      pctx.drawImage(img, 0, 0, pc.width, pc.height);
      const imageData = pctx.getImageData(0, 0, pc.width, pc.height);
      const data = imageData.data;

      const brightnessFactor = 1 + params.brightness / 100;
      const contrastFactor = (100 + params.contrast) / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];
        const alpha = data[i + 3];

        if (alpha < 255) {
          const af = alpha / 255;
          r = Math.round(r * af + 255 * (1 - af));
          g = Math.round(g * af + 255 * (1 - af));
          b = Math.round(b * af + 255 * (1 - af));
          data[i + 3] = 255;
        }

        if (params.brightness !== 0) { r *= brightnessFactor; g *= brightnessFactor; b *= brightnessFactor; }
        if (params.contrast !== 0) {
          r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
          g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
          b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;
        }

        r = Math.min(255, Math.max(0, Math.round(r)));
        g = Math.min(255, Math.max(0, Math.round(g)));
        b = Math.min(255, Math.max(0, Math.round(b)));

        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        let value = gray < params.threshold ? 0 : 255;
        if (params.invertColors) value = 255 - value;

        data[i] = value; data[i + 1] = value; data[i + 2] = value;
      }
      pctx.putImageData(imageData, 0, 0);

      // NYCES DEFAULT_POTRACE_PARAMS
      Potrace.setParameter({ turdsize: 1, alphamax: 0.7, optcurve: true, opttolerance: 0.15, turnpolicy: 'minority' });
    } else {
      // Line art: standalone pipeline (edge enhance, blur, threshold)
      pctx.drawImage(canvas, 0, 0);
      let imageData = pctx.getImageData(0, 0, pc.width, pc.height);

      const enhanced = enhanceEdges(imageData.data, pc.width, pc.height, params.edgeSensitivity);
      imageData = new ImageData(enhanced, pc.width, pc.height);

      if (params.blurRadius > 0) {
        applyBlur(imageData.data, pc.width, pc.height, params.blurRadius);
        pctx.putImageData(imageData, 0, 0);
        imageData = pctx.getImageData(0, 0, pc.width, pc.height);
      }

      const binary = applyThreshold(imageData.data, pc.width, pc.height, params.threshold, params.invertColors);
      pctx.putImageData(new ImageData(binary, pc.width, pc.height), 0, 0);

      const smoothing = params.smoothing / 100;
      const turdsize = Math.max(2, Math.min(10, 8 - params.edgeSensitivity));
      const opttolerance = 0.3 + (smoothing * 0.65);
      Potrace.setParameter({ turdsize, alphamax: 0.5, optcurve: true, opttolerance, turnpolicy: 'majority' });
    }

    Potrace.loadImageFromCanvas(pc);

    return new Promise((resolve, reject) => {
      try {
        Potrace.process(() => {
          try {
            const isLineArt = mode === 'lineart';
            let svg = Potrace.getSVG(1, isLineArt ? 'curve' : undefined);

            const wm = svg.match(/width="([^"]+)"/);
            const hm = svg.match(/height="([^"]+)"/);
            if (wm && hm && svg.indexOf('viewBox') === -1) {
              svg = svg.replace('<svg', `<svg viewBox="0 0 ${parseFloat(wm[1])} ${parseFloat(hm[1])}"`);
            }

            if (isLineArt) {
              svg = svg.replace(/fill="[^"]*"/g, 'fill="none"');
              const stroke = params.invertColors ? 'white' : 'black';
              svg = svg.replace(/stroke="[^"]*"/g, `stroke="${stroke}"`);
              svg = svg.replace(/<path/g, `<path stroke-width="${params.lineThickness}" stroke-linecap="round" stroke-linejoin="round"`);
              if (params.invertColors) {
                const end = svg.indexOf('>') + 1;
                svg = svg.substring(0, end) + '<rect width="100%" height="100%" fill="black"/>' + svg.substring(end);
              }
            } else {
              const fill = params.invertColors ? 'white' : 'black';
              svg = svg.replace(/fill="[^"]*"/g, `fill="${fill}"`);
              svg = svg.replace(/stroke="[^"]*"/g, 'stroke="none"');
              if (params.invertColors) {
                const end = svg.indexOf('>') + 1;
                svg = svg.substring(0, end) + '<rect width="100%" height="100%" fill="black"/>' + svg.substring(end);
              }
            }

            resolve(optimizeSvgString(svg));
          } catch (err) { reject(err); }
        });
      } catch (err) { reject(err); }
    });
  }

  // --- Read current slider settings from the DOM ---

  function readCurrentParams() {
    return {
      threshold: parseInt(document.getElementById('thresholdSlider').value, 10),
      smoothing: parseInt(document.getElementById('smoothingSlider').value, 10),
      lineThickness: parseFloat(document.getElementById('lineThicknessSlider').value),
      blurRadius: parseFloat(document.getElementById('blurRadiusSlider').value),
      edgeSensitivity: parseFloat(document.getElementById('edgeSensitivitySlider').value),
      invertColors: document.getElementById('invertColorsToggle').checked,
      invertSource: document.getElementById('invertSourceToggle').checked,
      brightness: parseInt(document.getElementById('brightnessSlider').value, 10),
      contrast: parseInt(document.getElementById('contrastSlider').value, 10),
      brilliance: parseInt(document.getElementById('brillianceSlider').value, 10),
      shadows: parseInt(document.getElementById('shadowsSlider').value, 10)
    };
  }

  // --- Batch UI Controller ---

  let batchFiles = [];
  let batchResults = [];
  let batchAborted = false;

  function initBatchUI() {
    const section = document.getElementById('batchSection');
    if (!section) return;

    const dropZone = document.getElementById('batchDropZone');
    const fileInput = document.getElementById('batchFileInput');
    const fileList = document.getElementById('batchFileList');
    const startBtn = document.getElementById('batchStartBtn');
    const downloadBtn = document.getElementById('batchDownloadBtn');
    const clearBtn = document.getElementById('batchClearBtn');
    const progressBar = document.getElementById('batchProgressBar');
    const progressText = document.getElementById('batchProgressText');
    const modeSelect = document.getElementById('batchModeSelect');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('drag-active');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-active');
      addFiles(Array.from(e.dataTransfer.files));
    });

    fileInput.addEventListener('change', () => {
      addFiles(Array.from(fileInput.files));
      fileInput.value = '';
    });

    startBtn.addEventListener('click', () => runBatch(modeSelect.value));
    downloadBtn.addEventListener('click', downloadZip);
    clearBtn.addEventListener('click', clearBatch);

    function addFiles(files) {
      const images = files.filter(f => f.type.match('image.*'));
      if (!images.length) return;
      batchFiles.push(...images);
      renderFileList();
      startBtn.disabled = false;
      downloadBtn.disabled = true;
    }

    function renderFileList() {
      if (!batchFiles.length) {
        fileList.innerHTML = '<div class="batch-empty">No files added</div>';
        return;
      }
      fileList.innerHTML = batchFiles.map((f, i) => {
        const status = batchResults[i]
          ? '<span class="batch-done">&#10003;</span>'
          : (batchResults[i] === null ? '<span class="batch-err">&#10007;</span>' : '');
        const size = (f.size / 1024).toFixed(0) + ' KB';
        return `<div class="batch-file-row">
          <span class="batch-file-name">${f.name}</span>
          <span class="batch-file-size">${size}</span>
          <span class="batch-file-status">${status}</span>
          <button class="batch-file-remove" data-idx="${i}" title="Remove">&times;</button>
        </div>`;
      }).join('');

      fileList.querySelectorAll('.batch-file-remove').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.idx, 10);
          batchFiles.splice(idx, 1);
          batchResults.splice(idx, 1);
          renderFileList();
          if (!batchFiles.length) {
            startBtn.disabled = true;
            downloadBtn.disabled = true;
          }
        });
      });
    }

    function setProgress(current, total, fileName) {
      const pct = total ? Math.round((current / total) * 100) : 0;
      progressBar.style.width = pct + '%';
      progressText.textContent = total ? `${current}/${total} — ${fileName}` : '';
    }

    async function runBatch(mode) {
      if (!batchFiles.length) return;
      batchAborted = false;
      batchResults = new Array(batchFiles.length);
      startBtn.disabled = true;
      startBtn.textContent = 'Processing...';
      downloadBtn.disabled = true;
      clearBtn.disabled = true;

      const params = readCurrentParams();
      const modes = mode === 'both' ? ['lineart', 'silhouette'] : [mode];
      const total = batchFiles.length * modes.length;
      let processed = 0;

      for (let i = 0; i < batchFiles.length; i++) {
        if (batchAborted) break;
        const file = batchFiles[i];
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setProgress(processed, total, file.name);

        try {
          const img = await loadImageFromFile(file);
          const canvas = prepareCanvas(img, params);
          const results = {};

          for (const m of modes) {
            if (batchAborted) break;
            setProgress(processed, total, `${file.name} (${m})`);
            results[m] = await traceWithPotrace(canvas, img, params, m);
            processed++;
            setProgress(processed, total, file.name);
          }

          batchResults[i] = { baseName, results };
        } catch (err) {
          console.error(`Batch error on ${file.name}:`, err);
          batchResults[i] = null;
          processed += modes.length;
        }
        renderFileList();
      }

      setProgress(total, total, 'Complete');
      startBtn.disabled = false;
      startBtn.textContent = 'Start Batch';
      clearBtn.disabled = false;

      const hasResults = batchResults.some(r => r);
      downloadBtn.disabled = !hasResults;
    }

    async function downloadZip() {
      const validResults = batchResults.filter(r => r);
      if (!validResults.length) return;

      downloadBtn.disabled = true;
      downloadBtn.textContent = 'Zipping...';

      try {
        const zip = new JSZip();
        for (const result of validResults) {
          for (const [mode, svg] of Object.entries(result.results)) {
            const suffix = mode === 'lineart' ? 'lineart' : 'silhouette';
            zip.file(`${result.baseName}-${suffix}.svg`, svg);
          }
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `svg-batch-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      } catch (err) {
        console.error('ZIP creation failed:', err);
        alert('Failed to create ZIP: ' + err.message);
      }

      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Download ZIP';
    }

    function clearBatch() {
      batchAborted = true;
      batchFiles = [];
      batchResults = [];
      renderFileList();
      setProgress(0, 0, '');
      startBtn.disabled = true;
      startBtn.textContent = 'Start Batch';
      downloadBtn.disabled = true;
    }

    renderFileList();
  }

  document.addEventListener('DOMContentLoaded', initBatchUI);
})();
