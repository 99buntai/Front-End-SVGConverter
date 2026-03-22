function safeLog(message, showTiming = false) {
    if (window.debugConsole) {
        window.debugConsole.log(message, showTiming);
    } else {
        console.log(message);
    }
}

function safeStartTiming() {
    if (window.debugConsole) {
        return window.debugConsole.startTiming();
    }
    return performance.now();
}

document.addEventListener('DOMContentLoaded', () => {
    const mobileInfo = window.mobileOptimizationInfo || { isMobile: false };

    const fileInput = document.getElementById('fileInput');
    const uploadContainer = document.getElementById('uploadContainer');
    const originalPreview = document.getElementById('originalPreview');
    const silhouettePreview = document.getElementById('silhouettePreview');
    const downloadSilhouetteBtn = document.getElementById('downloadSilhouetteBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusIndicator = document.getElementById('statusIndicator');
    const enableDetailedMobileToggle = document.getElementById('enableDetailedMobileToggle');

    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdValue = document.getElementById('thresholdValue');
    const brightnessSlider = document.getElementById('brightnessSlider');
    const brightnessValue = document.getElementById('brightnessValue');
    const contrastSlider = document.getElementById('contrastSlider');
    const contrastValue = document.getElementById('contrastValue');
    const invertColorsToggle = document.getElementById('invertColorsToggle');

    let originalImage = null;
    let currentSilhouetteSvgData = null;
    let processingTimer = null;
    let processingStartTime = 0;
    let isInteractive = false;
    let detailedProcessingTimer = null;
    const DETAILED_PROCESSING_DELAY = 20;

    let desktopIsProcessingActive = false;
    let desktopLastInteractionTime = 0;

    const appState = mobileInfo.isMobile ? mobileInfo.state : {
        isProcessingActive: desktopIsProcessingActive,
        lastInteractionTime: desktopLastInteractionTime
    };
    const updateAppState = (newState) => {
        if (mobileInfo.isMobile) {
            Object.assign(mobileInfo.state, newState);
        } else {
            if (Object.prototype.hasOwnProperty.call(newState, 'isProcessingActive')) desktopIsProcessingActive = newState.isProcessingActive;
            if (Object.prototype.hasOwnProperty.call(newState, 'lastInteractionTime')) desktopLastInteractionTime = newState.lastInteractionTime;
        }
    };

    const defaultSettings = {
        threshold: 120,
        invertColors: false,
        brightness: 0,
        contrast: 0
    };

    uploadContainer.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    downloadSilhouetteBtn.addEventListener('click', () => downloadSvg());
    resetBtn.addEventListener('click', resetSettings);

    setupEventListeners();

    updateThresholdValue();
    updateBrightnessValue();
    updateContrastValue();

    function updateStatus(message, isProcessing = true) {
        statusIndicator.textContent = message;
        if (isProcessing) {
            statusIndicator.classList.add('processing');
        } else {
            statusIndicator.classList.remove('processing');
        }
        if (message.includes('Complete') || message.includes('Processed')) {
            if (window.statusTimeout) {
                clearTimeout(window.statusTimeout);
            }
            window.statusTimeout = setTimeout(() => {
                statusIndicator.textContent = '';
                statusIndicator.classList.remove('processing');
            }, 5000);
        }
    }

    function clearStatus() {
        statusIndicator.textContent = '';
        statusIndicator.classList.remove('processing');
    }

    function debouncedProcessImage() {
        updateAppState({ lastInteractionTime: Date.now() });
        if (processingTimer) {
            clearTimeout(processingTimer);
        }
        if (appState.isProcessingActive) {
            if (mobileInfo.isMobile) {
                processingTimer = setTimeout(debouncedProcessImage, 100);
            }
            return;
        }
        const debounceTime = mobileInfo.isMobile ? 150 : 10;
        processingTimer = setTimeout(() => {
            if (originalImage) {
                updateAppState({ isProcessingActive: true });
                isInteractive = true;
                processImage(() => {
                    updateAppState({ isProcessingActive: false });
                    if (mobileInfo.isMobile) {
                        const timeSinceLastInteraction = Date.now() - appState.lastInteractionTime;
                        if (timeSinceLastInteraction < 200) {
                            debouncedProcessImage();
                            return;
                        }
                    }
                    scheduleDetailedProcessing();
                });
            }
        }, debounceTime);
    }

    function resetSettings() {
        thresholdSlider.value = defaultSettings.threshold;
        brightnessSlider.value = defaultSettings.brightness;
        contrastSlider.value = defaultSettings.contrast;
        invertColorsToggle.checked = defaultSettings.invertColors;

        updateThresholdValue();
        updateBrightnessValue();
        updateContrastValue();

        updateStatus('Resetting to defaults...');
        if (originalImage) {
            processImage();
        }
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || !file.type.match('image.*')) return;

        updateStatus('Loading image...');

        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage = new Image();
            originalImage.onload = () => {
                displayOriginalImage();
                resetBtn.disabled = false;
                downloadSilhouetteBtn.disabled = true;
                currentSilhouetteSvgData = null;
                updateStatus('Processing image...');
                processImage();
            };
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function displayOriginalImage() {
        if (!originalImage) return;
        originalPreview.innerHTML = '';
        originalPreview.appendChild(originalImage.cloneNode(true));
    }

    function updateThresholdValue() {
        thresholdValue.textContent = thresholdSlider.value;
    }

    function updateBrightnessValue() {
        brightnessValue.textContent = brightnessSlider.value;
    }

    function updateContrastValue() {
        contrastValue.textContent = contrastSlider.value;
    }

    window.updateThresholdValue = updateThresholdValue;
    window.updateBrightnessValue = updateBrightnessValue;
    window.updateContrastValue = updateContrastValue;

    function downloadSvg() {
        if (!currentSilhouetteSvgData) return;

        updateStatus('Preparing download...');

        try {
            if (originalImage) {
                isInteractive = false;
                updateAppState({ isProcessingActive: true });
                silhouettePreview.innerHTML = '<div style="text-align: center; padding: 20px;">Processing high-quality export...</div>';

                setTimeout(() => {
                    processImage(() => {
                        updateAppState({ isProcessingActive: false });
                        if (!currentSilhouetteSvgData) {
                            handleProcessingError(new Error("Failed to generate SVG data for download"), originalImage.naturalWidth, originalImage.naturalHeight);
                            return;
                        }
                        completeSvgDownload(currentSilhouetteSvgData);
                    });
                }, 10);
                return;
            }

            if (!currentSilhouetteSvgData) throw new Error("No SVG data found for download");
            completeSvgDownload(currentSilhouetteSvgData);
        } catch (error) {
            console.error('Error downloading SVG:', error);
            updateStatus(`Download error: ${error.message}`, false);
            updateAppState({ isProcessingActive: false });
        }
    }

    function completeSvgDownload(svgData) {
        try {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgData, 'image/svg+xml');
            const svgElement = svgDoc.querySelector('svg');

            if (!svgElement) {
                throw new Error("Could not parse SVG for download");
            }

            const paths = svgDoc.querySelectorAll('path');
            const cleanSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

            for (const attr of Array.from(svgElement.attributes)) {
                cleanSvg.setAttribute(attr.name, attr.value);
            }

            for (const path of paths) {
                const clonedPath = path.cloneNode(true);
                clonedPath.setAttribute('fill', 'black');
                clonedPath.removeAttribute('stroke');
                cleanSvg.appendChild(clonedPath);
            }

            if (invertColorsToggle.checked) {
                const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                bgRect.setAttribute('width', '100%');
                bgRect.setAttribute('height', '100%');
                bgRect.setAttribute('fill', 'white');
                cleanSvg.insertBefore(bgRect, cleanSvg.firstChild);
            }

            if (!cleanSvg.hasAttribute('viewBox') && cleanSvg.hasAttribute('width') && cleanSvg.hasAttribute('height')) {
                const width = cleanSvg.getAttribute('width');
                const height = cleanSvg.getAttribute('height');
                cleanSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            }

            const serializer = new XMLSerializer();
            let finalSvgString = serializer.serializeToString(cleanSvg);
            finalSvgString = optimizeSvgString(finalSvgString);

            downloadSvgFile(finalSvgString, 'silhouette.svg');
        } catch (error) {
            console.error(`Error completing SVG download: ${error.message}`);
            updateStatus(`Download error: ${error.message}`, false);
        }
    }

    function downloadSvgFile(svgString, filename) {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            updateStatus('Download complete!', false);
            clearStatus();
        }, 100);
    }

    function scheduleDetailedProcessing() {
        if (detailedProcessingTimer) {
            clearTimeout(detailedProcessingTimer);
            safeLog("Cancelled pending detailed processing");
        }

        if (mobileInfo.isMobile && !enableDetailedMobileToggle.checked) {
            safeLog("Detailed processing skipped on mobile (disabled by user).");
            return;
        }

        const detailDelay = mobileInfo.isMobile ? 800 : DETAILED_PROCESSING_DELAY;

        safeLog("Scheduling detailed processing...");
        detailedProcessingTimer = setTimeout(() => {
            if (appState.isProcessingActive) {
                if (mobileInfo.isMobile && enableDetailedMobileToggle.checked) {
                    scheduleDetailedProcessing();
                }
                return;
            }

            const timeSinceLastInteraction = Date.now() - appState.lastInteractionTime;
            const recentInteractionThreshold = mobileInfo.isMobile ? 500 : 50;
            if (timeSinceLastInteraction < recentInteractionThreshold) {
                if (!mobileInfo.isMobile || enableDetailedMobileToggle.checked) {
                    scheduleDetailedProcessing();
                }
                return;
            }

            updateAppState({ isProcessingActive: true });
            isInteractive = false;
            safeLog("Starting detailed rendering");
            safeStartTiming();
            updateStatus('Generating detailed output...');

            processImage(() => {
                updateAppState({ isProcessingActive: false });
                safeLog("Detailed rendering complete", true);
            });
        }, detailDelay);
    }

    function setupEventListeners() {
        const sliders = [thresholdSlider, brightnessSlider, contrastSlider];
        const toggles = [invertColorsToggle];

        for (const slider of sliders) {
            slider.addEventListener('input', () => {
                const updateFnName = `update${slider.id.charAt(0).toUpperCase() + slider.id.slice(1, -6)}Value`;
                if (typeof window[updateFnName] === 'function') {
                    window[updateFnName]();
                }

                if (detailedProcessingTimer) {
                    clearTimeout(detailedProcessingTimer);
                    detailedProcessingTimer = null;
                    safeLog("Cancelled detailed processing - interactive mode");
                }

                if (!isInteractive) {
                    safeLog("Entering interactive preview mode");
                }

                requestAnimationFrame(() => {
                    isInteractive = true;
                    debouncedProcessImage();
                });
            });

            slider.addEventListener('change', () => {
                scheduleDetailedProcessing();
            });
        }

        for (const toggle of toggles) {
            toggle.addEventListener('change', () => {
                requestAnimationFrame(() => {
                    isInteractive = true;
                    updateStatus('Interactive preview...');
                    debouncedProcessImage();
                });
            });
        }

        if (mobileInfo.isMobile && enableDetailedMobileToggle) {
            enableDetailedMobileToggle.addEventListener('change', () => {
                if (enableDetailedMobileToggle.checked) {
                    safeLog("Detailed rendering enabled on mobile. Attempting schedule...");
                    scheduleDetailedProcessing();
                } else {
                    safeLog("Detailed rendering disabled on mobile.");
                    if (detailedProcessingTimer) {
                        clearTimeout(detailedProcessingTimer);
                        detailedProcessingTimer = null;
                    }
                }
            });
        }
    }

    function processImage(callback) {
        if (!originalImage) return;

        if (!isInteractive) {
            updateStatus('Processing...');
            silhouettePreview.innerHTML = '<div style="text-align: center; padding: 20px;">Processing...</div>';
        }

        processingStartTime = safeStartTiming();

        requestAnimationFrame(() => {
            const threshold = Number.parseInt(thresholdSlider.value, 10);
            const invertColors = invertColorsToggle.checked;
            const brightness = Number.parseInt(brightnessSlider.value, 10);
            const contrast = Number.parseInt(contrastSlider.value, 10);

            safeLog(`Processing with invertColors: ${invertColors}`);
            const startTime = performance.now();

            const silhouetteCanvas = document.createElement('canvas');
            silhouetteCanvas.width = originalImage.naturalWidth;
            silhouetteCanvas.height = originalImage.naturalHeight;
            const silCtx = silhouetteCanvas.getContext('2d', { willReadFrequently: true });
            silCtx.drawImage(originalImage, 0, 0);

            let simplifyLevel = 0;
            if (isInteractive) {
                simplifyLevel = mobileInfo.isMobile ? 2 : 1;
            }

            try {
                processSilhouette(
                    silhouetteCanvas, threshold, invertColors, brightness, contrast, simplifyLevel
                ).then(silhouetteSvg => {
                    if (Date.now() - appState.lastInteractionTime < 200) {
                        if (typeof callback === 'function') callback();
                        return;
                    }

                    currentSilhouetteSvgData = silhouetteSvg;
                    silhouettePreview.innerHTML = silhouetteSvg;
                    downloadSilhouetteBtn.disabled = false;

                    const endTime = performance.now();
                    const processingTime = Math.round(endTime - startTime);
                    const mode = isInteractive ? "Interactive" : "Detailed";
                    safeLog(`${mode} processing complete in ${processingTime}ms`, true);
                    updateStatus(`Processed in ${processingTime}ms`, false);

                    if (typeof callback === 'function') callback();
                }).catch(error => {
                    console.error('Error in silhouette processing:', error);
                    handleProcessingError(error, silhouetteCanvas.width, silhouetteCanvas.height);
                    updateAppState({ isProcessingActive: false });
                    if (typeof callback === 'function') callback();
                });
            } catch (error) {
                console.error('Error processing image:', error);
                handleProcessingError(error, silhouetteCanvas.width, silhouetteCanvas.height);
                updateAppState({ isProcessingActive: false });
                if (typeof callback === 'function') callback();
            }
        });
    }

    function processSilhouette(canvas, threshold, invertColors, brightness, contrast, simplifyLevel) {
        const potraceCanvas = document.createElement('canvas');
        const potraceCtx = potraceCanvas.getContext('2d', { willReadFrequently: true });

        let scaleFactor = 1;
        if (simplifyLevel === 2) {
            const maxSize = Math.max(canvas.width, canvas.height);
            if (maxSize > 500) scaleFactor = maxSize / 500;
        } else if (simplifyLevel === 1) {
            const maxSize = Math.max(canvas.width, canvas.height);
            if (maxSize > 800) scaleFactor = maxSize / 800;
        }

        potraceCanvas.width = Math.floor(canvas.width / scaleFactor);
        potraceCanvas.height = Math.floor(canvas.height / scaleFactor);
        potraceCtx.drawImage(canvas, 0, 0, potraceCanvas.width, potraceCanvas.height);

        const imageData = potraceCtx.getImageData(0, 0, potraceCanvas.width, potraceCanvas.height);
        const data = imageData.data;

        const brightnessFactor = 1 + brightness / 100;
        const contrastFactor = (100 + contrast) / 100;

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

            if (brightness !== 0) {
                r *= brightnessFactor;
                g *= brightnessFactor;
                b *= brightnessFactor;
            }

            if (contrast !== 0) {
                r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
                g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
                b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;
            }

            r = Math.min(255, Math.max(0, Math.round(r)));
            g = Math.min(255, Math.max(0, Math.round(g)));
            b = Math.min(255, Math.max(0, Math.round(b)));

            const gray = r * 0.299 + g * 0.587 + b * 0.114;
            let value = gray < threshold ? 0 : 255;

            if (invertColors) value = 255 - value;

            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
        }

        potraceCtx.putImageData(imageData, 0, 0);

        Potrace.setParameter({
            turdsize: 1,
            alphamax: 0.7,
            optcurve: true,
            opttolerance: 0.15,
            turnpolicy: "minority"
        });
        Potrace.loadImageFromCanvas(potraceCanvas);

        return new Promise((resolve, reject) => {
            try {
                Potrace.process(() => {
                    try {
                        let svgData = Potrace.getSVG(1);
                        const widthMatch = svgData.match(/width="([^"]+)"/);
                        const heightMatch = svgData.match(/height="([^"]+)"/);
                        if (widthMatch && heightMatch) {
                            const svgWidth = Number.parseFloat(widthMatch[1]);
                            const svgHeight = Number.parseFloat(heightMatch[1]);
                            if (svgData.indexOf('viewBox') === -1) {
                                svgData = svgData.replace('<svg', `<svg viewBox="0 0 ${svgWidth} ${svgHeight}"`);
                            }
                        }
                        resolve(svgData);
                    } catch (error) {
                        console.error("Error generating SVG with Potrace:", error);
                        reject(error);
                    }
                });
            } catch (error) {
                console.error("Error processing with Potrace:", error);
                reject(error);
            }
        });
    }

    function createErrorSvg(message, width, height) {
        return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <text x="50%" y="50%" text-anchor="middle" fill="red">Error: ${message}</text>
        </svg>`;
    }

    function handleProcessingError(error, width, height) {
        const errorSvg = createErrorSvg(error.message, width, height);
        silhouettePreview.innerHTML = errorSvg;
        downloadSilhouetteBtn.disabled = true;
        updateStatus(`Error: ${error.message}`, false);
    }

    function optimizeSvgString(svgString) {
        return svgString
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/>\s+</g, '><')
            .trim()
            .replace(/<g>\s*<\/g>/g, '')
            .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
            .replace(/<desc[^>]*>[\s\S]*?<\/desc>/gi, '')
            .replace(/<metadata[^>]*>[\s\S]*?<\/metadata>/gi, '')
            .replace(/\s{2,}/g, ' ')
            .replace(/(\d+\.\d{3,})/g, (match) => parseFloat(match).toFixed(2));
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const uploadContainer = document.getElementById('uploadContainer');
    const fileInput = document.getElementById('fileInput');

    uploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadContainer.style.borderColor = '#4e77cc';
    });

    uploadContainer.addEventListener('dragleave', () => {
        uploadContainer.style.borderColor = '#ccc';
    });

    uploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadContainer.style.borderColor = '#ccc';

        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            const event = new Event('change');
            fileInput.dispatchEvent(event);
        }
    });
});
