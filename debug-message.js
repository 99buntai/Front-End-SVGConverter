/**
 * Debug Console Component
 * A self-contained debug console for displaying logs and timing information
 */

class DebugConsole {
    constructor(options = {}) {
        this.options = {
            maxEntries: options.maxEntries || 20,
            position: options.position || 'bottom-right',
            width: options.width || '300px',
            height: options.height || '200px',
            fontFamily: options.fontFamily || 'monospace',
            fontSize: options.fontSize || '12px',
            ...options
        };
        
        // Performance tracking
        this.processingStartTime = 0;
        
        // Dragging state
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        // Message counter
        this.newMessageCount = 0;
        
        // Keyboard shortcut state
        this.lastEscTime = 0;
        
        // Create the container element
        this.createConsole();
        
        // Create minimized button (initially hidden)
        this.createMinimizedButton();
        
        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Global access for use in other modules
        window.debugConsole = this;
    }
    
    /**
     * Set up keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Check for Escape key (keyCode 27)
            if (e.key === 'Escape') {
                const now = Date.now();
                // Check if Escape was pressed twice within 500ms
                if (now - this.lastEscTime < 500) {
                    this.toggle();
                    e.preventDefault();
                    this.lastEscTime = 0; // Reset timer
                } else {
                    this.lastEscTime = now;
                }
            }
        });
    }
    
    /**
     * Create the minimized button that's visible when console is hidden
     */
    createMinimizedButton() {
        // Create a container div for perfect circular shape
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'debugConsoleMinButtonContainer';
        Object.assign(buttonContainer.style, {
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            width: '36px',
            height: '36px',
            display: 'none',
            zIndex: '999'
        });
        
        // Create the actual button with perfect circular shape
        this.minButton = document.createElement('div');
        Object.assign(this.minButton.style, {
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: 'rgba(30, 30, 30, 0.8)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            transition: 'transform 0.2s ease'
        });
        
        // Create a centered icon container
        const iconContainer = document.createElement('div');
        Object.assign(iconContainer.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            fontSize: '18px'
        });
        iconContainer.textContent = '🐞';
        
        // Add hover effect
        this.minButton.onmouseover = () => {
            this.minButton.style.transform = 'scale(1.1)';
        };
        this.minButton.onmouseout = () => {
            this.minButton.style.transform = 'scale(1)';
        };
        
        this.minButton.onclick = () => this.show();
        this.minButton.title = 'Show Debug Console';
        
        // Create message counter badge
        this.msgCountBadge = document.createElement('div');
        Object.assign(this.msgCountBadge.style, {
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            backgroundColor: '#ff4444',
            color: 'white',
            borderRadius: '50%',
            minWidth: '20px',
            height: '20px',
            textAlign: 'center',
            fontSize: '11px',
            lineHeight: '20px',
            fontWeight: 'bold',
            display: 'none',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.5)'
        });
        this.msgCountBadge.textContent = '0';
        
        // Assemble the components
        this.minButton.appendChild(iconContainer);
        this.minButton.appendChild(this.msgCountBadge);
        buttonContainer.appendChild(this.minButton);
        document.body.appendChild(buttonContainer);
        
        // Store a reference to the container
        this.minButtonContainer = buttonContainer;
    }
    
    /**
     * Update message counter badge
     */
    updateMessageCountBadge() {
        if (this.newMessageCount > 0) {
            this.msgCountBadge.textContent = this.newMessageCount > 99 ? '99+' : this.newMessageCount.toString();
            this.msgCountBadge.style.display = 'block';
        } else {
            this.msgCountBadge.style.display = 'none';
        }
    }
    
    /**
     * Create the debug console UI
     */
    createConsole() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'debugConsole';
        
        // Set up styling based on options
        Object.assign(this.container.style, {
            position: 'fixed',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            borderRadius: '5px',
            fontSize: this.options.fontSize,
            fontFamily: this.options.fontFamily,
            zIndex: '1000',
            maxHeight: this.options.height,
            width: this.options.width,
            display: 'flex',
            flexDirection: 'column',
            padding: '0',
            transition: 'opacity 0.3s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            resize: 'both',
            overflow: 'hidden'
        });
        
        // Position the console
        switch(this.options.position) {
            case 'bottom-right':
                Object.assign(this.container.style, {
                    bottom: '10px',
                    right: '10px'
                });
                break;
            case 'bottom-left':
                Object.assign(this.container.style, {
                    bottom: '10px',
                    left: '10px'
                });
                break;
            case 'top-right':
                Object.assign(this.container.style, {
                    top: '10px',
                    right: '10px'
                });
                break;
            case 'top-left':
                Object.assign(this.container.style, {
                    top: '10px',
                    left: '10px'
                });
                break;
        }
        
        // Fixed header controls
        const controls = document.createElement('div');
        Object.assign(controls.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.3)',
            backgroundColor: 'rgba(0,0,0,0.8)',
            position: 'sticky',
            top: '0',
            cursor: 'move' // Indicate draggable
        });
        
        // Set up drag events for both mouse and touch
        controls.addEventListener('mousedown', (e) => this.startDrag(e, 'mouse'));
        controls.addEventListener('touchstart', (e) => this.startDrag(e, 'touch'), { passive: false });
        
        // Document-level event listeners for drag movement and end
        document.addEventListener('mousemove', (e) => this.onDrag(e, 'mouse'));
        document.addEventListener('mouseup', () => this.endDrag('mouse'));
        document.addEventListener('touchmove', (e) => this.onDrag(e, 'touch'), { passive: false });
        document.addEventListener('touchend', () => this.endDrag('touch'));
        document.addEventListener('touchcancel', () => this.endDrag('touch'));
        
        // Left side with title
        const titleSection = document.createElement('div');
        titleSection.style.display = 'flex';
        titleSection.style.alignItems = 'center';
        
        const title = document.createElement('div');
        title.textContent = 'Debug Console';
        title.style.fontWeight = 'bold';
        title.style.fontSize = '12px';
        titleSection.appendChild(title);
        
        // Right side with buttons
        const buttonsSection = document.createElement('div');
        Object.assign(buttonsSection.style, {
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            height: '22px'
        });
        
        const createButton = (text, onClick) => {
            const button = document.createElement('button');
            button.textContent = text;
            Object.assign(button.style, {
                cursor: 'pointer',
                backgroundColor: 'rgba(80, 80, 80, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '11px',
                height: '22px',
                lineHeight: '1',
                margin: '0',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px'
            });
            button.onclick = onClick;
            return button;
        };
        
        const clearBtn = createButton('Clear', (e) => {
            e.stopPropagation(); // Prevent triggering drag
            this.clear();
        });
        
        const hideBtn = createButton('Hide', (e) => {
            e.stopPropagation(); // Prevent triggering drag
            this.hide();
        });
        
        buttonsSection.appendChild(clearBtn);
        buttonsSection.appendChild(hideBtn);
        
        controls.appendChild(titleSection);
        controls.appendChild(buttonsSection);
        this.container.appendChild(controls);
        
        // Create scrollable logs container
        this.logsContainer = document.createElement('div');
        Object.assign(this.logsContainer.style, {
            overflowY: 'auto',
            flex: '1',
            padding: '10px',
            maxHeight: `calc(${this.options.height} - 40px)` // Subtract header height
        });
        this.container.appendChild(this.logsContainer);
        
        // Add to document
        document.body.appendChild(this.container);
    }
    
    /**
     * Start dragging the console
     * @param {Event} e - Mouse or touch event
     * @param {string} eventType - Either 'mouse' or 'touch'
     */
    startDrag(e, eventType) {
        // Only start drag on header, not on buttons
        const validTarget = e.target.closest('#debugConsole') && !e.target.closest('button');
        
        if (validTarget) {
            this.isDragging = true;
            
            // Get event coordinates based on event type
            const clientX = eventType === 'mouse' ? e.clientX : e.touches[0].clientX;
            const clientY = eventType === 'mouse' ? e.clientY : e.touches[0].clientY;
            
            // Calculate the offset of the event within the container
            const rect = this.container.getBoundingClientRect();
            this.dragOffsetX = clientX - rect.left;
            this.dragOffsetY = clientY - rect.top;
            
            // Prevent text selection and scrolling during drag
            e.preventDefault();
            
            // Add a class to indicate dragging state
            this.container.style.opacity = '0.8';
        }
    }
    
    /**
     * Handle dragging of the console
     * @param {Event} e - Mouse or touch event
     * @param {string} eventType - Either 'mouse' or 'touch'
     */
    onDrag(e, eventType) {
        if (this.isDragging) {
            // Get event coordinates based on event type
            const clientX = eventType === 'mouse' ? e.clientX : e.touches[0].clientX;
            const clientY = eventType === 'mouse' ? e.clientY : e.touches[0].clientY;
            
            // Calculate new position
            let left = clientX - this.dragOffsetX;
            let top = clientY - this.dragOffsetY;
            
            // Get window dimensions
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            // Get console dimensions
            const consoleWidth = this.container.offsetWidth;
            const consoleHeight = this.container.offsetHeight;
            
            // Ensure the console stays within viewport
            left = Math.max(0, Math.min(left, windowWidth - consoleWidth));
            top = Math.max(0, Math.min(top, windowHeight - consoleHeight));
            
            // Apply new position
            this.container.style.left = `${left}px`;
            this.container.style.top = `${top}px`;
            
            // Remove the automatic positioning since we've manually positioned it
            this.container.style.bottom = 'auto';
            this.container.style.right = 'auto';
            
            // Prevent default event behavior (scrolling, selection)
            e.preventDefault();
        }
    }
    
    /**
     * End dragging of the console
     */
    endDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.container.style.opacity = '1';
        }
    }
    
    /**
     * Log a message to the debug console
     * @param {string} message - The message to log
     * @param {boolean} showTiming - Whether to include timing information
     * @param {object} options - Additional options for the log entry
     */
    log(message, showTiming = false, options = {}) {
        // Increment message counter if console is hidden
        if (this.container.style.display === 'none') {
            this.newMessageCount++;
            this.updateMessageCountBadge();
        }
        
        const logEntry = document.createElement('div');
        logEntry.style.borderBottom = '1px solid rgba(255,255,255,0.2)';
        logEntry.style.paddingBottom = '5px';
        logEntry.style.marginBottom = '5px';
        
        // Handle custom entry styling
        if (options.backgroundColor) {
            logEntry.style.backgroundColor = options.backgroundColor;
        }
        
        if (options.textColor) {
            logEntry.style.color = options.textColor;
        }
        
        // Add timestamp
        const now = new Date();
        const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
        
        // Add timing information if requested
        let timingInfo = '';
        if (showTiming && this.processingStartTime > 0) {
            const currentTime = performance.now();
            const elapsedTime = Math.round(currentTime - this.processingStartTime);
            timingInfo = ` <span style="color:#ffaa44">(${elapsedTime}ms)</span>`;
            // Reset timing for next measurement
            this.processingStartTime = currentTime;
        }
        
        logEntry.innerHTML = `<span style="color:#aaddff">${timestamp}</span> ${message}${timingInfo}`;
        
        // Add to log container
        this.logsContainer.appendChild(logEntry);
        
        // Limit entries to keep performance smooth
        while (this.logsContainer.children.length > this.options.maxEntries) {
            this.logsContainer.removeChild(this.logsContainer.firstChild);
        }
        
        // Auto-scroll to bottom
        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;
        
        // Also output to browser console for developer convenience
        console.log(`${timestamp} ${message} ${showTiming ? `(${timingInfo})` : ''}`);
    }
    
    /**
     * Start timing an operation
     */
    startTiming() {
        this.processingStartTime = performance.now();
        return this.processingStartTime;
    }
    
    /**
     * Log with timing from a specific start time
     * @param {string} message - The message to log
     * @param {number} startTime - The start time from performance.now()
     */
    logWithTiming(message, startTime) {
        const currentTime = performance.now();
        const elapsedTime = Math.round(currentTime - startTime);
        this.log(`${message} (${elapsedTime}ms)`);
    }
    
    /**
     * Clear all log entries
     */
    clear() {
        // Clear all log entries
        while (this.logsContainer.firstChild) {
            this.logsContainer.removeChild(this.logsContainer.firstChild);
        }
    }
    
    /**
     * Show the debug console
     */
    show() {
        this.container.style.display = 'flex';
        this.minButtonContainer.style.display = 'none';
        setTimeout(() => {
            this.container.style.opacity = '1';
        }, 10);
        
        // Reset message counter when console is shown
        this.newMessageCount = 0;
        this.updateMessageCountBadge();
    }
    
    /**
     * Hide the debug console
     */
    hide() {
        this.container.style.opacity = '0';
        // Show the minimized button
        this.minButtonContainer.style.display = 'flex';
        setTimeout(() => {
            this.container.style.display = 'none';
        }, 300);
    }
    
    /**
     * Toggle the debug console visibility
     */
    toggle() {
        if (this.container.style.display === 'none' || this.container.style.opacity === '0') {
            this.show();
        } else {
            this.hide();
        }
    }
}

// Create a global instance for use throughout the application
document.addEventListener('DOMContentLoaded', () => {
    window.debugConsole = new DebugConsole();
}); 