# Image to SVG Line Art Playground

A powerful client-side tool for converting images to SVG line art with both outline and silhouette modes.

## Features

- **Real-time Preview**: See changes instantly as you adjust settings
- **Dual Output Formats**: 
  - Line Art Mode: Captures outlines with smooth Bezier curves
  - Silhouette Mode: Creates filled black and white shapes
- **Advanced Image Processing**:
  - Adaptive edge detection with sensitivity controls
  - Gaussian blur for noise reduction
  - Image adjustments (brightness, contrast, brilliance, shadows)
  - Line smoothing with Bezier curve optimization
- **No Server Processing**: All conversion happens in your browser
- **Transparent Background**: Downloaded SVGs have transparent backgrounds

## Usage

1. Upload an image by clicking the upload area
2. Adjust settings in the control panel to fine-tune the conversion
3. Download your preferred SVG format (Line Art or Silhouette)

## Settings

### Basic Controls
- **Edge Threshold**: Controls edge detection sensitivity (lower values detect more edges)
- **Line Smoothing**: Adjusts the smoothness of the traced lines
- **Line Thickness**: Sets the stroke width of lines in the SVG
- **White on Black Background**: Inverts colors (white lines on black background)

### Image Adjustment
- **Brightness**: Adjusts overall image brightness
- **Contrast**: Enhances difference between light and dark areas
- **Brilliance**: Enhances mid-tones
- **Shadows**: Adjusts details in dark areas

### Edge Detection Settings
- **Blur Radius**: Reduces noise before processing
- **Edge Sensitivity**: Amplifies edge detection strength

## Technologies Used
- Vanilla JavaScript
- HTML5 Canvas for image processing
- SVG for vector output

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements
- Inspired by Potrace algorithm and various edge detection techniques
- No external dependencies or libraries