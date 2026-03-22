/**
 * SVG Line Art Converter
 * 
 * A powerful client-side tool for converting images to SVG line art with
 * both outline and silhouette modes.
 * 
 * Version: 1.0.0
 */

// Add a fallback logging mechanism at the top of the file
// Right after the SVG Line Art Converter comment block

/**
 * Safe debug logging mechanism that works even if the debug console isn't loaded
 * @param {string} message - Message to log
 * @param {boolean} showTiming - Whether to show timing
 */
function safeLog(message, showTiming = false) {
    // If debug console exists, use it
    if (window.debugConsole) {
        window.debugConsole.log(message, showTiming);
    } else {
        // Otherwise, just use console.log
        console.log(message);
    }
}

/**
 * Safe timing start function
 */
function safeStartTiming() {
    if (window.debugConsole) {
        return window.debugConsole.startTiming();
    }
    return performance.now();
}

// Main application code
document.addEventListener('DOMContentLoaded', () => {
    // Get mobile optimization info (must be loaded before this script)
    const mobileInfo = window.mobileOptimizationInfo || { isMobile: false }; 
    
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
    
    // Mobile specific controls
    const enableDetailedMobileToggle = document.getElementById('enableDetailedMobileToggle');
    
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
    const invertSourceToggle = document.getElementById('invertSourceToggle');
    
    // State variables
    let originalImage = null;         // Original uploaded image
    let originalImageData = null;     // Original image pixel data for adjustments
    let currentSvgData = null;        // Current line art SVG data
    let currentSilhouetteSvgData = null; // Current silhouette SVG data
    let processingTimer = null;       // Timer for debouncing processing requests

    // Interactive processing state
    let processingStartTime = 0;      // Performance tracking
    let isInteractive = false;        // Whether we're in fast interactive mode
    let detailedProcessingTimer = null; // Timer for detailed processing after user stops interaction
    const DETAILED_PROCESSING_DELAY = 20; // ms to wait before starting detailed processing (desktop)
    
    // Non-mobile specific state (used if not mobile)
    let desktopIsProcessingActive = false;
    let desktopLastInteractionTime = 0;
    
    // --- Use mobile state if available, otherwise use desktop state ---
    const appState = mobileInfo.isMobile ? mobileInfo.state : {
        isProcessingActive: desktopIsProcessingActive,
        lastInteractionTime: desktopLastInteractionTime
    };
    // Helper to update state correctly
    const updateAppState = (newState) => {
        if (mobileInfo.isMobile) {
            Object.assign(mobileInfo.state, newState);
        } else {
            if (Object.prototype.hasOwnProperty.call(newState, 'isProcessingActive')) desktopIsProcessingActive = newState.isProcessingActive;
            if (Object.prototype.hasOwnProperty.call(newState, 'lastInteractionTime')) desktopLastInteractionTime = newState.lastInteractionTime;
        }
    };
    
    // Default values for controls
    const defaultSettings = {
        threshold: 120,
        smoothing: 80,
        lineThickness: 3,
        blurRadius: 1,
        edgeSensitivity: 1.8,
        invertColors: false,
        invertSource: false,
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
    
    // REPLACE the old event listener code with the new setup
    setupEventListeners();
    
    // Initialize control displays
    updateThresholdValue();
    updateSmoothingValue();
    updateLineThicknessValue();
    updateBlurRadiusValue();
    updateEdgeSensitivityValue();
    updateBrightnessValue();
    updateContrastValue();
    updateBrillianceValue();
    updateShadowsValue();
    
    // Update the status update function (simpler now)
    function updateStatus(message, isProcessing = true) {
        statusIndicator.textContent = message;
        if (isProcessing) {
            statusIndicator.classList.add('processing');
        } else {
            statusIndicator.classList.remove('processing');
        }
        
        // Don't auto-clear important messages
        if (message.includes('Complete') || message.includes('Processed')) {
            // This is a completion message, keep it visible longer
            if (window.statusTimeout) {
                clearTimeout(window.statusTimeout);
            }
            window.statusTimeout = setTimeout(() => {
                statusIndicator.textContent = '';
                statusIndicator.classList.remove('processing');
            }, 5000);
        }
    }
    
    // Simplify clear status
    function clearStatus() {
            statusIndicator.textContent = '';
            statusIndicator.classList.remove('processing');
    }
    
    /**
     * Debounce function for processing - optimized for mobile
     */
    function debouncedProcessImage() {
        // Record the time of this interaction
        updateAppState({ lastInteractionTime: Date.now() });
        
        // Clear any existing timer
        if (processingTimer) {
            clearTimeout(processingTimer);
        }
        
        // If currently processing, don't immediately start another process
        if (appState.isProcessingActive) {
            // Just schedule another attempt after a short delay
            if (mobileInfo.isMobile) { // Only reschedule automatically on mobile
                 processingTimer = setTimeout(debouncedProcessImage, 100);
            }
            return;
        }
        
        // Set a timeout appropriate for device performance
        const debounceTime = mobileInfo.isMobile ? 150 : 10;
        processingTimer = setTimeout(() => {
            if (originalImage) {
                // Mark as processing to prevent simultaneous processing
                updateAppState({ isProcessingActive: true });
                
                // Start with interactive mode for fast feedback
                isInteractive = true;
                
                // Process the image
                processImage(() => {
                    // When complete, mark as no longer processing
                    updateAppState({ isProcessingActive: false });
                    
                    // Check if another processing was requested during this one (mobile check)
                    if (mobileInfo.isMobile) {
                        const timeSinceLastInteraction = Date.now() - appState.lastInteractionTime;
                        if (timeSinceLastInteraction < 200) {
                            // User interacted during processing, process again
                            debouncedProcessImage();
                            return; // Don't schedule detailed processing yet
                        }
                    }
                    // Schedule detailed processing
                    scheduleDetailedProcessing();
                });
            }
        }, debounceTime);
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
        invertSourceToggle.checked = defaultSettings.invertSource;
        
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
        const invertSource = invertSourceToggle.checked;
        
        // If no adjustments and no inversion, just show the original
        if (brightness === 0 && contrast === 0 && brilliance === 0 && shadows === 0 && !invertSource) {
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
        canvas.style.maxHeight = '100%';
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
        
        // Apply inversion if enabled
        if (invertSource) {
            invertImageData(adjustedData.data);
        }
        
        // Put adjusted data on canvas
        ctx.putImageData(adjustedData, 0, 0);
        
        // Display the adjusted image
        originalPreview.innerHTML = '';
        originalPreview.appendChild(canvas);
    }
    
    /**
     * Apply image adjustments to pixel data
     * Enhanced with alpha-blending from useMonochromeProcessor pipeline
     */
    function applyImageAdjustments(data, brightness, contrast, brilliance, shadows) {
        const contrastFactor = (100 + contrast) / 100;
        const brillianceFactor = brilliance / 100;
        const shadowsFactor = shadows / 100;

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            const alpha = data[i + 3];

            // Alpha blend to white background for consistent tracing
            if (alpha < 255) {
                const alphaFactor = alpha / 255;
                r = Math.round(r * alphaFactor + 255 * (1 - alphaFactor));
                g = Math.round(g * alphaFactor + 255 * (1 - alphaFactor));
                b = Math.round(b * alphaFactor + 255 * (1 - alphaFactor));
                data[i + 3] = 255;
            }

            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            if (shadows !== 0) {
                const shadowsStrength = Math.max(0, 1 - luminance * 2.5);
                const shadowsAdjustment = shadowsFactor * shadowsStrength * 50;
                r += shadowsAdjustment;
                g += shadowsAdjustment;
                b += shadowsAdjustment;
            }

            if (brilliance !== 0) {
                const brillianceStrength = 1 - Math.abs(luminance - 0.5) * 2;
                const brillianceAdjustment = brillianceFactor * brillianceStrength * 50;
                r += brillianceAdjustment;
                g += brillianceAdjustment;
                b += brillianceAdjustment;
            }

            r += brightness * 2.55;
            g += brightness * 2.55;
            b += brightness * 2.55;

            r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
            g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
            b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;

            data[i] = Math.min(255, Math.max(0, Math.round(r)));
            data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
            data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
        }
    }
    
    /**
     * Invert image pixel data
     */
    function invertImageData(data) {
        for (let i = 0; i < data.length; i += 4) {
            // Invert RGB values (not alpha)
            data[i] = 255 - data[i];         // R
            data[i + 1] = 255 - data[i + 1]; // G
            data[i + 2] = 255 - data[i + 2]; // B
            // Alpha (i + 3) remains unchanged
        }
    }
    
    // Control update functions
    function updateThresholdValue() {
        thresholdValue.textContent = thresholdSlider.value;
    }
    
    function updateSmoothingValue() {
        smoothingValue.textContent = smoothingSlider.value;
    }
    
    function updateLineThicknessValue() {
        lineThicknessValue.textContent = lineThicknessSlider.value;
    }
    
    function updateBlurRadiusValue() {
        blurRadiusValue.textContent = blurRadiusSlider.value;
    }
    
    function updateEdgeSensitivityValue() {
        edgeSensitivityValue.textContent = edgeSensitivitySlider.value;
    }
    
    function updateBrightnessValue() {
        brightnessValue.textContent = brightnessSlider.value;
        displayOriginalImage();
    }
    
    function updateContrastValue() {
        contrastValue.textContent = contrastSlider.value;
        displayOriginalImage();
    }
    
    function updateBrillianceValue() {
        brillianceValue.textContent = brillianceSlider.value;
        displayOriginalImage();
    }
    
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
            // --- For download, ALWAYS do a final non-interactive render for highest quality --- 
            if (originalImage) {
                isInteractive = false; // Mark as non-interactive for final quality
                updateAppState({ isProcessingActive: true }); // Mark as processing
                
                // Show a processing indicator
                const previewContainer = type === 'line' ? svgPreview : silhouettePreview;
                previewContainer.innerHTML = '<div style="text-align: center; padding: 20px;">Processing high-quality export...</div>';
                
                // Process with best quality using setTimeout to allow UI update
                 setTimeout(() => {
                    processImage(() => {
                        updateAppState({ isProcessingActive: false }); // Clear processing flag
            const svgData = type === 'line' ? currentSvgData : currentSilhouetteSvgData;
                        if (!svgData) {
                             handleProcessingError(new Error("Failed to generate SVG data for download"), originalImage.naturalWidth, originalImage.naturalHeight);
                             return;
                         }
                        completeSvgDownload(type, svgData);
                    });
                }, 10); // Short delay to ensure UI updates
                return;
            }
            
            // Fallback to existing data if needed (should ideally not happen with the above logic)
            const svgData = type === 'line' ? currentSvgData : currentSilhouetteSvgData;
            if (!svgData) throw new Error("No SVG data found for download");
            completeSvgDownload(type, svgData);
        } catch (error) {
            console.error(`Error downloading ${type} SVG:`, error);
            updateStatus(`Download error: ${error.message}`, false);
            updateAppState({ isProcessingActive: false }); // Ensure flag is cleared on error
        }
    }
    
    // Function to complete SVG download after processing
    function completeSvgDownload(type, svgData) {
        try {
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
                const fillColor = 'black';
                
                // Add paths to clean SVG
                for (const path of paths) {
                    const clonedPath = path.cloneNode(true);
                    // Set the fill color (always black for silhouette)
                    clonedPath.setAttribute('fill', fillColor);
                    // Remove any stroke
                    clonedPath.removeAttribute('stroke');
                    // Optimize path data
                    if (clonedPath.hasAttribute('d')) {
                        const optimizedPath = optimizeSvgPath(clonedPath.getAttribute('d'));
                        clonedPath.setAttribute('d', optimizedPath);
                    }
                    cleanSvg.appendChild(clonedPath);
                }
                
                // Add background if inverted
                if (invertColorsToggle.checked) {
                    // Create a white background rectangle
                    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    bgRect.setAttribute('width', '100%');
                    bgRect.setAttribute('height', '100%');
                    bgRect.setAttribute('fill', 'white');
                    // Insert at the beginning
                    cleanSvg.insertBefore(bgRect, cleanSvg.firstChild);
                }
                
                // Ensure viewBox is set properly for consistent scaling
                if (!cleanSvg.hasAttribute('viewBox') && cleanSvg.hasAttribute('width') && cleanSvg.hasAttribute('height')) {
                    const width = cleanSvg.getAttribute('width');
                    const height = cleanSvg.getAttribute('height');
                    cleanSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
                }
                
                // Serialize to string
                const serializer = new XMLSerializer();
                let finalSvgString = serializer.serializeToString(cleanSvg);
                
                // Further optimize the SVG string
                finalSvgString = optimizeSvgString(finalSvgString);
                
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
                    
                    // Optimize path data
                    if (element.hasAttribute('d')) {
                        const optimizedPath = optimizeSvgPath(element.getAttribute('d'));
                        element.setAttribute('d', optimizedPath);
                    }
                }
                
                cleanSvg.appendChild(element);
            }
            
            // Serialize the SVG to string
            const serializer = new XMLSerializer();
            let cleanSvgString = serializer.serializeToString(cleanSvg);
            
            // Further optimize the SVG string
            cleanSvgString = optimizeSvgString(cleanSvgString);
            
            // Create download
            downloadSvgFile(cleanSvgString, 'lineart.svg');
        } catch (error) {
            console.error(`Error completing SVG download: ${error.message}`);
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
    
    /**
     * Schedule detailed processing after user stops interaction - optimized for mobile
     */
    function scheduleDetailedProcessing() {
        // Cancel any pending detailed processing
        if (detailedProcessingTimer) {
            clearTimeout(detailedProcessingTimer);
            safeLog("Cancelled pending detailed processing");
        }
        
        // --- Mobile check: Only run detailed processing if enabled by checkbox --- 
        if (mobileInfo.isMobile && !enableDetailedMobileToggle.checked) {
            safeLog("Detailed processing skipped on mobile (disabled by user).");
            return; // Don't schedule if disabled on mobile
        }
        
        // Calculate appropriate delay based on device capability
        const detailDelay = mobileInfo.isMobile ? 800 : DETAILED_PROCESSING_DELAY;
        
        // Schedule new detailed processing
        safeLog("Scheduling detailed processing...");
        detailedProcessingTimer = setTimeout(() => {
            // Only proceed if no processing is currently active
            if (appState.isProcessingActive) {
                // Try again later (only reschedule automatically on mobile if detailed is enabled)
                if (mobileInfo.isMobile && enableDetailedMobileToggle.checked) {
                     scheduleDetailedProcessing(); 
                }
                return;
            }
            
            // Check if user has interacted recently
            const timeSinceLastInteraction = Date.now() - appState.lastInteractionTime;
            const recentInteractionThreshold = mobileInfo.isMobile ? 500 : 50; // Shorter threshold for desktop
            if (timeSinceLastInteraction < recentInteractionThreshold) {
                // User interacted too recently, reschedule (only if detailed enabled on mobile)
                 if (!mobileInfo.isMobile || enableDetailedMobileToggle.checked) {
                    scheduleDetailedProcessing();
                 }
                return;
            }
            
            // Start detailed processing
            updateAppState({ isProcessingActive: true });
            isInteractive = false;
            safeLog("Starting detailed rendering");
            safeStartTiming();
            updateStatus('Generating detailed output...');
            
            // Process image with callback to clear processing state
            processImage(() => {
                updateAppState({ isProcessingActive: false });
                safeLog("Detailed rendering complete", true);
            });
        }, detailDelay);
    }

    // Setup event listeners function - optimized for mobile
    function setupEventListeners() {
        // DOM elements we'll need
        const sliders = [
            thresholdSlider, smoothingSlider, lineThicknessSlider, 
            blurRadiusSlider, edgeSensitivitySlider, brightnessSlider,
            contrastSlider, brillianceSlider, shadowsSlider
        ];
        
        const toggles = [invertColorsToggle, invertSourceToggle];
        
        // Add event listeners to sliders
        for (const slider of sliders) {
            slider.addEventListener('input', () => {
                // Update display value
                const updateFnName = `update${slider.id.charAt(0).toUpperCase() + slider.id.slice(1, -6)}Value`;
                if (typeof window[updateFnName] === 'function') {
                    window[updateFnName]();
                }
                
                // Cancel any pending detailed processing
                if (detailedProcessingTimer) {
                    clearTimeout(detailedProcessingTimer);
                    detailedProcessingTimer = null;
                    safeLog("Cancelled detailed processing - interactive mode");
                }
                
                // For brightness-related sliders, update the original image display
                if (['brightnessSlider', 'contrastSlider', 'brillianceSlider', 'shadowsSlider'].includes(slider.id)) {
                    displayOriginalImage();
                }
                
                // Process with fast preview
                if (!isInteractive) {
                    // First time entering interactive mode
                    safeLog("Entering interactive preview mode");
                }
                
                // Use requestAnimationFrame for better UI responsiveness
                requestAnimationFrame(() => {
                    isInteractive = true;
                    // Process image with debouncing
                    debouncedProcessImage();
                });
            });
            
            // On slider release - schedule detailed processing (if applicable)
            slider.addEventListener('change', () => {
                // Detailed processing is now handled by scheduleDetailedProcessing,
                // which includes the mobile checkbox check. We just call it.
                scheduleDetailedProcessing();
            });
        }
        
        // Add event listeners to toggles
        for (const toggle of toggles) {
            toggle.addEventListener('change', () => {
                // Update source image immediately if it's the invert source toggle
                if (toggle.id === 'invertSourceToggle') {
                    displayOriginalImage();
                }
                
                // Use requestAnimationFrame for better UI responsiveness
                requestAnimationFrame(() => {
                    // Process with fast preview
                    isInteractive = true;
                    updateStatus('Interactive preview...');
                    debouncedProcessImage(); // Debounced call handles scheduling detailed processing
                });
            });
        }
        
        // Add listener for the new mobile checkbox
        if (mobileInfo.isMobile && enableDetailedMobileToggle) {
            enableDetailedMobileToggle.addEventListener('change', () => {
                // If checked, try scheduling detailed processing immediately
                if (enableDetailedMobileToggle.checked) {
                    safeLog("Detailed rendering enabled on mobile. Attempting schedule...");
                    scheduleDetailedProcessing();
                } else {
                     safeLog("Detailed rendering disabled on mobile.");
                    // Optionally cancel any pending detailed timer if unchecked
                    if (detailedProcessingTimer) {
                        clearTimeout(detailedProcessingTimer);
                        detailedProcessingTimer = null;
                    }
                }
            });
        }
    }
    
    // Process the image to generate SVG - optimized for mobile
    function processImage(callback) {
        if (!originalImage || !originalImageData) return;
        
        // Add a "processing" indicator if not in interactive mode
        if (!isInteractive) {
        updateStatus('Processing...');
        svgPreview.innerHTML = '<div style="text-align: center; padding: 20px;">Processing...</div>';
        silhouettePreview.innerHTML = '<div style="text-align: center; padding: 20px;">Processing...</div>';
        }
        
        // Track processing time
        processingStartTime = safeStartTiming();
        
        // Use requestAnimationFrame to give UI a chance to update
        requestAnimationFrame(() => {
            // --- Get control values (same as before) ---
            const threshold = Number.parseInt(thresholdSlider.value, 10);
            // ... (get other slider/toggle values)
            const invertColors = invertColorsToggle.checked;
            const invertSource = invertSourceToggle.checked;
            const brightness = Number.parseInt(brightnessSlider.value, 10);
            const contrast = Number.parseInt(contrastSlider.value, 10);
            const brilliance = Number.parseInt(brillianceSlider.value, 10);
            const shadows = Number.parseInt(shadowsSlider.value, 10);
            const smoothing = Number.parseInt(smoothingSlider.value, 10) / 100;
            const lineThickness = Number.parseFloat(lineThicknessSlider.value);
            const blurRadius = Number.parseFloat(blurRadiusSlider.value);
            const edgeSensitivity = Number.parseFloat(edgeSensitivitySlider.value);
            
            safeLog(`Processing with invertColors: ${invertColors}`);
            const startTime = performance.now();
            
            // Create canvas and apply adjustments (same as before)
            const canvas = document.createElement('canvas');
            // ... (set canvas size)
            canvas.width = originalImage.naturalWidth;
            canvas.height = originalImage.naturalHeight;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const adjustedData = new ImageData(
                new Uint8ClampedArray(originalImageData.data),
                originalImageData.width,
                originalImageData.height
            );
            // ... (apply adjustments and inversion)
            if (brightness !== 0 || contrast !== 0 || brilliance !== 0 || shadows !== 0) {
                applyImageAdjustments(adjustedData.data, brightness, contrast, brilliance, shadows);
            }
            if (invertSource) {
                invertImageData(adjustedData.data);
            }
            ctx.putImageData(adjustedData, 0, 0);
            
            try {
                let simplifyLevel = 0;
                if (isInteractive) {
                    simplifyLevel = mobileInfo.isMobile ? 2 : 1;
                }
                
                // Line art still uses the standalone pipeline
                const lineArtPromise = processLineArtWithPotrace(
                    canvas, threshold, invertColors, blurRadius, lineThickness, smoothing, edgeSensitivity, simplifyLevel
                ).catch(error => {
                    console.error('Error in line art processing:', error);
                    return createErrorSvg(`Error generating line art: ${error.message}`, canvas.width, canvas.height);
                });
                
                // Silhouette uses the NYCES preprocessCanvas pipeline (exact match)
                // Feeds raw originalImageData (not the pre-adjusted canvas) so NYCES
                // preprocessing handles brightness/contrast with its own formula
                const silhouetteCanvas = document.createElement('canvas');
                silhouetteCanvas.width = originalImage.naturalWidth;
                silhouetteCanvas.height = originalImage.naturalHeight;
                const silCtx = silhouetteCanvas.getContext('2d', { willReadFrequently: true });
                silCtx.drawImage(originalImage, 0, 0);

                const silhouettePromise = processSilhouette(
                    silhouetteCanvas, threshold, invertColors, brightness, contrast, simplifyLevel
                ).catch(error => {
                    console.error('Error in silhouette processing:', error);
                    return createErrorSvg(`Error generating silhouette: ${error.message}`, canvas.width, canvas.height);
                });
                
                Promise.all([lineArtPromise, silhouettePromise]).then(([lineArtSvg, silhouetteSvg]) => {
                    if (Date.now() - appState.lastInteractionTime < 200) {
                        if (typeof callback === 'function') callback();
                        return;
                    }
                    
                    currentSvgData = lineArtSvg;
                    currentSilhouetteSvgData = silhouetteSvg;
                    
                    svgPreview.innerHTML = lineArtSvg;
                    silhouettePreview.innerHTML = silhouetteSvg;
                    
                    downloadBtn.disabled = false;
                    downloadSilhouetteBtn.disabled = false;
                    
                    const endTime = performance.now();
                    const processingTime = Math.round(endTime - startTime);
                    const mode = isInteractive ? "Interactive" : "Detailed";
                    safeLog(`${mode} processing complete in ${processingTime}ms`, true);
                    updateStatus(`Processed in ${processingTime}ms`, false);
                    
                    if (typeof callback === 'function') callback();
                });
            } catch (error) {
                console.error('Error processing image:', error);
                handleProcessingError(error, canvas.width, canvas.height);
                 // Ensure processing state is cleared on error and callback is called
                updateAppState({ isProcessingActive: false });
                if (typeof callback === 'function') {
                    callback();
                }
            }
        });
    }
    
    // Process line art using Potrace - updated with simplifyLevel
    function processLineArtWithPotrace(canvas, threshold, invertColors, blurRadius = 0, lineThickness = 1, smoothing = 0.5, sensitivity = 1.8, simplifyLevel = 0) {
        const potraceCanvas = document.createElement('canvas');
        const potraceCtx = potraceCanvas.getContext('2d', { willReadFrequently: true });
        
        // --- Scale canvas based on simplifyLevel (more aggressive for mobile) ---
        let scaleFactor = 1;
        if (simplifyLevel === 2) { // Interactive Mobile
            const maxSize = Math.max(canvas.width, canvas.height);
            if (maxSize > 600) scaleFactor = maxSize / 600; // More aggressive downsampling
        } else if (simplifyLevel === 1) { // Interactive Desktop
            const maxSize = Math.max(canvas.width, canvas.height);
            if (maxSize > 800) scaleFactor = maxSize / 800;
        }
        
        potraceCanvas.width = Math.floor(canvas.width / scaleFactor);
        potraceCanvas.height = Math.floor(canvas.height / scaleFactor);
        potraceCtx.drawImage(canvas, 0, 0, potraceCanvas.width, potraceCanvas.height);
        
        let imageData = potraceCtx.getImageData(0, 0, potraceCanvas.width, potraceCanvas.height);
        
        // --- Apply effects conditionally based on simplifyLevel ---
        if (simplifyLevel === 0) { // Only enhance edges in detailed mode
            const enhancedData = enhanceEdges(imageData.data, potraceCanvas.width, potraceCanvas.height, sensitivity);
            imageData = new ImageData(enhancedData, potraceCanvas.width, potraceCanvas.height);
        }
        
        if (blurRadius > 0 && simplifyLevel < 2) { // Apply blur unless in fastest mobile mode
            const pixels = imageData.data;
            applyBlur(pixels, potraceCanvas.width, potraceCanvas.height, blurRadius, simplifyLevel === 0);
            potraceCtx.putImageData(imageData, 0, 0);
            imageData = potraceCtx.getImageData(0, 0, potraceCanvas.width, potraceCanvas.height);
        }
        
        const binaryData = applyThreshold(
            imageData.data, potraceCanvas.width, potraceCanvas.height, threshold, invertColors, 
            simplifyLevel === 0 // Adaptive threshold only in detailed mode
        );
        potraceCtx.putImageData(new ImageData(binaryData, potraceCanvas.width, potraceCanvas.height), 0, 0);
        
        // --- Adjust Potrace tolerance based on simplifyLevel ---
        const turdsize = Math.max(2, Math.min(10, 8 - sensitivity));
        let opttolerance;
        if (simplifyLevel === 2) {
            opttolerance = 0.6 + (smoothing * 0.6);  // Very relaxed
        } else if (simplifyLevel === 1) {
            opttolerance = 0.4 + (smoothing * 0.6);  // Relaxed
        } else {
            opttolerance = 0.3 + (smoothing * 0.65); // Precise
        }
        
        Potrace.setParameter({ turdsize, alphamax: 0.5, optcurve: true, opttolerance, turnpolicy: "majority" });
        Potrace.loadImageFromCanvas(potraceCanvas);
        
        // --- Potrace promise execution (same as before) ---
        return new Promise((resolve, reject) => {
            try {
                Potrace.process(() => {
                    try {
                        const svgData = Potrace.getSVG(1, "curve");
                        let fixedSvg = svgData;
                         // ... (viewBox and styling fixes remain the same)
                        const widthMatch = svgData.match(/width="([^"]+)"/);
                        const heightMatch = svgData.match(/height="([^"]+)"/);
                        if (widthMatch && heightMatch) {
                            const svgWidth = Number.parseFloat(widthMatch[1]);
                            const svgHeight = Number.parseFloat(heightMatch[1]);
                            if (svgData.indexOf('viewBox') === -1) {
                                fixedSvg = svgData.replace('<svg', `<svg viewBox="0 0 ${svgWidth} ${svgHeight}"`);
                            }
                        }
                        const strokeColor = invertColors ? 'white' : 'black';
                        fixedSvg = fixedSvg.replace('stroke="black"', `stroke="${strokeColor}" stroke-width="${lineThickness}" stroke-linecap="round" stroke-linejoin="round"`);
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
    
    /**
     * Process silhouette using the exact NYCES preprocessCanvas pipeline.
     * Copied from useMonochromeProcessor.preprocessCanvas:
     *   alpha-blend to white -> multiplicative brightness -> contrast -> grayscale -> threshold -> invert
     * Then traces with NYCES DEFAULT_POTRACE_PARAMS.
     */
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

        // --- Begin: NYCES preprocessCanvas (exact copy) ---
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
        // --- End: NYCES preprocessCanvas ---

        // NYCES DEFAULT_POTRACE_PARAMS (exact values)
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
    
    // Helper function to enhance edges
    function enhanceEdges(data, width, height, sensitivity = 1.4) {
        const output = new Uint8ClampedArray(data.length);
        // Reduce factor for cleaner lines
        const factor = Math.min(1.8, Math.max(1.0, sensitivity)); 
        
        // Copy original data
        for (let i = 0; i < data.length; i++) {
            output[i] = data[i];
        }
        
        // Apply simplified unsharp mask for edge enhancement
        const kernelSize = 3;
        const halfKernel = Math.floor(kernelSize / 2);
        
        for (let y = halfKernel; y < height - halfKernel; y++) {
            for (let x = halfKernel; x < width - halfKernel; x++) {
                // Calculate indices
                const centerIdx = (y * width + x) * 4;
                
                // Calculate local average (3x3 neighborhood)
                let rSum = 0;
                let gSum = 0; 
                let bSum = 0;
                let count = 0;
                
                for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                    for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        rSum += data[idx];
                        gSum += data[idx + 1];
                        bSum += data[idx + 2];
                        count++;
                    }
                }
                
                const rAvg = rSum / count;
                const gAvg = gSum / count;
                const bAvg = bSum / count;
                
                // Apply gentler unsharp mask: Original + factor * (Original - Blurred)
                output[centerIdx] = Math.min(255, Math.max(0, data[centerIdx] + factor * (data[centerIdx] - rAvg)));
                output[centerIdx + 1] = Math.min(255, Math.max(0, data[centerIdx + 1] + factor * (data[centerIdx + 1] - gAvg)));
                output[centerIdx + 2] = Math.min(255, Math.max(0, data[centerIdx + 2] + factor * (data[centerIdx + 2] - bAvg)));
                // Keep alpha unchanged
                output[centerIdx + 3] = data[centerIdx + 3];
            }
        }
        
        return output;
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
    
    // Helper functions for image processing
    function applyBlur(pixels, width, height, radius, highQuality = false) {
        if (radius <= 0.5) return;
        
        const temp = new Uint8ClampedArray(pixels.length);
        
        // Copy original pixels to temp array
        for (let i = 0; i < pixels.length; i++) {
            temp[i] = pixels[i];
        }
        
        const intRadius = Math.floor(radius);
        const skipPixels = highQuality ? 1 : 2; // Skip pixels for performance in fast mode
        
        // Horizontal pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Fix linter error by declaring variables separately
                let r = 0;
                let g = 0;
                let b = 0;
                let count = 0;
                
                for (let i = -intRadius; i <= intRadius; i += skipPixels) {
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
            }
        }
        
        // Copy blurred pixels back to temp for vertical pass
        for (let i = 0; i < pixels.length; i++) {
            temp[i] = pixels[i];
        }
        
        // Vertical pass
        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x++) {
                // Fix linter error by declaring variables separately 
                let r = 0;
                let g = 0;
                let b = 0;
                let count = 0;
                
                for (let j = -intRadius; j <= intRadius; j += skipPixels) {
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
            }
        }
    }
    
    function applyThreshold(data, width, height, threshold, invertColors, useAdaptive = false) {
        const binaryData = new Uint8ClampedArray(data.length);
        
        if (useAdaptive) {
            // Adaptive threshold - higher quality but slower
            const windowSize = 11; // Smaller window size for simpler lines
            const halfWindow = Math.floor(windowSize / 2);
            
            // Calculate local thresholds
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let sum = 0;
                    let count = 0;
                    
                    // Calculate local average with a bias towards global threshold
                    for (let wy = Math.max(0, y - halfWindow); wy <= Math.min(height - 1, y + halfWindow); wy++) {
                        for (let wx = Math.max(0, x - halfWindow); wx <= Math.min(width - 1, x + halfWindow); wx++) {
                            const i = (wy * width + wx) * 4;
                            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                            sum += gray;
                            count++;
                        }
                    }
                    
                    // Mix local and global thresholds (60% global, 40% local) for more consistent results
                    const localAvg = sum / count;
                    const localThreshold = (0.4 * localAvg + 0.6 * threshold);
                    
                    // Get current pixel grayscale value
                    const idx = (y * width + x) * 4;
                    const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                    
                    // Apply thresholding with slight hysteresis to prevent small fluctuations
                    const grayDiff = Math.abs(gray - localThreshold);
                    const isBlack = gray < localThreshold && grayDiff > 2; // Add hysteresis threshold
                    
                    // Set pixel value (consider invert setting)
                    const pixelValue = invertColors ? !isBlack : isBlack;
                    
                    // Set all channels to black or white
                    const value = pixelValue ? 0 : 255;
                    binaryData[idx] = value;
                    binaryData[idx + 1] = value;
                    binaryData[idx + 2] = value;
                    binaryData[idx + 3] = 255; // Full alpha
                }
            }
        } else {
            // Simple global threshold - faster for interactive updates
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
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
        }
        
        return binaryData;
    }
    
    // Helper functions for SVG optimization
    function optimizeSvgPath(pathData) {
        // Skip optimization if no path data
        if (!pathData) return pathData;
        
        // 1. Reduce precision of decimal points (reduce from 3 to 1 decimal places)
        let optimized = pathData.replace(/(\d+\.\d{1,6})/g, match => {
            const num = Number.parseFloat(match);
            return num.toFixed(1); // Reduce to 1 decimal place
        });
        
        // 2. Remove redundant zeros after decimal point
        optimized = optimized.replace(/(\d+)\.0(?=\s|,|$)/g, '$1');
        
        // 3. Remove multiple consecutive spaces
        optimized = optimized.replace(/\s{2,}/g, ' ');
        
        // 4. Remove spaces after commands (e.g., "M 10" -> "M10")
        optimized = optimized.replace(/([MLHVCSQTAZmlhvcsqtaz])\s+/g, '$1');
        
        // 5. Remove spaces before commands
        optimized = optimized.replace(/\s+([MLHVCSQTAZmlhvcsqtaz])/g, '$1');
        
        return optimized;
    }

    function optimizeSvgString(svgString) {
        let optimized = svgString.replace(/<\?xml[^>]*>\s*/g, '');
        optimized = optimized.replace(/<!--[\s\S]*?-->/g, '');
        optimized = optimized.replace(/\s+version="[^"]*"/g, '');
        optimized = optimized.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
        optimized = optimized.replace(/<desc[^>]*>[\s\S]*?<\/desc>/gi, '');
        optimized = optimized.replace(/<metadata[^>]*>[\s\S]*?<\/metadata>/gi, '');
        optimized = optimized.replace(/(\d+\.\d{3,})/g, match => {
            return Number.parseFloat(match).toFixed(2);
        });
        optimized = optimized.replace(/(\d+)\.0(?=\s|"|'|,)/g, '$1');
        optimized = optimized.replace(/\s{2,}/g, ' ');
        optimized = optimized.replace(/>\s+</g, '><');
        optimized = optimized.replace(/<g>\s*<\/g>/g, '');
        return optimized;
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
