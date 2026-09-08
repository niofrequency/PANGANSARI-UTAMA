// `jsqr` ships no bundled TypeScript types and there's no @types package —
// this is the minimal shape QrScanner.tsx actually uses.
declare module 'jsqr' {
  interface QRCodePoint {
    x: number;
    y: number;
  }

  interface QRCode {
    data: string;
    location: {
      topLeftCorner: QRCodePoint;
      topRightCorner: QRCodePoint;
      bottomLeftCorner: QRCodePoint;
      bottomRightCorner: QRCodePoint;
    };
  }

  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }
  ): QRCode | null;
}

// BarcodeDetector is a real, shipping browser API (Chrome/Edge/Android
// WebView) but isn't in TypeScript's default DOM lib yet — this is just
// enough of its shape for the feature-detected fast path in QrScanner.tsx.
// Firefox/Safari fall back to the jsQR path above instead.
interface BarcodeDetectorResult {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<BarcodeDetectorResult[]>;
}

interface Window {
  BarcodeDetector?: {
    new (options?: { formats: string[] }): BarcodeDetectorInstance;
  };
}
