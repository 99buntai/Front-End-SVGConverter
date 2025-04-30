/**
 * SVG Line Art Converter
 * 
 * A powerful client-side tool for converting images to SVG line art with
 * both outline and silhouette modes.
 * 
 * Version: 1.0.0
 */

// Main application code
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const fileInput = document.getElementById('fileInput');
    const uploadContainer = document.getElementById('uploadContainer');
    const originalPreview = document.getElementById('originalPreview');
    const svgPreview = document.getElementById('svgPreview');
    const silhouettePreview = document.getElementById('silhouettePreview');
    const processBtn = document.getElementById('processBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const downloadSilhouetteBtn = document.getElementById('downloadSilhouetteBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusIndicator = document.getElementById('statusIndicator');
    
    // Slider controls
    const thresholdSlider = document.getElementById('thresholdSlider');
    const thresholdValue = document.getElementById('thresholdValue');
    const smoothingSlider = document.getElementById('smoothingSlider');
    const smoothingValue = document.getElementById('smoothingValue');
    const lineThicknessSlider = document.getElementById('lineThicknessSlider');
    const lineThicknessValue = document.getElementById('lineThicknessValue');
    const blurRadiusSlider = document.getElementById('blurRadiusSlider');
    const blurRadiusValue = document.getElementById('blurRadiusValue');
    const edgeSensitivitySlider = document.getElementById('edgeSensitivitySlider');
    const edgeSensitivityValue = document.getElementById('edgeSensitivityValue');
    const brightnessSlider = document.getElementById('brightnessSlider');
    const brightnessValue = document.getElementById('brightnessValue');
    const contrastSlider = document.getElementById('contrastSlider');
    const contrastValue = document.getElementById('contrastValue');
    const brillianceSlider = document.getElementById('brillianceSlider');
    const brillianceValue = document.getElementById('brillianceValue');
    const shadowsSlider = document.getElementById('shadowsSlider');
    const shadowsValue = document.getElementById('shadowsValue');
    
    // Toggle controls
    const invertColorsToggle = document.getElementById('invertColorsToggle');
    
    // State variables
    let originalImage = null;
    let currentSvgData = null;
    let currentSilhouetteSvgData = null;
    let processingTimer = null;
    let originalImageData = null;
    
    // Default values for controls
    const defaultSettings = {
        threshold: 120,
        smoothing: 80,
        lineThickness: 3,
        blurRadius: 1,
        edgeSensitivity: 1.8,
        invertColors: false,
        brightness: 0,
        contrast: 0,
        brilliance: 0,
        shadows: 0
    };
    
    // Event listeners
    uploadContainer.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    processBtn.addEventListener('click', processImage);
    downloadBtn.addEventListener('click', () => downloadSvg('line'));
    downloadSilhouetteBtn.addEventListener('click', () => downloadSvg('silhouette'));
    resetBtn.addEventListener('click', resetSettings);
    
    // Add debounced event listeners to all controls
    const controlInputs = [
        thresholdSlider, smoothingSlider, lineThicknessSlider, 
        blurRadiusSlider, edgeSensitivitySlider, brightnessSlider,
        contrastSlider, brillianceSlider, shadowsSlider, invertColorsToggle
    ];
    
    for (const input of controlInputs) {
        if (input.type === 'range') {
            input.addEventListener('input', () => {
                // Update display value
                const updateFnName = `update${input.id.charAt(0).toUpperCase() + input.id.slice(1, -6)}Value`;
                if (typeof window[updateFnName] === 'function') {
                    window[updateFnName]();
                }
                // Show updating status
                updateStatus('Updating...');
                // Debounce the processing
                debouncedProcessImage();
            });
        } else if (input.type === 'checkbox') {
            input.addEventListener('change', () => {
                updateStatus('Updating...');
                debouncedProcessImage();
            });
        }
    }
    
    /**
     * Update status indicator
     * @param {string} message - Status message to display
     * @param {boolean} isProcessing - Whether this is a processing status
     */
    function updateStatus(message, isProcessing = true) {
        statusIndicator.textContent = message;
        if (isProcessing) {
            statusIndicator.classList.add('processing');
        } else {
            statusIndicator.classList.remove('processing');
        }
    }
    
    /**
     * Clear status after a delay
     * @param {number} delay - Delay in milliseconds
     */
    function clearStatus(delay = 1500) {
        setTimeout(() => {
            statusIndicator.textContent = '';
            statusIndicator.classList.remove('processing');
        }, delay);
    }
    
    /**
     * Debounce function for processing
     */
    function debouncedProcessImage() {
        if (processingTimer) {
            clearTimeout(processingTimer);
        }
        processingTimer = setTimeout(() => {
            if (originalImage) {
                processImage();
            }
        }, 200);
    }
    
    /**
     * Reset all settings to defaults
     */
    function resetSettings() {
        thresholdSlider.value = defaultSettings.threshold;
        smoothingSlider.value = defaultSettings.smoothing;
        lineThicknessSlider.value = defaultSettings.lineThickness;
        blurRadiusSlider.value = defaultSettings.blurRadius;
        edgeSensitivitySlider.value = defaultSettings.edgeSensitivity;
        brightnessSlider.value = defaultSettings.brightness;
        contrastSlider.value = defaultSettings.contrast;
        brillianceSlider.value = defaultSettings.brilliance;
        shadowsSlider.value = defaultSettings.shadows;
        invertColorsToggle.checked = defaultSettings.invertColors;
        
        updateThresholdValue();
        updateSmoothingValue();
        updateLineThicknessValue();
        updateBlurRadiusValue();
        updateEdgeSensitivityValue();
        updateBrightnessValue();
        updateContrastValue();
        updateBrillianceValue();
        updateShadowsValue();
        
        updateStatus('Resetting to defaults...');
        
        // Process the image with new settings
        if (originalImage) {
            processImage();
        }
    }
    
    /**
     * Handle file upload
     * @param {Event} event - File input change event
     */
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || !file.type.match('image.*')) return;
        
        updateStatus('Loading image...');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            // Create and display the original image
            originalImage = new Image();
            originalImage.onload = () => {
                // Save original image data for adjustments
                const canvas = document.createElement('canvas');
                canvas.width = originalImage.naturalWidth;
                canvas.height = originalImage.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(originalImage, 0, 0);
                originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Display the image
                displayOriginalImage();
                
                processBtn.disabled = false;
                resetBtn.disabled = false;
                downloadBtn.disabled = true;
                downloadSilhouetteBtn.disabled = true;
                currentSvgData = null;
                currentSilhouetteSvgData = null;
                
                updateStatus('Processing image...');
                
                // Process immediately on load
                processImage();
            };
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    /**
     * Display original image with adjustments
     */
    function displayOriginalImage() {
        if (!originalImage || !originalImageData) return;
        
        // Get adjustment values
        const brightness = Number.parseInt(brightnessSlider.value, 10);
        const contrast = Number.parseInt(contrastSlider.value, 10);
        const brilliance = Number.parseInt(brillianceSlider.value, 10);
        const shadows = Number.parseInt(shadowsSlider.value, 10);
        
        // If no adjustments, just show the original
        if (brightness === 0 && contrast === 0 && brilliance === 0 && shadows === 0) {
            originalPreview.innerHTML = '';
            originalPreview.appendChild(originalImage);
            return;
        }
        
        // Create adjusted image
        const canvas = document.createElement('canvas');
        canvas.width = originalImage.naturalWidth;
        canvas.height = originalImage.naturalHeight;
        
        // Apply same styling as images to maintain consistent display size
        canvas.style.maxWidth = '100%';
        canvas.style.maxHeight = '300px';
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        canvas.style.borderRadius = '4px';
        
        const ctx = canvas.getContext('2d');
        
        // Create a copy of the original image data
        const adjustedData = new ImageData(
            new Uint8ClampedArray(originalImageData.data),
            originalImageData.width,
            originalImageData.height
        );
        
        // Apply all adjustments
        applyImageAdjustments(adjustedData.data, brightness, contrast, brilliance, shadows);
        
        // Put adjusted data on canvas
        ctx.putImageData(adjustedData, 0, 0);
        
        // Display the adjusted image
        originalPreview.innerHTML = '';
        originalPreview.appendChild(canvas);
    }
    
    /**
     * Apply image adjustments to pixel data
     * @param {Uint8ClampedArray} data - Image pixel data
     * @param {number} brightness - Brightness adjustment (-100 to 100)
     * @param {number} contrast - Contrast adjustment (-100 to 100)
     * @param {number} brilliance - Brilliance adjustment (-100 to 100)
     * @param {number} shadows - Shadows adjustment (-100 to 100)
     */
    function applyImageAdjustments(data, brightness, contrast, brilliance, shadows) {
        // Convert contrast value to multiplier (0-100 -> 0-2)
        const contrastFactor = (100 + contrast) / 100;
        
        // Convert brilliance and shadows to factors
        const brillianceFactor = brilliance / 100;
        const shadowsFactor = shadows / 100;
        
        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
            // Get original RGB values
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            // Calculate luminance (0-1)
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            
            // Apply shadows adjustment (affects dark areas more)
            if (shadows !== 0) {
                // Create a shadows strength factor that decreases as luminance increases
                // Stronger in shadow areas, minimal in highlights
                const shadowsStrength = Math.max(0, 1 - luminance * 2.5);
                
                // Apply shadows adjustment with varying strength based on luminance
                const shadowsAdjustment = shadowsFactor * shadowsStrength * 50; // Scale factor to make adjustment visible
                r += shadowsAdjustment;
                g += shadowsAdjustment;
                b += shadowsAdjustment;
            }
            
            // Apply brilliance adjustment (affects mid-tones more)
            if (brilliance !== 0) {
                // Create a brilliance strength that peaks in mid-tones and decreases at extremes
                // bellcurve effect - strongest around 0.5 luminance, weaker at 0 and 1
                const brillianceStrength = 1 - Math.abs(luminance - 0.5) * 2;
                
                // Apply brilliance with varying strength based on luminance
                const brillianceAdjustment = brillianceFactor * brillianceStrength * 50;
                r += brillianceAdjustment;
                g += brillianceAdjustment;
                b += brillianceAdjustment;
            }
            
            // Apply brightness (add value to each channel)
            r += brightness * 2.55; // Convert -100 to 100 scale to -255 to 255
            g += brightness * 2.55;
            b += brightness * 2.55;
            
            // Apply contrast
            // First, normalize to -0.5 to 0.5 range, apply contrast, then back to 0-255
            r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
            g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
            b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;
            
            // Clamp values to valid range
            data[i] = Math.min(255, Math.max(0, Math.round(r)));
            data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
            data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
            // Don't modify alpha
        }
    }
    
    // Update threshold value display
    function updateThresholdValue() {
        thresholdValue.textContent = thresholdSlider.value;
    }
    
    // Update smoothing value display
    function updateSmoothingValue() {
        smoothingValue.textContent = smoothingSlider.value;
    }
    
    // Update line thickness value display
    function updateLineThicknessValue() {
        lineThicknessValue.textContent = lineThicknessSlider.value;
    }
    
    // Update blur radius value display
    function updateBlurRadiusValue() {
        blurRadiusValue.textContent = blurRadiusSlider.value;
    }
    
    // Update edge sensitivity value display
    function updateEdgeSensitivityValue() {
        edgeSensitivityValue.textContent = edgeSensitivitySlider.value;
    }
    
    // Update brightness value display
    function updateBrightnessValue() {
        brightnessValue.textContent = brightnessSlider.value;
        displayOriginalImage();
    }
    
    // Update contrast value display
    function updateContrastValue() {
        contrastValue.textContent = contrastSlider.value;
        displayOriginalImage();
    }
    
    // Update brilliance value display
    function updateBrillianceValue() {
        brillianceValue.textContent = brillianceSlider.value;
        displayOriginalImage();
    }
    
    // Update shadows value display
    function updateShadowsValue() {
        shadowsValue.textContent = shadowsSlider.value;
        displayOriginalImage();
    }
    
    // Make update functions available globally for dynamic calls
    window.updateThresholdValue = updateThresholdValue;
    window.updateSmoothingValue = updateSmoothingValue;
    window.updateLineThicknessValue = updateLineThicknessValue;
    window.updateBlurRadiusValue = updateBlurRadiusValue;
    window.updateEdgeSensitivityValue = updateEdgeSensitivityValue;
    window.updateBrightnessValue = updateBrightnessValue;
    window.updateContrastValue = updateContrastValue;
    window.updateBrillianceValue = updateBrillianceValue;
    window.updateShadowsValue = updateShadowsValue;
    
    // Download SVG file
    function downloadSvg(type) {
        if (type === 'line' && !currentSvgData) return;
        if (type === 'silhouette' && !currentSilhouetteSvgData) return;
        
        updateStatus('Preparing download...');
        
        try {
            let svgData = type === 'line' ? currentSvgData : currentSilhouetteSvgData;
            if (!svgData) throw new Error("No SVG data found");
            
            // Get the SVG element directly
            const svgElement = type === 'line' ? 
                svgPreview.querySelector('svg') : 
                silhouettePreview.querySelector('svg');
                
            if (!svgElement) {
                throw new Error("No SVG element found");
            }
            
            // Clone the SVG for export
            const clonedSvg = svgElement.cloneNode(true);
            
            // Get parameters
            const width = parseInt(clonedSvg.getAttribute('width'));
            const height = parseInt(clonedSvg.getAttribute('height'));
            const invertColors = invertColorsToggle.checked;
            const strokeColor = invertColors ? 'white' : 'black';
            const lineThickness = Number.parseFloat(lineThicknessSlider.value);
            
            // Create a new clean SVG with the same dimensions
            const cleanSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            cleanSvg.setAttribute('width', width);
            cleanSvg.setAttribute('height', height);
            cleanSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            cleanSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            
            // Get all path and rect elements, skipping the background rect if present
            const elements = Array.from(clonedSvg.querySelectorAll('path, rect'));
            
            // First element might be the background - check and skip if needed
            let startIndex = 0;
            if (elements.length > 0) {
                const firstElement = elements[0];
                // Skip if it's a full-size background rectangle
                if (firstElement.tagName.toLowerCase() === 'rect' && 
                    (parseInt(firstElement.getAttribute('width')) === width) && 
                    (parseInt(firstElement.getAttribute('height')) === height)) {
                    startIndex = 1;
                }
            }
            
            // Add all elements except background to the clean SVG
            for (let i = startIndex; i < elements.length; i++) {
                const element = elements[i].cloneNode(true);
                
                // For silhouette mode, make sure elements are filled
                if (type === 'silhouette') {
                    // Remove any stroke attributes
                    element.removeAttribute('stroke');
                    element.removeAttribute('stroke-width');
                    element.removeAttribute('stroke-linecap');
                    element.removeAttribute('stroke-linejoin');
                    
                    // Set fill color
                    element.setAttribute('fill', strokeColor);
                } else {
                    // For outline mode, ensure paths have no fill
                    if (element.tagName.toLowerCase() === 'path') {
                        element.setAttribute('fill', 'none');
                        element.setAttribute('stroke', strokeColor);
                        element.setAttribute('stroke-width', lineThickness);
                        element.setAttribute('stroke-linecap', 'round');
                        element.setAttribute('stroke-linejoin', 'round');
                    }
                }
                
                cleanSvg.appendChild(element);
            }
            
            // Serialize the SVG to string
            const serializer = new XMLSerializer();
            const cleanSvgString = serializer.serializeToString(cleanSvg);
            
            // Create download
            const blob = new Blob([cleanSvgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `lineart_${type}.svg`;
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                updateStatus('Download complete!', false);
                clearStatus();
            }, 100);
        } catch (error) {
            console.error(`Error downloading ${type} SVG:`, error);
            updateStatus(`Download error: ${error.message}`, false);
        }
    }
    
    // Process the image to generate SVG
    function processImage() {
        if (!originalImage || !originalImageData) return;
        
        // Add a "processing" indicator
        updateStatus('Processing...');
        svgPreview.innerHTML = '<div style="text-align: center; padding: 20px;">Processing...</div>';
        silhouettePreview.innerHTML = '<div style="text-align: center; padding: 20px;">Processing...</div>';
        
        // Disable process button while processing
        processBtn.disabled = true;
        
        // Use requestAnimationFrame to give UI a chance to update
        requestAnimationFrame(() => {
            // Get values from controls
            const threshold = Number.parseInt(thresholdSlider.value, 10);
            const smoothing = Number.parseInt(smoothingSlider.value, 10) / 100;
            const lineThickness = Number.parseFloat(lineThicknessSlider.value);
            const blurRadius = Number.parseFloat(blurRadiusSlider.value);
            const edgeSensitivity = Number.parseFloat(edgeSensitivitySlider.value);
            const invertColors = invertColorsToggle.checked;
            const brightness = Number.parseInt(brightnessSlider.value, 10);
            const contrast = Number.parseInt(contrastSlider.value, 10);
            const brilliance = Number.parseInt(brillianceSlider.value, 10);
            const shadows = Number.parseInt(shadowsSlider.value, 10);
            
            // Track processing time
            const startTime = performance.now();
            
            // Create a canvas to process the image with adjustments
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions to match the image
            canvas.width = originalImage.naturalWidth;
            canvas.height = originalImage.naturalHeight;
            
            // Create a copy of the original image data with adjustments
            const adjustedData = new ImageData(
                new Uint8ClampedArray(originalImageData.data),
                originalImageData.width,
                originalImageData.height
            );
            
            // Apply all image adjustments
            if (brightness !== 0 || contrast !== 0 || brilliance !== 0 || shadows !== 0) {
                applyImageAdjustments(adjustedData.data, brightness, contrast, brilliance, shadows);
            }
            
            // Put the adjusted data on the canvas
            ctx.putImageData(adjustedData, 0, 0);
            
            try {
                // Process both types in parallel
                const lineArtPromise = new Promise(resolve => {
                    try {
                        // Create line art SVG
                        const lineArtSvg = createLineArtSVG(adjustedData, threshold, smoothing, lineThickness, invertColors);
                        resolve(lineArtSvg);
                    } catch (error) {
                        console.error('Error creating line art:', error);
                        resolve(`<svg width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" xmlns="http://www.w3.org/2000/svg">
                            <text x="50%" y="50%" text-anchor="middle" fill="red">Error creating line art</text>
                        </svg>`);
                    }
                });
                
                const silhouettePromise = new Promise(resolve => {
                    try {
                        // Create silhouette SVG
                        const silhouetteSvg = createSilhouetteSVG(adjustedData, canvas.width, canvas.height, smoothing, invertColors);
                        resolve(silhouetteSvg);
                    } catch (error) {
                        console.error('Error creating silhouette:', error);
                        resolve(`<svg width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" xmlns="http://www.w3.org/2000/svg">
                            <text x="50%" y="50%" text-anchor="middle" fill="red">Error creating silhouette</text>
                        </svg>`);
                    }
                });
                
                // Wait for both to finish
                Promise.all([lineArtPromise, silhouettePromise]).then(([lineArtSvg, silhouetteSvg]) => {
                    // Store results
                    currentSvgData = lineArtSvg;
                    currentSilhouetteSvgData = silhouetteSvg;
                    
                    // Display results
                    svgPreview.innerHTML = lineArtSvg;
                    silhouettePreview.innerHTML = silhouetteSvg;
                    
                    // Enable download buttons
                    downloadBtn.disabled = false;
                    downloadSilhouetteBtn.disabled = false;
                    
                    // Calculate processing time
                    const endTime = performance.now();
                    const processingTime = Math.round(endTime - startTime);
                    
                    // Update status with timing information
                    updateStatus(`Processed in ${processingTime}ms`, false);
                    clearStatus();
                });
            } catch (error) {
                console.error('Error processing image:', error);
                svgPreview.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">
                    Error processing image: ${error.message}
                </div>`;
                silhouettePreview.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">
                    Error processing image: ${error.message}
                </div>`;
                downloadBtn.disabled = true;
                downloadSilhouetteBtn.disabled = true;
                updateStatus(`Error: ${error.message}`, false);
            } finally {
                // Re-enable the process button
                processBtn.disabled = false;
            }
        });
    }
    
    // Pre-process image to enhance edge detection
    function preprocessImage(imageData, blurRadius) {
        const width = imageData.width;
        const height = imageData.height;
        const data = new Uint8ClampedArray(imageData.data);
        const processedData = new ImageData(data, width, height);
        const processedPixels = processedData.data;
        
        // Apply Gaussian blur to reduce noise
        if (blurRadius > 0) {
            applyGaussianBlur(processedPixels, width, height, blurRadius);
        }
        
        // Enhance contrast
        enhanceContrast(processedPixels, width, height);
        
        // Apply unsharp masking for edge enhancement
        applyUnsharpMask(processedPixels, width, height);
        
        return processedData;
    }
    
    // Apply Gaussian blur to reduce noise
    function applyGaussianBlur(pixels, width, height, radius) {
        // Ensure radius is an integer for the algorithm
        const intRadius = Math.floor(radius);
        if (intRadius <= 0) return;
        
        // Create a temporary array to hold intermediate results
        const temp = new Uint8ClampedArray(pixels.length);
        
        // Copy original pixels to the temp array
        for (let i = 0; i < pixels.length; i++) {
            temp[i] = pixels[i];
        }
        
        // Horizontal pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0;
                let g = 0;
                let b = 0;
                let count = 0;
                
                for (let i = -intRadius; i <= intRadius; i++) {
                    const nx = Math.min(Math.max(x + i, 0), width - 1);
                    const idx = (y * width + nx) * 4;
                    
                    r += temp[idx];
                    g += temp[idx + 1];
                    b += temp[idx + 2];
                    count++;
                }
                
                const outIdx = (y * width + x) * 4;
                pixels[outIdx] = Math.round(r / count);
                pixels[outIdx + 1] = Math.round(g / count);
                pixels[outIdx + 2] = Math.round(b / count);
                // Don't modify alpha
            }
        }
        
        // Copy blurred pixels back to temp for the vertical pass
        for (let i = 0; i < pixels.length; i++) {
            temp[i] = pixels[i];
        }
        
        // Vertical pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0;
                let g = 0;
                let b = 0;
                let count = 0;
                
                for (let j = -intRadius; j <= intRadius; j++) {
                    const ny = Math.min(Math.max(y + j, 0), height - 1);
                    const idx = (ny * width + x) * 4;
                    
                    r += temp[idx];
                    g += temp[idx + 1];
                    b += temp[idx + 2];
                    count++;
                }
                
                const outIdx = (y * width + x) * 4;
                pixels[outIdx] = Math.round(r / count);
                pixels[outIdx + 1] = Math.round(g / count);
                pixels[outIdx + 2] = Math.round(b / count);
                // Don't modify alpha
            }
        }
    }
    
    // Apply unsharp masking to enhance edges
    function applyUnsharpMask(pixels, width, height) {
        // Create a temporary array for the blurred version
        const temp = new Uint8ClampedArray(pixels.length);
        for (let i = 0; i < pixels.length; i++) {
            temp[i] = pixels[i];
        }
        
        // Apply a small blur to temp
        applyGaussianBlur(temp, width, height, 1);
        
        // Apply unsharp mask: original + (original - blurred) * amount
        const amount = 0.8; // Strength of sharpening
        for (let i = 0; i < pixels.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                const diff = pixels[i + c] - temp[i + c];
                pixels[i + c] = Math.min(255, Math.max(0, pixels[i + c] + diff * amount));
            }
        }
    }
    
    // Enhance contrast in the image
    function enhanceContrast(pixels, width, height) {
        // Find min/max values
        let min = 255;
        let max = 0;
        
        for (let i = 0; i < pixels.length; i += 4) {
            const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
            min = Math.min(min, gray);
            max = Math.max(max, gray);
        }
        
        // Apply contrast stretching if range is sufficient
        if (max > min) {
            const range = max - min;
            const factor = 255 / range;
            
            for (let i = 0; i < pixels.length; i += 4) {
                for (let c = 0; c < 3; c++) {
                    pixels[i + c] = Math.min(255, Math.max(0, Math.round((pixels[i + c] - min) * factor)));
                }
            }
        }
    }
    
    // Enhanced edge detection with hysteresis thresholding 
    function enhancedEdgeDetection(imageData, threshold, sensitivity) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const edgeData = new Uint8Array(width * height);
        
        // Create grayscale image
        const grayData = new Uint8Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            grayData[i / 4] = gray;
        }
        
        // Apply Sobel operator for edge detection
        const gradientMagnitude = new Uint8Array(width * height);
        const gradientDirection = new Float32Array(width * height);
        
        // Compute gradients and their magnitudes
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                // 3x3 Sobel kernels
                const gx = -grayData[(y-1)*width + (x-1)] + grayData[(y-1)*width + (x+1)] +
                         -2*grayData[y*width + (x-1)] + 2*grayData[y*width + (x+1)] +
                         -grayData[(y+1)*width + (x-1)] + grayData[(y+1)*width + (x+1)];
                
                const gy = -grayData[(y-1)*width + (x-1)] - 2*grayData[(y-1)*width + x] - grayData[(y-1)*width + (x+1)] +
                          grayData[(y+1)*width + (x-1)] + 2*grayData[(y+1)*width + x] + grayData[(y+1)*width + (x+1)];
                
                // Calculate gradient magnitude and direction (multiply by sensitivity factor)
                const magnitude = Math.sqrt(gx * gx + gy * gy) * sensitivity;
                gradientMagnitude[idx] = Math.min(255, magnitude);
                gradientDirection[idx] = Math.atan2(gy, gx);
            }
        }
        
        // Hysteresis thresholding parameters
        const highThreshold = threshold;
        const lowThreshold = highThreshold * 0.5;
        
        // Step 1: Non-maximum suppression
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                const angle = gradientDirection[idx];
                const mag = gradientMagnitude[idx];
                
                // Round angle to nearest 45 degrees
                const sector = Math.round(8 * angle / (2 * Math.PI) + 8) % 8;
                
                let neighbor1, neighbor2;
                
                // Get neighbors in the gradient direction
                if (sector === 0 || sector === 4) { // Horizontal
                    neighbor1 = gradientMagnitude[idx - 1];
                    neighbor2 = gradientMagnitude[idx + 1];
                } else if (sector === 1 || sector === 5) { // Diagonal (top-right to bottom-left)
                    neighbor1 = gradientMagnitude[(y - 1) * width + (x + 1)];
                    neighbor2 = gradientMagnitude[(y + 1) * width + (x - 1)];
                } else if (sector === 2 || sector === 6) { // Vertical
                    neighbor1 = gradientMagnitude[(y - 1) * width + x];
                    neighbor2 = gradientMagnitude[(y + 1) * width + x];
                } else { // Diagonal (top-left to bottom-right)
                    neighbor1 = gradientMagnitude[(y - 1) * width + (x - 1)];
                    neighbor2 = gradientMagnitude[(y + 1) * width + (x + 1)];
                }
                
                // Non-maximum suppression
                if (mag >= neighbor1 && mag >= neighbor2) {
                    // Strong edges
                    if (mag >= highThreshold) {
                        edgeData[idx] = 2; // Strong edge
                    } 
                    // Weak edges
                    else if (mag >= lowThreshold) {
                        edgeData[idx] = 1; // Weak edge
                    }
                }
            }
        }
        
        // Step 2: Hysteresis - connect weak edges to strong edges
        const edgeResult = new Uint8Array(width * height);
        
        // First, copy strong edges to the result
        for (let i = 0; i < edgeData.length; i++) {
            if (edgeData[i] === 2) {
                edgeResult[i] = 1;
            }
        }
        
        // Helper function to check if a pixel is connected to a strong edge
        function isConnectedToStrongEdge(x, y) {
            // Check 8-connected neighbors
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    
                    const neighborIdx = ny * width + nx;
                    if (edgeResult[neighborIdx] === 1) {
                        return true;
                    }
                }
            }
            return false;
        }
        
        // Connect weak edges to strong edges
        let changed;
        do {
            changed = false;
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    if (edgeData[idx] === 1 && edgeResult[idx] === 0 && isConnectedToStrongEdge(x, y)) {
                        edgeResult[idx] = 1;
                        changed = true;
                    }
                }
            }
        } while (changed);
        
        return edgeResult;
    }
    
    // Improved morphological thinning
    function improvedThinning(edgeData, width, height) {
        const result = new Uint8Array(edgeData);
        const temp = new Uint8Array(width * height);
        let changed;
        
        // Zhang-Suen thinning algorithm with improvements
        do {
            changed = false;
            
            // First sub-iteration
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    
                    // Skip if not an edge pixel
                    if (result[idx] !== 1) continue;
                    
                    // Get 8-neighborhood
                    const p2 = result[(y - 1) * width + x];
                    const p3 = result[(y - 1) * width + (x + 1)];
                    const p4 = result[y * width + (x + 1)];
                    const p5 = result[(y + 1) * width + (x + 1)];
                    const p6 = result[(y + 1) * width + x];
                    const p7 = result[(y + 1) * width + (x - 1)];
                    const p8 = result[y * width + (x - 1)];
                    const p9 = result[(y - 1) * width + (x - 1)];
                    
                    // Count non-zero neighbors
                    const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9];
                    const numNonZero = neighbors.filter(n => n === 1).length;
                    
                    // Count transitions from 0 to 1
                    let transitions = 0;
                    for (let i = 0; i < 8; i++) {
                        transitions += (neighbors[i] === 0 && neighbors[(i + 1) % 8] === 1) ? 1 : 0;
                    }
                    
                    // Apply thinning criteria for first sub-iteration
                    if (numNonZero >= 2 && numNonZero <= 6 && transitions === 1 &&
                        p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0) {
                        temp[idx] = 0;
                        changed = true;
                    } else {
                        temp[idx] = result[idx];
                    }
                }
            }
            
            // Update result from temp
            for (let i = 0; i < result.length; i++) {
                result[i] = temp[i];
            }
            
            // Second sub-iteration
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    
                    // Skip if not an edge pixel
                    if (result[idx] !== 1) continue;
                    
                    // Get 8-neighborhood
                    const p2 = result[(y - 1) * width + x];
                    const p3 = result[(y - 1) * width + (x + 1)];
                    const p4 = result[y * width + (x + 1)];
                    const p5 = result[(y + 1) * width + (x + 1)];
                    const p6 = result[(y + 1) * width + x];
                    const p7 = result[(y + 1) * width + (x - 1)];
                    const p8 = result[y * width + (x - 1)];
                    const p9 = result[(y - 1) * width + (x - 1)];
                    
                    // Count non-zero neighbors
                    const neighbors = [p2, p3, p4, p5, p6, p7, p8, p9];
                    const numNonZero = neighbors.filter(n => n === 1).length;
                    
                    // Count transitions from 0 to 1
                    let transitions = 0;
                    for (let i = 0; i < 8; i++) {
                        transitions += (neighbors[i] === 0 && neighbors[(i + 1) % 8] === 1) ? 1 : 0;
                    }
                    
                    // Apply thinning criteria for second sub-iteration
                    if (numNonZero >= 2 && numNonZero <= 6 && transitions === 1 &&
                        p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0) {
                        temp[idx] = 0;
                        changed = true;
                    } else {
                        temp[idx] = result[idx];
                    }
                }
            }
            
            // Update result from temp
            for (let i = 0; i < result.length; i++) {
                result[i] = temp[i];
            }
            
        } while (changed);
        
        return result;
    }
    
    // Clean up isolated pixels and small segments
    function cleanupIsolatedPixels(edgeData, width, height) {
        const result = new Uint8Array(edgeData);
        
        // Remove isolated pixels or small segments (pixels with fewer than 2 neighbors)
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                if (result[idx] !== 1) continue;
                
                // Count neighbors
                let neighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                        
                        const neighborIdx = ny * width + nx;
                        if (result[neighborIdx] === 1) {
                            neighbors++;
                        }
                    }
                }
                
                // Remove pixels with fewer than 2 neighbors
                if (neighbors < 2) {
                    result[idx] = 0;
                }
            }
        }
        
        return result;
    }
    
    // Enhanced path tracing with improved SVG generation
    function improvedPathTracing(edgeData, width, height, smoothing, lineThickness, invertColors) {
        // Find edge points
        const edgePoints = findEdgePoints(edgeData, width, height);
        
        // Connect edge points into continuous lines with improved algorithm
        const lines = improvedConnectEdgePoints(edgePoints, width, height);
        
        // Create optimized SVG
        return createOptimizedSVG(lines, width, height, smoothing, lineThickness, invertColors);
    }
    
    // Find all edge points
    function findEdgePoints(edgeData, width, height) {
        const points = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (edgeData[idx] === 1) {
                    points.push({ x, y });
                }
            }
        }
        
        return points;
    }
    
    // Improved algorithm to connect edge points into continuous lines
    function improvedConnectEdgePoints(points, width, height) {
        if (points.length === 0) return [];
        
        // Create a grid to quickly find neighboring points
        const grid = Array(height).fill().map(() => Array(width).fill(null));
        for (const point of points) {
            grid[point.y][point.x] = point;
        }
        
        // Helper to generate a unique key for a point
        const pointKey = (x, y) => `${x},${y}`;
        
        // Create a map to store junction points (points with more than 2 neighbors)
        const junctionPoints = new Set();
        
        // Identify junction points
        for (const point of points) {
            const neighbors = getPointNeighbors(point.x, point.y, grid);
            if (neighbors.length > 2) {
                junctionPoints.add(pointKey(point.x, point.y));
            }
        }
        
        // Track visited points
        const visited = new Set();
        const lines = [];
        
        // Function to get all neighbors of a point
        function getPointNeighbors(x, y, grid) {
            const neighbors = [];
            
            // Check 8-connected neighbors
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = x + dx;
                    const ny = y + dy;
                    
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    
                    if (grid[ny][nx]) {
                        neighbors.push(grid[ny][nx]);
                    }
                }
            }
            
            return neighbors;
        }
        
        // Find best line starting points: prefer junction points or endpoints
        const startPoints = [];
        
        // First add junction points
        for (const point of points) {
            const key = pointKey(point.x, point.y);
            if (junctionPoints.has(key)) {
                startPoints.push(point);
            }
        }
        
        // Then add endpoints (points with only one neighbor)
        for (const point of points) {
            const key = pointKey(point.x, point.y);
            if (!junctionPoints.has(key)) {
                const neighbors = getPointNeighbors(point.x, point.y, grid);
                if (neighbors.length === 1) {
                    startPoints.push(point);
                }
            }
        }
        
        // If no special points found, use any unvisited point
        if (startPoints.length === 0) {
            for (const point of points) {
                const key = pointKey(point.x, point.y);
                if (!visited.has(key)) {
                    startPoints.push(point);
                    break;
                }
            }
        }
        
        // Process all start points to create lines
        for (const startPoint of startPoints) {
            // Process all unvisited directions from this junction
            const neighbors = getPointNeighbors(startPoint.x, startPoint.y, grid);
            
            for (const neighbor of neighbors) {
                const neighborKey = pointKey(neighbor.x, neighbor.y);
                
                if (visited.has(neighborKey)) continue;
                
                // Start a new line
                const line = [{ x: startPoint.x, y: startPoint.y }, { x: neighbor.x, y: neighbor.y }];
                visited.add(pointKey(startPoint.x, startPoint.y));
                visited.add(neighborKey);
                
                // Continue the line until we reach a junction or endpoint
                let currentPoint = neighbor;
                let keepGoing = true;
                
                while (keepGoing) {
                    const currentNeighbors = getPointNeighbors(currentPoint.x, currentPoint.y, grid)
                        .filter(p => !visited.has(pointKey(p.x, p.y)));
                    
                    if (currentNeighbors.length === 1) {
                        // Continue the line
                        const nextPoint = currentNeighbors[0];
                        line.push({ x: nextPoint.x, y: nextPoint.y });
                        visited.add(pointKey(nextPoint.x, nextPoint.y));
                        currentPoint = nextPoint;
                    } else {
                        // We've reached a junction or an endpoint
                        keepGoing = false;
                    }
                }
                
                if (line.length > 1) {
                    lines.push(line);
                }
            }
        }
        
        // Process any remaining points
        for (const point of points) {
            const key = pointKey(point.x, point.y);
            if (!visited.has(key)) {
                const neighbors = getPointNeighbors(point.x, point.y, grid)
                    .filter(p => !visited.has(pointKey(p.x, p.y)));
                
                if (neighbors.length > 0) {
                    // Start a new line
                    const line = [{ x: point.x, y: point.y }, { x: neighbors[0].x, y: neighbors[0].y }];
                    visited.add(key);
                    visited.add(pointKey(neighbors[0].x, neighbors[0].y));
                    
                    // Continue the line
                    let currentPoint = neighbors[0];
                    
                    while (true) {
                        const currentNeighbors = getPointNeighbors(currentPoint.x, currentPoint.y, grid)
                            .filter(p => !visited.has(pointKey(p.x, p.y)));
                        
                        if (currentNeighbors.length === 1) {
                            // Continue the line
                            const nextPoint = currentNeighbors[0];
                            line.push({ x: nextPoint.x, y: nextPoint.y });
                            visited.add(pointKey(nextPoint.x, nextPoint.y));
                            currentPoint = nextPoint;
                        } else {
                            // We've reached a junction or an endpoint
                            break;
                        }
                    }
                    
                    if (line.length > 1) {
                        lines.push(line);
                    }
                } else {
                    // Isolated point
                    visited.add(key);
                }
            }
        }
        
        return lines;
    }
    
    // Create optimized SVG with improved path simplification
    function createOptimizedSVG(lines, width, height, smoothing, lineThickness, invertColors) {
        // Calculate improved simplification parameter based on smoothing slider
        const epsilon = 1.5 - smoothing * 1.4; // Enhanced smoothing effect
        
        // Set stroke color based on invert setting
        const strokeColor = invertColors ? 'white' : 'black';
        
        // Check if we're creating for display or export (SVG preview has parent)
        const isForDisplay = svgPreview.innerHTML === '<div style="text-align: center; padding: 20px;">Processing...</div>' ||
                            svgPreview.innerHTML === '';
        
        // SVG header with transparency (no background)
        let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Add a background only for display in UI, not for export
        if (isForDisplay) {
            const backgroundColor = invertColors ? 'black' : 'white';
            svgContent += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;
        }
        
        // Generate path for each line with enhanced smoothing
        for (const line of lines) {
            if (line.length < 2) continue;
            
            // Apply more aggressive smoothing for longer lines
            const adaptiveEpsilon = epsilon * (1 + Math.min(0.5, line.length / 300));
            
            // Simplify the line using improved Ramer-Douglas-Peucker algorithm
            const simplified = simplifyLine(line, adaptiveEpsilon);
            
            if (simplified.length < 2) continue;
            
            // Convert line to SVG path
            const pathData = createPathData(simplified);
            
            // Add path to SVG with smoother stroke-linejoin
            svgContent += `<path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="${lineThickness}" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
        
        // Close SVG
        svgContent += '</svg>';
        
        return svgContent;
    }
    
    // Create SVG path data from points with smooth Bezier curves
    function createPathData(points) {
        if (points.length < 2) return '';
        
        // For very short paths, just use a line
        if (points.length < 3) {
            return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
        }
        
        // Use Bezier curves for longer paths
        let pathData = `M${points[0].x},${points[0].y}`;
        
        // Use cubic Bezier curves for smoother paths
        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1];
            
            // For very close points, just use a line segment
            if (Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y) < 3) {
                pathData += ` L${curr.x},${curr.y}`;
                continue;
            }
            
            // Calculate control points for smooth curve
            // Use tension parameter to control curve smoothness
            const tension = 0.33; // Lower value = smoother curve
            
            // Direction vectors
            const dx1 = curr.x - prev.x;
            const dy1 = curr.y - prev.y;
            const dx2 = next.x - curr.x;
            const dy2 = next.y - curr.y;
            
            // Calculate control points
            // First control point (based on previous and current points)
            const cp1x = curr.x - dx1 * tension;
            const cp1y = curr.y - dy1 * tension;
            
            // Second control point (based on current and next points)
            const cp2x = curr.x + dx2 * tension;
            const cp2y = curr.y + dy2 * tension;
            
            // Add cubic Bezier curve command
            pathData += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
            
            // Skip the next point since we already used it as endpoint
            i++;
        }
        
        // Add the last segment if needed
        if (points.length > 2 && pathData.indexOf(points[points.length - 1].x) === -1) {
            pathData += ` L${points[points.length - 1].x},${points[points.length - 1].y}`;
        }
        
        return pathData;
    }
    
    // Simplify a line using improved Ramer-Douglas-Peucker algorithm with curve fitting
    function simplifyLine(line, epsilon) {
        if (line.length <= 2) return line;
        
        // Find the point with the maximum distance
        let maxDistance = 0;
        let index = 0;
        
        const firstPoint = line[0];
        const lastPoint = line[line.length - 1];
        
        for (let i = 1; i < line.length - 1; i++) {
            const distance = pointToLineDistance(line[i], firstPoint, lastPoint);
            if (distance > maxDistance) {
                maxDistance = distance;
                index = i;
            }
        }
        
        // Recursively simplify the line
        if (maxDistance > epsilon) {
            const firstHalf = simplifyLine(line.slice(0, index + 1), epsilon);
            const secondHalf = simplifyLine(line.slice(index), epsilon);
            
            // Combine the results (avoiding duplicate points)
            return firstHalf.slice(0, -1).concat(secondHalf);
        }
        
        // Enhanced smoothing: Apply additional smoothing for lines with many points
        if (line.length > 10) {
            // Apply a light Gaussian smoothing to the points
            return applyLightSmoothing(line);
        }
        
        return [firstPoint, lastPoint];
    }
    
    // Apply light Gaussian smoothing to a path
    function applyLightSmoothing(points) {
        if (points.length <= 3) return points;
        
        // Keep endpoints unchanged
        const result = [points[0]];
        
        // Apply Gaussian-like smoothing to inner points
        for (let i = 1; i < points.length - 1; i++) {
            // Weights for neighboring points (current point has highest weight)
            const weights = [0.25, 0.5, 0.25];
            let smoothX = 0;
            let smoothY = 0;
            
            // Apply weighted average (3-point kernel)
            for (let j = -1; j <= 1; j++) {
                const idx = Math.max(0, Math.min(points.length - 1, i + j));
                smoothX += points[idx].x * weights[j + 1];
                smoothY += points[idx].y * weights[j + 1];
            }
            
            result.push({ x: Math.round(smoothX), y: Math.round(smoothY) });
        }
        
        // Add the last point
        result.push(points[points.length - 1]);
        
        return result;
    }
    
    // Calculate the perpendicular distance from a point to a line
    function pointToLineDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        
        const numerator = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
        const denominator = Math.sqrt(dx * dx + dy * dy);
        
        return numerator / denominator;
    }
    
    // Binarize image into black and white with noise reduction
    function binarizeImage(imageData, threshold) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const binaryData = new Uint8Array(width * height);
        
        // First pass: convert to binary based on threshold
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            
            // Set pixel to 1 if below threshold (dark), 0 if above (light)
            binaryData[i / 4] = gray < threshold ? 1 : 0;
        }
        
        // Apply noise removal for very complex images
        const pixelCount = width * height;
        const blackPixels = Array.from(binaryData).filter(p => p === 1).length;
        const blackPercentage = (blackPixels / pixelCount) * 100;
        
        // If image is very complex (>25% black or <75% black but lots of pixels),
        // apply additional noise reduction
        if (blackPercentage > 25 || (blackPercentage > 5 && blackPixels > 10000)) {
            console.log(`Applying noise reduction: ${blackPercentage.toFixed(1)}% black pixels`);
            applyNoiseReduction(binaryData, width, height);
        }
        
        return {
            data: binaryData,
            width: width,
            height: height
        };
    }
    
    // Apply noise reduction to binary image
    function applyNoiseReduction(binaryData, width, height) {
        // Create a copy of the data for reading
        const tempData = new Uint8Array(binaryData);
        
        // Remove isolated pixels (pixels with less than 2 neighbors)
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                
                // Skip if not a black pixel
                if (tempData[idx] !== 1) continue;
                
                // Count black neighbors
                let neighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const nx = x + dx;
                        const ny = y + dy;
                        const nidx = ny * width + nx;
                        
                        if (tempData[nidx] === 1) {
                            neighbors++;
                        }
                    }
                }
                
                // Remove isolated pixels
                if (neighbors < 2) {
                    binaryData[idx] = 0;
                }
            }
        }
    }
    
    // Find contours of solid shapes for silhouette mode
    function findShapeContours(binaryData) {
        const width = binaryData.width;
        const height = binaryData.height;
        const data = binaryData.data;
        const visited = new Uint8Array(width * height);
        const contours = [];
        
        // Helper function to trace a contour
        function traceContour(startX, startY) {
            const contour = [];
            let x = startX;
            let y = startY;
            let direction = 0; // 0: right, 1: down, 2: left, 3: up
            
            // Directions: right, down, left, up
            const dx = [1, 0, -1, 0];
            const dy = [0, 1, 0, -1];
            
            // Moore neighborhood tracing
            let first = true;
            let initialDirection = direction;
            
            // Safety guard to prevent infinite loops
            let maxIterations = width * height; // Maximum possible iterations
            let iterations = 0;
            
            do {
                // Safety check to prevent infinite loops
                iterations++;
                if (iterations > maxIterations) {
                    console.warn('Contour tracing aborted: exceeded max iterations');
                    break;
                }
                
                if (!first && x === startX && y === startY && direction === initialDirection) {
                    break;
                }
                
                // Only add point if it's valid and not already in contour
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    contour.push({ x, y });
                    visited[y * width + x] = 1;
                }
                
                // Check if we can turn left (counter-clockwise)
                let newDirection = (direction + 3) % 4;
                let nx = x + dx[newDirection];
                let ny = y + dy[newDirection];
                
                // Try all directions counter-clockwise
                let found = false;
                for (let i = 0; i < 4; i++) {
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height && data[ny * width + nx] === 1) {
                        found = true;
                        break;
                    }
                    
                    // Try next direction clockwise
                    newDirection = (newDirection + 1) % 4;
                    nx = x + dx[newDirection];
                    ny = y + dy[newDirection];
                }
                
                if (found) {
                    direction = newDirection;
                    x = nx;
                    y = ny;
                } else {
                    // Couldn't find next pixel, terminate contour
                    break;
                }
                
                first = false;
            } while (true);
            
            return contour;
        }
        
        // Find starting points for contours
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (data[idx] === 1 && visited[idx] === 0) {
                    try {
                        // Found an unvisited pixel that belongs to a shape
                        const contour = traceContour(x, y);
                        if (contour.length > 4) { // Minimum size to avoid noise
                            contours.push(contour);
                        }
                    } catch (e) {
                        console.error('Error tracing contour:', e);
                        // Continue with other contours
                    }
                }
            }
        }
        
        return contours;
    }
    
    // Create line art SVG from image
    function createLineArtSVG(imageData, threshold, smoothing, lineThickness, invertColors) {
        // Pre-process the image for better edge detection
        const processedData = preprocessImage(imageData, imageData.blurRadius || 1);
        
        // Detect edges to create line art
        const edgeData = enhancedEdgeDetection(processedData, threshold, edgeSensitivitySlider.value);
        
        // Thin the edges for clean lines
        const thinnedEdges = improvedThinning(edgeData, processedData.width, processedData.height);
        
        // Clean up isolated pixels and small segments
        const cleanedEdges = cleanupIsolatedPixels(thinnedEdges, processedData.width, processedData.height);
        
        // Trace the edges to generate SVG paths
        return improvedPathTracing(cleanedEdges, imageData.width, imageData.height, smoothing, lineThickness, invertColors);
    }
    
    // Create silhouette SVG from image
    function createSilhouetteSVG(imageData, width, height, smoothing, invertColors) {
        // Process the image differently for silhouette mode
        const binaryData = binarizeImage(imageData, thresholdSlider.value);
        
        // Evaluate image complexity to choose processing method
        const pixelCount = width * height;
        const blackPixels = Array.from(binaryData.data).filter(p => p === 1).length;
        const complexity = (blackPixels / pixelCount) * 100;
        
        // For complex images (>10% black pixels or large images), use direct pixel approach
        if (complexity > 10 || pixelCount > 250000) {
            console.log(`Using direct pixel approach for complex image: ${complexity.toFixed(1)}% black pixels`);
            return createSimplifiedSilhouetteSVG(binaryData, width, height, invertColors);
        } else {
            // For simpler images, try contour approach first with fallback
            try {
                return createDetailedSilhouetteSVG(binaryData, width, height, smoothing, invertColors);
            } catch (e) {
                console.error('Error with contour approach, falling back to direct method:', e);
                return createSimplifiedSilhouetteSVG(binaryData, width, height, invertColors);
            }
        }
    }
    
    // Create detailed SVG with filled shapes for silhouette mode (renamed from the original)
    function createDetailedSilhouetteSVG(binaryData, width, height, smoothing, invertColors) {
        try {
            // Find all contours (outlines of shapes)
            const contours = findShapeContours(binaryData);
            
            // Safety check - if no contours found or too many (potential error), fall back to simple approach
            if (contours.length === 0 || contours.length > 1000) {
                console.warn(`Abnormal contour count: ${contours.length}. Using simplified approach.`);
                return createSimplifiedSilhouetteSVG(binaryData, width, height, invertColors);
            }
            
            // Simplify contours with error handling
            const simplifiedContours = [];
            const epsilon = 1.5 - smoothing * 1.4;
            
            for (const contour of contours) {
                try {
                    // Skip contours that are too large (likely errors)
                    if (contour.length > width * height / 10) {
                        console.warn(`Skipping oversized contour with ${contour.length} points`);
                        continue;
                    }
                    
                    const simplified = simplifyLine(contour, epsilon);
                    if (simplified.length >= 3) {
                        simplifiedContours.push(simplified);
                    }
                } catch (e) {
                    console.error('Error simplifying contour:', e);
                    // Continue with other contours
                }
            }
            
            // Set colors
            const fillColor = invertColors ? 'white' : 'black';
            const backgroundColor = invertColors ? 'black' : 'white';
            
            // Check if we're creating for display or export
            const isForDisplay = true; // Always true for preview (export is handled separately)
            
            // Create SVG
            let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
            
            // Add background only for display
            if (isForDisplay) {
                svgContent += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;
            }
            
            // Add a path for each contour
            for (const contour of simplifiedContours) {
                try {
                    // Create SVG path
                    const pathData = createSilhouettePathData(contour);
                    if (pathData) {
                        svgContent += `<path d="${pathData}" fill="${fillColor}" />`;
                    }
                } catch (e) {
                    console.error('Error creating path data:', e);
                    // Continue with other contours
                }
            }
            
            // Close SVG
            svgContent += '</svg>';
            
            return svgContent;
        } catch (e) {
            console.error('Error in silhouette SVG creation:', e);
            // Fall back to simplified approach
            return createSimplifiedSilhouetteSVG(binaryData, width, height, invertColors);
        }
    }
    
    // Simplified fallback approach for silhouette mode
    function createSimplifiedSilhouetteSVG(binaryData, width, height, invertColors) {
        const fillColor = invertColors ? 'white' : 'black';
        const backgroundColor = invertColors ? 'black' : 'white';
        
        // Check if we're creating for display or export
        const isForDisplay = true; // Always true for preview
        
        // Create SVG
        let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        // Add background only for display
        if (isForDisplay) {
            svgContent += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;
        }
        
        // For large images, use a more efficient approach by grouping pixels
        const isLargeImage = width * height > 100000;
        
        if (isLargeImage) {
            // Use path-based approach for large images - much more efficient than rectangles
            svgContent += createBinaryImagePaths(binaryData, fillColor);
        } else {
            // Create direct pixel-based paths for smaller images
            // Group pixels into rows for more efficient paths
            const data = binaryData.data;
            
            for (let y = 0; y < height; y++) {
                let rowStart = -1;
                
                for (let x = 0; x <= width; x++) {
                    const isPixelFilled = x < width && data[y * width + x] === 1;
                    
                    if (isPixelFilled && rowStart === -1) {
                        // Start of a new segment
                        rowStart = x;
                    } else if (!isPixelFilled && rowStart !== -1) {
                        // End of a segment, add a rectangle for this row segment
                        const rectWidth = x - rowStart;
                        if (rectWidth > 0) {
                            svgContent += `<rect x="${rowStart}" y="${y}" width="${rectWidth}" height="1" fill="${fillColor}" />`;
                        }
                        rowStart = -1;
                    }
                }
            }
        }
        
        // Close SVG
        svgContent += '</svg>';
        
        return svgContent;
    }
    
    // Create optimized paths for binary image data
    function createBinaryImagePaths(binaryData, fillColor) {
        const width = binaryData.width;
        const height = binaryData.height;
        const data = binaryData.data;
        
        // To improve performance, we'll sample the image at a lower resolution
        // if it's very large
        const pixelCount = width * height;
        const scale = pixelCount > 500000 ? 2 : 1; // Downsample very large images
        
        let pathsContent = '';
        
        // Process the image in chunks to avoid memory issues
        const chunkSize = 40; // Process in chunks of rows
        
        for (let chunkY = 0; chunkY < height; chunkY += chunkSize) {
            const endY = Math.min(chunkY + chunkSize, height);
            
            // Create paths for this chunk
            let chunkPaths = '';
            
            // Group pixels into horizontal lines first
            const horizontalLines = [];
            
            for (let y = chunkY; y < endY; y += scale) {
                let lineStart = -1;
                
                for (let x = 0; x <= width; x += scale) {
                    const isPixelFilled = x < width && data[y * width + x] === 1;
                    
                    if (isPixelFilled && lineStart === -1) {
                        lineStart = x;
                    } else if ((!isPixelFilled || x === width) && lineStart !== -1) {
                        // End of a line
                        horizontalLines.push({
                            y: y,
                            x1: lineStart,
                            x2: x - (x === width && isPixelFilled ? 0 : scale)
                        });
                        lineStart = -1;
                    }
                }
            }
            
            // Group adjacent horizontal lines into rectangles/polygons
            let currentRect = null;
            const rectangles = [];
            
            for (let i = 0; i < horizontalLines.length; i++) {
                const line = horizontalLines[i];
                
                if (!currentRect) {
                    // Start a new rectangle
                    currentRect = {
                        y1: line.y,
                        y2: line.y + scale,
                        x1: line.x1,
                        x2: line.x2
                    };
                } else if (line.y === currentRect.y2 && line.x1 === currentRect.x1 && line.x2 === currentRect.x2) {
                    // Extend the current rectangle
                    currentRect.y2 = line.y + scale;
                } else {
                    // Complete the current rectangle and start a new one
                    rectangles.push(currentRect);
                    currentRect = {
                        y1: line.y,
                        y2: line.y + scale,
                        x1: line.x1,
                        x2: line.x2
                    };
                }
            }
            
            // Add the last rectangle if there is one
            if (currentRect) {
                rectangles.push(currentRect);
            }
            
            // Create path elements for the rectangles
            for (const rect of rectangles) {
                chunkPaths += `<rect x="${rect.x1}" y="${rect.y1}" width="${rect.x2 - rect.x1}" height="${rect.y2 - rect.y1}" fill="${fillColor}" />`;
            }
            
            pathsContent += chunkPaths;
        }
        
        return pathsContent;
    }
    
    // Create path data for filled shapes
    function createSilhouettePathData(points) {
        if (!points || points.length < 3) return '';
        
        try {
            let pathData = `M${points[0].x},${points[0].y}`;
            
            // Use quadratic Bezier curves for smoother contours
            // For very complex paths, limit the number of points to prevent browser crashes
            const maxPoints = 1000;
            const step = points.length > maxPoints ? Math.ceil(points.length / maxPoints) : 1;
            
            // Filter points to prevent performance issues with very large paths
            const filteredPoints = [];
            for (let i = 0; i < points.length; i += step) {
                filteredPoints.push(points[i]);
            }
            
            // Make sure the last point is included
            if (filteredPoints[filteredPoints.length - 1] !== points[points.length - 1]) {
                filteredPoints.push(points[points.length - 1]);
            }
            
            // Create bezier curves from the filtered points
            for (let i = 1; i < filteredPoints.length - 1; i += 2) {
                const current = filteredPoints[i];
                const next = filteredPoints[i + 1] || filteredPoints[0]; // Close the path if needed
                
                // Safety check for valid coordinates
                if (!isValidCoordinate(current) || !isValidCoordinate(next)) {
                    continue;
                }
                
                if (i + 1 < filteredPoints.length) {
                    pathData += ` Q${current.x},${current.y} ${next.x},${next.y}`;
                } else {
                    pathData += ` L${current.x},${current.y}`;
                }
            }
            
            // Close the path
            pathData += ' Z';
            
            return pathData;
        } catch (e) {
            console.error('Error creating silhouette path data:', e);
            return '';
        }
    }
    
    // Helper function to check if a coordinate is valid
    function isValidCoordinate(point) {
        return point && 
               typeof point.x === 'number' && !isNaN(point.x) && isFinite(point.x) &&
               typeof point.y === 'number' && !isNaN(point.y) && isFinite(point.y);
    }
});

// Optional: Implement drag and drop functionality
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
