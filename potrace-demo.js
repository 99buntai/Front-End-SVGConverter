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
    function clearStatus(delay = 5000) {
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
        }, 100);
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
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(originalImage, 0, 0);
                originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Display the image
                displayOriginalImage();
                
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
        
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
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
            const svgData = type === 'line' ? currentSvgData : currentSilhouetteSvgData;
            if (!svgData) throw new Error("No SVG data found");
            
            // Get the SVG element directly
            const svgElement = type === 'line' ? 
                svgPreview.querySelector('svg') : 
                silhouettePreview.querySelector('svg');
                
            if (!svgElement) {
                throw new Error("No SVG element found");
            }
            
            // For silhouette from Potrace
            if (type === 'silhouette') {
                // Create a clean SVG for download
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgData, 'image/svg+xml');
                const svgElement = svgDoc.querySelector('svg');
                
                if (!svgElement) {
                    throw new Error("Could not parse SVG for download");
                }
                
                // Get all paths (the actual content)
                const paths = svgDoc.querySelectorAll('path');
                
                // Create a fresh SVG with just the paths
                const cleanSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                
                // Copy attributes from original SVG
                for (const attr of Array.from(svgElement.attributes)) {
                    cleanSvg.setAttribute(attr.name, attr.value);
                }
                
                // Set the fill color based on invert setting
                const fillColor = invertColorsToggle.checked ? 'black' : 'white';
                
                // Add paths to clean SVG
                for (const path of paths) {
                    const clonedPath = path.cloneNode(true);
                    // Set the fill color (invert color applies to silhouette too)
                    clonedPath.setAttribute('fill', fillColor);
                    // Remove any stroke
                    clonedPath.removeAttribute('stroke');
                    cleanSvg.appendChild(clonedPath);
                }
                
                // Serialize to string
                const serializer = new XMLSerializer();
                const finalSvgString = serializer.serializeToString(cleanSvg);
                
                // Create download
                downloadSvgFile(finalSvgString, 'silhouette.svg');
                return;
            }
            
            // For line art SVG
            const clonedSvg = svgElement.cloneNode(true);
            
            // Get parameters
            const width = Number.parseInt(clonedSvg.getAttribute('width'));
            const height = Number.parseInt(clonedSvg.getAttribute('height'));
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
                    (Number.parseInt(firstElement.getAttribute('width')) === width) && 
                    (Number.parseInt(firstElement.getAttribute('height')) === height)) {
                    startIndex = 1;
                }
            }
            
            // Add all elements except background to the clean SVG
            for (let i = startIndex; i < elements.length; i++) {
                const element = elements[i].cloneNode(true);
                
                // For line art, ensure paths have no fill
                    if (element.tagName.toLowerCase() === 'path') {
                        element.setAttribute('fill', 'none');
                        element.setAttribute('stroke', strokeColor);
                        element.setAttribute('stroke-width', lineThickness);
                        element.setAttribute('stroke-linecap', 'round');
                        element.setAttribute('stroke-linejoin', 'round');
                }
                
                cleanSvg.appendChild(element);
            }
            
            // Serialize the SVG to string
            const serializer = new XMLSerializer();
            const cleanSvgString = serializer.serializeToString(cleanSvg);
            
            // Create download
            downloadSvgFile(cleanSvgString, 'lineart.svg');
        } catch (error) {
            console.error(`Error downloading ${type} SVG:`, error);
            updateStatus(`Download error: ${error.message}`, false);
        }
    }
    
    // Helper function to download SVG file
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
    
    // Process the image to generate SVG
    function processImage() {
        if (!originalImage || !originalImageData) return;
        
        // Add a "processing" indicator
        updateStatus('Processing...');
        svgPreview.innerHTML = '<div style="text-align: center; padding: 20px;">Processing...</div>';
        silhouettePreview.innerHTML = '<div style="text-align: center; padding: 20px;">Processing...</div>';
        
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
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
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
                // Process line art using Potrace in curve mode
                const lineArtPromise = processLineArtWithPotrace(canvas, threshold, invertColors, blurRadius, lineThickness, smoothing, edgeSensitivity)
                    .catch(error => {
                        console.error('Error in line art processing:', error);
                        return createErrorSvg(`Error generating line art: ${error.message}`, canvas.width, canvas.height);
                    });
                
                // Process silhouette using Potrace - a more efficient implementation
                const silhouettePromise = processSilhouette(canvas, threshold, invertColors, blurRadius, smoothing, edgeSensitivity)
                    .catch(error => {
                        console.error('Error in silhouette processing:', error);
                        return createErrorSvg(`Error generating silhouette: ${error.message}`, canvas.width, canvas.height);
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
                handleProcessingError(error, canvas.width, canvas.height);
            }
        });
    }
    
    // Process line art using Potrace in curve mode
    function processLineArtWithPotrace(canvas, threshold, invertColors, blurRadius = 0, lineThickness = 1, smoothing = 0.5, sensitivity = 1.8) {
        // Create a canvas for Potrace input
        const potraceCanvas = document.createElement('canvas');
        const potraceCtx = potraceCanvas.getContext('2d', { willReadFrequently: true });
        
        // Set correct dimensions
        potraceCanvas.width = canvas.width;
        potraceCanvas.height = canvas.height;
        
        // Draw the source canvas to our working canvas
        potraceCtx.drawImage(canvas, 0, 0, potraceCanvas.width, potraceCanvas.height);
        
        // Get image data for processing
        let imageData = potraceCtx.getImageData(0, 0, potraceCanvas.width, potraceCanvas.height);
        
        // Apply blur if radius > 0
        if (blurRadius > 0) {
            const pixels = imageData.data;
            applyGaussianBlur(pixels, potraceCanvas.width, potraceCanvas.height, blurRadius);
            // Re-apply to canvas after blur
            potraceCtx.putImageData(imageData, 0, 0);
            // Get the updated image data
            imageData = potraceCtx.getImageData(0, 0, potraceCanvas.width, potraceCanvas.height);
        }
        
        // Create binary image data with threshold
        const binaryData = new Uint8ClampedArray(imageData.data.length);
        
        // Apply threshold to create binary image
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            
            // Convert to grayscale
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Apply threshold
            const isBlack = gray < threshold;
            
            // Set pixel value (consider invert setting)
            const pixelValue = invertColors ? !isBlack : isBlack;
            
            // Set all channels to black or white
            const value = pixelValue ? 0 : 255;
            binaryData[i] = value;
            binaryData[i + 1] = value;
            binaryData[i + 2] = value;
            binaryData[i + 3] = 255; // Full alpha
        }
        
        // Put binary image back to canvas
        potraceCtx.putImageData(new ImageData(binaryData, potraceCanvas.width, potraceCanvas.height), 0, 0);
        
        // Map sensitivity (0.8-5.0) to turdsize (1-10), inverse relationship
        // Higher sensitivity = less noise removal
        const turdsize = Math.round(10 - (sensitivity * 2));
        
        // Map smoothing (0-1.0) to opttolerance (0.1-1.0)
        // Higher smoothing = higher tolerance for curve optimization
        const opttolerance = 0.1 + (smoothing * 0.9);
        
        // Configure Potrace parameters with user slider values
        Potrace.setParameter({
            turdsize: Math.max(1, Math.min(10, turdsize)),    // Adjust speckle threshold based on sensitivity
            alphamax: 1.0,                                   // Corner threshold
            optcurve: true,                                 // Always optimize curves
            opttolerance: opttolerance,                    // Tolerance based on smoothing 
            turnpolicy: "minority"                        // Path decomposition approach
        });
        
        // Process with Potrace
        Potrace.loadImageFromCanvas(potraceCanvas);
        
        return new Promise((resolve, reject) => {
            try {
                Potrace.process(() => {
                    try {
                        // Get SVG with "curve" mode for line art (strokes, not fills)
                        const svgData = Potrace.getSVG(1, "curve");
                        
                        // Fix SVG viewBox if needed
                        let fixedSvg = svgData;
                        const widthMatch = svgData.match(/width="([^"]+)"/);
                        const heightMatch = svgData.match(/height="([^"]+)"/);
                        
                        if (widthMatch && heightMatch) {
                            const svgWidth = Number.parseFloat(widthMatch[1]);
                            const svgHeight = Number.parseFloat(heightMatch[1]);
                            
                            // Add viewBox if missing
                            if (svgData.indexOf('viewBox') === -1) {
                                fixedSvg = svgData.replace('<svg', `<svg viewBox="0 0 ${svgWidth} ${svgHeight}"`);
                            }
                        }
                        
                        // Handle inverted colors and line thickness
                        const strokeColor = invertColors ? 'white' : 'black';
                        fixedSvg = fixedSvg.replace('stroke="black"', `stroke="${strokeColor}" stroke-width="${lineThickness}" stroke-linecap="round" stroke-linejoin="round"`);
                        
                        // Add background for display if inverted
                        if (invertColors) {
                            fixedSvg = fixedSvg.replace('<path', `<rect width="100%" height="100%" fill="black"/><path`);
                        }
                        
                        resolve(fixedSvg);
                    } catch (error) {
                        console.error("Error generating line art SVG with Potrace:", error);
                        reject(error);
                    }
                });
            } catch (error) {
                console.error("Error processing line art with Potrace:", error);
                reject(error);
            }
        });
    }
    
    // Process silhouette using Potrace - a more efficient implementation
    function processSilhouette(canvas, threshold, invertColors, blurRadius = 0, smoothing = 0.5, sensitivity = 1.8) {
        // Create a canvas for Potrace input
        const potraceCanvas = document.createElement('canvas');
        const potraceCtx = potraceCanvas.getContext('2d', { willReadFrequently: true });
        
        // Set correct dimensions
        potraceCanvas.width = canvas.width;
        potraceCanvas.height = canvas.height;
        
        // Draw the source canvas to our working canvas
        potraceCtx.drawImage(canvas, 0, 0, potraceCanvas.width, potraceCanvas.height);
        
        // Get image data for processing
        let imageData = potraceCtx.getImageData(0, 0, potraceCanvas.width, potraceCanvas.height);
        
        // Apply blur if radius > 0
        if (blurRadius > 0) {
            const pixels = imageData.data;
            applyGaussianBlur(pixels, potraceCanvas.width, potraceCanvas.height, blurRadius);
            // Re-apply to canvas after blur
            potraceCtx.putImageData(imageData, 0, 0);
            // Get the updated image data
            imageData = potraceCtx.getImageData(0, 0, potraceCanvas.width, potraceCanvas.height);
        }
        
        // Create binary image data with threshold
        const binaryData = new Uint8ClampedArray(imageData.data.length);
        
        // Apply threshold to create binary image
        for (let i = 0; i < imageData.data.length; i += 4) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            
            // Convert to grayscale
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Apply threshold
            const isBlack = gray < threshold;
            
            // Set pixel value (consider invert setting)
            const pixelValue = invertColors ? !isBlack : isBlack;
            
            // Set all channels to black or white
            const value = pixelValue ? 0 : 255;
            binaryData[i] = value;
            binaryData[i + 1] = value;
            binaryData[i + 2] = value;
            binaryData[i + 3] = 255; // Full alpha
        }
        
        // Put binary image back to canvas
        potraceCtx.putImageData(new ImageData(binaryData, potraceCanvas.width, potraceCanvas.height), 0, 0);
        
        // Map sensitivity (0.8-5.0) to turdsize (2-15), inverse relationship
        // For silhouette, we use a slightly higher range to preserve shape integrity
        const turdsize = Math.round(15 - (sensitivity * 3));
        
        // Map smoothing (0-1.0) to opttolerance (0.1-0.8)
        // For silhouette, we want slightly less aggressive optimization
        const opttolerance = 0.1 + (smoothing * 0.7);
        
        // Configure Potrace parameters for better quality
        Potrace.setParameter({
            turdsize: Math.max(2, Math.min(15, turdsize)),    // Suppress speckles based on sensitivity
            alphamax: 1.0,                                   // Corner threshold
            optcurve: true,                                 // Optimize curves
            opttolerance: opttolerance,                    // Curve optimization tolerance based on smoothing
            turnpolicy: "minority"                        // Path decomposition approach
        });
        
        // Process with Potrace
        Potrace.loadImageFromCanvas(potraceCanvas);
        
        return new Promise((resolve, reject) => {
            try {
                Potrace.process(() => {
                    try {
                        // Get SVG at original size
                        const svgData = Potrace.getSVG(1);
                        
                        // Fix SVG viewBox if needed
                        let fixedSvg = svgData;
                        const widthMatch = svgData.match(/width="([^"]+)"/);
                        const heightMatch = svgData.match(/height="([^"]+)"/);
                        
                        if (widthMatch && heightMatch) {
                            const svgWidth = Number.parseFloat(widthMatch[1]);
                            const svgHeight = Number.parseFloat(heightMatch[1]);
                            
                            // Add viewBox if missing
                            if (svgData.indexOf('viewBox') === -1) {
                                fixedSvg = svgData.replace('<svg', `<svg viewBox="0 0 ${svgWidth} ${svgHeight}"`);
                            }
                        }
                        
                        // Handle inverted colors
                        if (invertColors) {
                            fixedSvg = fixedSvg.replace('fill="black"', 'fill="black"');
                            // Add background for display
                            fixedSvg = fixedSvg.replace('<path', '<rect width="100%" height="100%" fill="white"/><path');
                        }
                        
                        resolve(fixedSvg);
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
    
    // Helper function to create error SVG
    function createErrorSvg(message, width, height) {
        return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            <text x="50%" y="50%" text-anchor="middle" fill="red">Error: ${message}</text>
        </svg>`;
    }
    
    // Helper function to handle processing errors
    function handleProcessingError(error, width, height) {
        const errorSvg = createErrorSvg(error.message, width, height);
        svgPreview.innerHTML = errorSvg;
        silhouettePreview.innerHTML = errorSvg;
        downloadBtn.disabled = true;
        downloadSilhouetteBtn.disabled = true;
        updateStatus(`Error: ${error.message}`, false);
    }
    
    // Helper functions for image processing that are still used by Potrace
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
