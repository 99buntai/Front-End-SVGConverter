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

  var batchTraceQueue = Promise.resolve();

  function traceWithPotrace(img, params) {
    batchTraceQueue = batchTraceQueue.then(() => doTrace(img, params));
    return batchTraceQueue;
  }

  function doTrace(img, params) {
    return new Promise((resolve, reject) => {
      try {
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
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          const alpha = data[i + 3];

          if (alpha < 255) {
            const alphaFactor = alpha / 255;
            r = Math.round(r * alphaFactor + 255 * (1 - alphaFactor));
            g = Math.round(g * alphaFactor + 255 * (1 - alphaFactor));
            b = Math.round(b * alphaFactor + 255 * (1 - alphaFactor));
            data[i + 3] = 255;
          }

          if (params.brightness !== 0) {
            r *= brightnessFactor;
            g *= brightnessFactor;
            b *= brightnessFactor;
          }

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

          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
        }

        pctx.putImageData(imageData, 0, 0);

        Potrace.setParameter({
          turdsize: 1,
          alphamax: 0.7,
          optcurve: true,
          opttolerance: 0.15,
          turnpolicy: 'minority'
        });
        Potrace.loadImageFromCanvas(pc);

        setTimeout(() => {
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
        }, 50);
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

    startBtn.addEventListener('click', () => runBatch());
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

    async function runBatch() {
      if (!batchFiles.length) return;
      batchAborted = false;
      batchResults = new Array(batchFiles.length);
      startBtn.disabled = true;
      startBtn.textContent = 'Processing...';
      downloadBtn.disabled = true;
      clearBtn.disabled = true;

      const params = readCurrentParams();
      const total = batchFiles.length;
      let processed = 0;

      for (let i = 0; i < batchFiles.length; i++) {
        if (batchAborted) break;
        const file = batchFiles[i];
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        setProgress(processed, total, file.name);

        try {
          const img = await loadImageFromFile(file);
          const svg = await traceWithPotrace(img, params);
          processed++;
          setProgress(processed, total, file.name);
          batchResults[i] = { baseName, svg };
        } catch (err) {
          console.error(`Batch error on ${file.name}:`, err);
          batchResults[i] = null;
          processed++;
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
          zip.file(`${result.baseName}.svg`, result.svg);
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
