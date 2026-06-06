import { describe, expect, it } from 'vitest';
import {
  buildRecognitionDraft,
  buildPendingRecognitionDrafts,
  estimateTextFontSize,
  groupHandwritingBatch,
  shouldTriggerTextRecognition,
} from '../../src/canvas/textRecognition';

describe('textRecognition', () => {
  it('triggers recognition after three seconds of inactivity', () => {
    expect(shouldTriggerTextRecognition(1000, 4001)).toBe(true);
    expect(shouldTriggerTextRecognition(1000, 3999)).toBe(false);
  });

  it('keeps nearby strokes in one handwriting batch', () => {
    const groups = groupHandwritingBatch([
      {
        id: 'a',
        endAt: 1000,
        bounds: { x: 0, y: 0, width: 20, height: 20 },
      },
      {
        id: 'b',
        endAt: 1200,
        bounds: { x: 24, y: 2, width: 20, height: 18 },
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.map((stroke) => stroke.id)).toEqual(['a', 'b']);
  });

  it('splits handwriting batches when strokes drift apart', () => {
    const groups = groupHandwritingBatch([
      {
        id: 'a',
        endAt: 1000,
        bounds: { x: 0, y: 0, width: 20, height: 20 },
      },
      {
        id: 'b',
        endAt: 2200,
        bounds: { x: 90, y: 45, width: 20, height: 18 },
      },
    ]);

    expect(groups).toHaveLength(2);
  });

  it('estimates font size from handwriting height', () => {
    expect(estimateTextFontSize({ width: 100, height: 36 })).toBe(36);
  });

  it('clamps the estimated font size to a readable minimum', () => {
    expect(estimateTextFontSize({ width: 20, height: 9 })).toBe(16);
  });

  it('builds a recognition draft from a grouped handwriting batch', () => {
    const draft = buildRecognitionDraft([
      {
        id: 'a',
        endAt: 1000,
        bounds: { x: 10, y: 20, width: 20, height: 18 },
      },
      {
        id: 'b',
        endAt: 1200,
        bounds: { x: 36, y: 22, width: 24, height: 20 },
      },
    ]);

    expect(draft).toEqual({
      text: '手写识别候选',
      fontSize: 22,
      targetIds: ['a', 'b'],
      bounds: { x: 10, y: 20, width: 50, height: 22 },
    });
  });

  it('keeps a short handwritten phrase in one group even when the character gap is wider', () => {
    const groups = groupHandwritingBatch([
      { id: 's1', endAt: 1000, bounds: { x: 0, y: 12, width: 10, height: 24 } },
      { id: 's2', endAt: 1060, bounds: { x: 8, y: 10, width: 14, height: 28 } },
      { id: 's3', endAt: 1120, bounds: { x: 14, y: 14, width: 12, height: 20 } },
      { id: 's4', endAt: 1180, bounds: { x: 62, y: 11, width: 16, height: 26 } },
      { id: 's5', endAt: 1240, bounds: { x: 70, y: 13, width: 14, height: 24 } },
      { id: 's6', endAt: 1300, bounds: { x: 78, y: 9, width: 12, height: 28 } },
      { id: 's7', endAt: 1360, bounds: { x: 86, y: 14, width: 10, height: 22 } },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.map((stroke) => stroke.id)).toEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7']);
  });

  it('builds pending recognition drafts from every unresolved handwriting group on screen', () => {
    const drafts = buildPendingRecognitionDrafts(
      [
        { id: 'a1', endAt: 1000, bounds: { x: 0, y: 0, width: 18, height: 22 } },
        { id: 'a2', endAt: 1100, bounds: { x: 22, y: 2, width: 18, height: 20 } },
        { id: 'b1', endAt: 2500, bounds: { x: 120, y: 4, width: 16, height: 24 } },
        { id: 'b2', endAt: 2600, bounds: { x: 140, y: 6, width: 16, height: 22 } },
      ],
      [['a1', 'a2']],
    );

    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.targetIds).toEqual(['b1', 'b2']);
  });
});
