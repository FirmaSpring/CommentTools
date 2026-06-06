import { describe, expect, it } from 'vitest';
import {
  getRecognitionBarBounds,
  getRecognitionBarTheme,
} from '../../src/canvas/recognitionBarModel';

describe('recognitionBarModel', () => {
  it('keeps the recognition bar inside the viewport on narrow screens', () => {
    expect(getRecognitionBarBounds({ width: 360, height: 800 })).toEqual({
      top: 24,
      width: 328,
      maxHeight: 752,
    });
  });

  it('uses the requested 20,19,20 dark surface with a white breathing border', () => {
    expect(getRecognitionBarTheme()).toEqual({
      backgroundColor: 'rgb(20, 19, 20)',
      borderColor: 'rgba(255, 255, 255, 0.78)',
      focusBorderColor: 'rgba(255, 255, 255, 0.96)',
      shadowColor: 'rgba(255, 255, 255, 0.22)',
    });
  });
});
