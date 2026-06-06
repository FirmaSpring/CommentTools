export interface RecognitionBarViewport {
  width: number;
  height: number;
}

export interface RecognitionBarBounds {
  top: number;
  width: number;
  maxHeight: number;
}

export function getRecognitionBarBounds(viewport: RecognitionBarViewport): RecognitionBarBounds {
  const top = 24;
  const horizontalMargin = 16;

  return {
    top,
    width: Math.max(280, Math.min(420, viewport.width - horizontalMargin * 2)),
    maxHeight: Math.max(180, viewport.height - top - 24),
  };
}

export function getRecognitionBarTheme() {
  return {
    backgroundColor: 'rgb(20, 19, 20)',
    borderColor: 'rgba(255, 255, 255, 0.78)',
    focusBorderColor: 'rgba(255, 255, 255, 0.96)',
    shadowColor: 'rgba(255, 255, 255, 0.22)',
  };
}
