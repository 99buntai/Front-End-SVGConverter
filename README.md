# Image to SVG Line Art Playground

A Front-end Only, browser-based tool for converting raster images to clean SVG vector graphics with both Line Art and Silhouette modes. This application uses advanced image processing techniques and the Potrace algorithm to create high-quality vector outputs without server-side processing.

Live demo: https://front-end-svgconverter.vercel.app/

## Features

- **Dual Conversion Modes**:
  - **Line Art**: Creates smooth, precise outlines with Bezier curves
  - **Silhouette**: Generates solid-filled vector shapes with optimized paths
- **Real-time Processing**: Instantly see results as you adjust parameters
- **Mobile-Optimized Performance**:
  - Responsive layout with tabbed interface works on any device
  - Optimized processing pipeline for mobile devices with dynamic downsampling
  - Optional detailed rendering for mobile devices to prioritize UI responsiveness
- **Advanced Image Adjustments**:
  - Brightness, contrast, brilliance, and shadows controls
  - Source image inversion for negative effects
- **Powerful Vector Controls**:
  - Edge threshold for detail control
  - Curve smoothing with Bezier optimization
  - Line thickness adjustment
  - Color inversion option
  - Edge sensitivity fine-tuning
- **Noise Reduction**: Adjustable Gaussian blur pre-processing
- **High-Quality Output**: Download clean, optimized SVG files ready for use
- **Zero Dependencies**: No backend server required, all processing happens in your browser
- **Performance Optimized**: 
  - Progressive quality rendering system (fast preview → detailed output)
  - Adaptive processing based on device capabilities
  - Intelligent handling of user interactions to maintain responsive UI

## Usage

1. **Upload an Image**: 
   - Click the upload area or drag and drop an image file
   - Supported formats: JPG, PNG, GIF, BMP, WebP

2. **Adjust Parameters**:
   - Use the Vector Parameter tab to control SVG output style
   - Use the Image Parameter tab to enhance the source image
   - On mobile, toggle "Detailed Render" checkbox if you want high-quality previews

3. **Review Results**:
   - See real-time previews of Line Art and Silhouette modes
   - Compare with the original image

4. **Download Your SVG**:
   - Click the Download button under either Line Art or Silhouette preview
   - Files are saved with transparent backgrounds for easy integration into designs
   - Downloads are always high-quality regardless of preview settings

## Settings Guide

### Vector Parameters

- **Edge Threshold** (0-255): Determines which pixels are considered edges
  - Lower values capture more details and edges
  - Higher values create more simplified results

- **Detailed Render** (Mobile Only): Controls whether detailed processing occurs after slider adjustments
  - When unchecked: Fast previews only, better for performance and battery life
  - When checked: Higher quality rendering after you stop moving sliders

- **Blur Radius** (0.5-5.0): Controls noise reduction before processing
  - Higher values smooth out noise but may lose fine details
  - Lower values preserve details but may include unwanted noise

- **Edge Sensitivity** (0.8-5.0): Fine-tunes edge detection algorithm
  - Higher values detect more subtle edge transitions
  - Lower values focus on stronger, more obvious edges

- **Line Thickness** (2-7): Sets the stroke width for Line Art mode
  - Doesn't affect Silhouette mode, which uses filled paths

- **Line Smoothing** (0-100): Controls curve smoothness in both modes
  - Higher values create smoother, more simplified curves
  - Lower values follow the original pixel edges more closely

- **Invert Color**: Toggle to switch between black on white vs. white on black

### Image Parameters (pre-processing)

- **Brightness** (-100 to 100): Adjusts overall image lightness
- **Contrast** (-100 to 100): Enhances or reduces the difference between light and dark areas
- **Brilliance** (-100 to 100): Enhances mid-tones while preserving highlights and shadows
- **Shadows** (-100 to 100): Adjusts details specifically in darker areas
- **Invert Source Image**: Reverses image colors before processing

## Technical Implementation

- Built with vanilla JavaScript and HTML5 Canvas
- Uses Potrace algorithm for vector path generation
- Implements custom image processing with adjustable thresholds
- Optimized for both desktop and mobile devices
- Modular architecture with separate components for:
  - Core image processing
  - Mobile optimizations
  - Debug console and performance monitoring

## Performance Notes

- The application uses a tiered processing approach:
  - **Interactive Mode**: Fast, lower-quality previews during slider adjustments (150ms debounce on mobile, 10ms on desktop)
  - **Detailed Mode**: High-quality processing after user interaction stops (optional on mobile)
  - **Export Mode**: Maximum quality processing for downloads (always enabled)
- Processing large images may take longer, especially on mobile devices
- Increasing the blur radius can speed up processing on complex images
- Mobile devices use adaptive downsampling based on image size and processing mode

## Developer Features

- **Interactive Debug Console**:
  - Draggable, resizable console for performance monitoring
  - Shows processing times and state transitions
  - Toggle with double-press of Escape key
  - Message counter badge when minimized
  - Mobile-friendly with touch support

## Development

This project is open for contributions. To modify or extend:

1. Clone the repository
2. Make changes to the HTML, CSS, or JavaScript files
3. Test in a local browser environment

**Key Files**:
- `index.html`: Main UI layout and structure
- `potrace-demo.js`: Core application logic
- `potrace.js`: Vector tracing algorithm
- `mobile-optimizations.js`: Mobile-specific performance optimizations
- `debug-message.js`: Debug console implementation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Uses an optimized JavaScript port of Peter Selinger's [Potrace](http://potrace.sourceforge.net/) algorithm
- Built with vanilla JavaScript and HTML5 Canvas technology