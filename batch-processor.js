(function () {
  'use strict';

  function optimizePath(d) {
    if (!d) return d;
    return d
      .replace(/(\d+)\.(\d)\d+/g, '$1.$2')
      .replace(/(\d+)\.0(?=\s|,|[A-Za-z]|$)/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .replace(/([MCLHVSQTAZmclhvsqtaz])\s+/g, '$1')
      .replace(/\s+([MCLHVSQTAZmclhvsqtaz])/g, '$1')
      .replace(/,\s+/g, ',')
      .replace(/\s+,/g, ',')
      .trim();
  }

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

  function traceImage(img, params) {
    const pc = document.createElement('canvas');
    const pctx = pc.getContext('2d', { willReadFrequently: true });
    pc.width = img.naturalWidth;
    pc.height = img.naturalHeight;
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

    Potrace.setParameter({ turdsize: 1, alphamax: 0.7, optcurve: true, opttolerance: 0.15, turnpolicy: 'minority' });
    Potrace.loadImageFromCanvas(pc);

    return new Promise((resolve, reject) => {
      try {
        Potrace.process(() => {
          try {
            const raw = Potrace.getSVG(1);
            const parser = new DOMParser();
            const doc = parser.parseFromString(raw, 'image/svg+xml');
            const srcSvg = doc.querySelector('svg');
            const w = srcSvg ? srcSvg.getAttribute('width') : pc.width;
            const h = srcSvg ? srcSvg.getAttribute('height') : pc.height;
            const pathEl = doc.querySelector('path');
            const pathD = pathEl ? optimizePath(pathEl.getAttribute('d') || '') : '';

            let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">`;
            svg += `<path d="${pathD}" fill="#000" fill-rule="evenodd"/>`;
            svg += '</svg>';
            resolve(svg);
          } catch (err) { reject(err); }
        });
      } catch (err) { reject(err); }
    });
  }

  function readCurrentParams() {
    return {
      threshold: parseInt(document.getElementById('thresholdSlider').value, 10),
      invertColors: document.getElementById('invertColorsToggle').checked,
      brightness: parseInt(document.getElementById('brightnessSlider').value, 10),
      contrast: parseInt(document.getElementById('contrastSlider').value, 10)
    };
  }

  // Each entry: { file, name, img (loaded Image), svg (result string) }
  let batchItems = [];
  let batchAborted = false;
  let isProcessing = false;
  let retraceQueued = false;
  let retraceTimer = null;

  function initBatchUI() {
    const section = document.getElementById('batchSection');
    if (!section) return;

    const dropZone = document.getElementById('batchDropZone');
    const fileInput = document.getElementById('batchFileInput');
    const previewGrid = document.getElementById('batchPreviewGrid');
    const startBtn = document.getElementById('batchStartBtn');
    const downloadBtn = document.getElementById('batchDownloadBtn');
    const clearBtn = document.getElementById('batchClearBtn');
    const progressBar = document.getElementById('batchProgressBar');
    const progressText = document.getElementById('batchProgressText');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-active'); });
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

    startBtn.addEventListener('click', () => runBatch());
    downloadBtn.addEventListener('click', downloadZip);
    clearBtn.addEventListener('click', clearBatch);

    // Auto-retrace when sliders/toggles change
    const sliders = document.querySelectorAll('#thresholdSlider, #brightnessSlider, #contrastSlider');
    const toggles = document.querySelectorAll('#invertColorsToggle');

    sliders.forEach(s => s.addEventListener('input', scheduleRetrace));
    toggles.forEach(t => t.addEventListener('change', scheduleRetrace));

    function scheduleRetrace() {
      if (!batchItems.length || !batchItems.some(it => it.img)) return;
      if (retraceTimer) clearTimeout(retraceTimer);
      retraceTimer = setTimeout(() => {
        if (isProcessing) {
          retraceQueued = true;
        } else {
          runBatch();
        }
      }, 300);
    }

    async function addFiles(files) {
      const images = files.filter(f => f.type.match('image.*'));
      if (!images.length) return;

      for (const file of images) {
        const name = file.name.replace(/\.[^/.]+$/, '');
        const item = { file, name, img: null, svg: null };
        batchItems.push(item);
      }

      renderGrid();
      startBtn.disabled = false;
      downloadBtn.disabled = true;

      // Preload images
      for (const item of batchItems) {
        if (!item.img) {
          try {
            item.img = await loadImageFromFile(item.file);
            renderGrid();
          } catch (e) {
            console.error('Failed to load:', item.file.name, e);
          }
        }
      }

      // Auto-trace after loading
      runBatch();
    }

    function renderGrid() {
      if (!batchItems.length) {
        previewGrid.innerHTML = '<div class="batch-empty">No files added</div>';
        return;
      }
      previewGrid.innerHTML = batchItems.map((item, i) => {
        let preview = '';
        if (item.svg) {
          preview = `<div class="batch-thumb-svg">${item.svg}</div>`;
        } else if (item.img) {
          preview = `<div class="batch-thumb-img"><img src="${item.img.src}" alt="${item.name}"></div>`;
        } else {
          preview = '<div class="batch-thumb-loading">Loading...</div>';
        }
        return `<div class="batch-card" data-idx="${i}">
          <div class="batch-card-preview">${preview}</div>
          <div class="batch-card-name" title="${item.file.name}">${item.name}</div>
          <button class="batch-card-remove" data-idx="${i}">&times;</button>
        </div>`;
      }).join('');

      previewGrid.querySelectorAll('.batch-card-remove').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          batchItems.splice(parseInt(btn.dataset.idx, 10), 1);
          renderGrid();
          if (!batchItems.length) {
            startBtn.disabled = true;
            downloadBtn.disabled = true;
          }
        });
      });
    }

    function setProgress(current, total, text) {
      const pct = total ? Math.round((current / total) * 100) : 0;
      progressBar.style.width = pct + '%';
      progressText.textContent = total ? `${current}/${total} — ${text}` : '';
    }

    async function runBatch() {
      if (!batchItems.length) return;
      batchAborted = false;
      isProcessing = true;
      retraceQueued = false;
      startBtn.disabled = true;
      startBtn.textContent = 'Processing...';
      downloadBtn.disabled = true;
      clearBtn.disabled = true;

      const params = readCurrentParams();
      const total = batchItems.length;

      for (let i = 0; i < batchItems.length; i++) {
        if (batchAborted) break;
        const item = batchItems[i];
        setProgress(i, total, item.file.name);

        if (!item.img) {
          try { item.img = await loadImageFromFile(item.file); } catch (e) {
            console.error('Load error:', item.file.name, e);
            item.svg = null;
            continue;
          }
        }

        try {
          item.svg = await traceImage(item.img, params);
        } catch (err) {
          console.error('Trace error:', item.file.name, err);
          item.svg = null;
        }

        renderGrid();
      }

      setProgress(total, total, 'Complete');
      isProcessing = false;
      startBtn.disabled = false;
      startBtn.textContent = 'Retrace All';
      clearBtn.disabled = false;
      downloadBtn.disabled = !batchItems.some(it => it.svg);

      if (retraceQueued) {
        retraceQueued = false;
        runBatch();
      }
    }

    async function downloadZip() {
      const valid = batchItems.filter(it => it.svg);
      if (!valid.length) return;

      downloadBtn.disabled = true;
      downloadBtn.textContent = 'Zipping...';

      try {
        const zip = new JSZip();
        for (const item of valid) {
          zip.file(`${item.name}.svg`, item.svg);
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `svg-batch-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      } catch (err) {
        console.error('ZIP failed:', err);
        alert('Failed to create ZIP: ' + err.message);
      }

      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Download ZIP';
    }

    function clearBatch() {
      batchAborted = true;
      batchItems = [];
      renderGrid();
      setProgress(0, 0, '');
      startBtn.disabled = true;
      startBtn.textContent = 'Start Batch';
      downloadBtn.disabled = true;
    }

    renderGrid();
  }

  document.addEventListener('DOMContentLoaded', initBatchUI);
})();
