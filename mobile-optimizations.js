/**
 * Mobile Optimizations
 * Detects mobile devices and provides state management for performance tuning.
 */

function initializeMobileState() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        console.log("Mobile device detected, enabling performance optimizations.");
        return {
            isMobile: true,
            // State variables specifically for mobile optimization
            state: {
                isProcessingActive: false,   // Track if processing is currently active on mobile
                lastInteractionTime: 0,      // Time of last user interaction with a slider on mobile
                processingRequested: false // Track if new processing was requested during active processing
            }
        };
    } 
    // Return default for non-mobile
    return {
        isMobile: false
    };
}

// Initialize immediately and make available globally (or could be imported/required in a module system)
window.mobileOptimizationInfo = initializeMobileState(); 