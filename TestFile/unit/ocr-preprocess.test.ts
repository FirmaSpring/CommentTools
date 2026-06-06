import { describe, expect, it } from 'vitest';
import {
  applyOcrPreprocess,
  createBinaryMask,
  getInkColumnSegments,
} from '../../src/canvas/ocrPreprocess';

describe('ocrPreprocess', () => {
  it('turns dark handwriting pixels into a binary mask while keeping the light background white', () => {
    const mask = createBinaryMask(
      new Uint8ClampedArray([
        255, 255, 255, 255,
        240, 240, 240, 255,
        24, 24, 24, 255,
        12, 12, 12, 255,
      ]),
    );

    expect(Array.from(mask)).toEqual([0, 0, 1, 1]);
  });

  it('thickens a single handwriting pixel so OCR receives a stronger stroke', () => {
    const processed = applyOcrPreprocess(
      new Uint8ClampedArray([
        255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
        255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255,
        255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      ]),
      3,
      3,
    );

    const centerRow = Array.from(processed.slice(12, 24));
    expect(centerRow).toEqual([
      0, 0, 0, 255,
      0, 0, 0, 255,
      0, 0, 0, 255,
    ]);
  });

  it('finds multiple character-sized ink segments from one connected handwriting batch image', () => {
    const mask = new Uint8Array([
      0, 1, 1, 0, 0, 0, 1, 1, 0,
      0, 1, 1, 0, 0, 0, 1, 1, 0,
      0, 1, 1, 0, 0, 0, 1, 1, 0,
    ]);

    expect(getInkColumnSegments(mask, 9, 3)).toEqual([
      { start: 1, end: 2 },
      { start: 6, end: 7 },
    ]);
  });
});
