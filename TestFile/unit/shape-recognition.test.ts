import { describe, expect, it } from 'vitest';
import {
  classifyShapeCandidate,
  getAssistPreviewShapeType,
} from '../../src/canvas/shapeRecognition';

describe('shapeRecognition', () => {
  it('classifies nearly straight input as line', () => {
    const result = classifyShapeCandidate([
      { x: 0, y: 0 },
      { x: 20, y: 1 },
      { x: 40, y: 2 },
    ]);

    expect(result).toEqual({ kind: 'line', confidence: 'high' });
  });

  it('keeps unknown scribble as freehand with low confidence', () => {
    const result = classifyShapeCandidate([
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 5, y: 2 },
      { x: 30, y: 18 },
    ]);

    expect(result).toEqual({ kind: 'freehand', confidence: 'low' });
  });

  it('classifies a closed round path as ellipse', () => {
    const result = classifyShapeCandidate([
      { x: 10, y: 0 },
      { x: 18, y: 6 },
      { x: 10, y: 12 },
      { x: 2, y: 6 },
      { x: 10, y: 0 },
    ]);

    expect(result).toEqual({ kind: 'ellipse', confidence: 'high' });
  });

  it('classifies four-corner input as rect', () => {
    const result = classifyShapeCandidate([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 24 },
      { x: 0, y: 24 },
      { x: 0, y: 0 },
    ]);

    expect(result).toEqual({ kind: 'rect', confidence: 'high' });
  });

  it('recognizes a hand-drawn box with slightly uneven corners as rect', () => {
    const result = classifyShapeCandidate([
      { x: 2, y: 1 },
      { x: 18, y: 0 },
      { x: 39, y: 2 },
      { x: 40, y: 11 },
      { x: 38, y: 24 },
      { x: 22, y: 25 },
      { x: 3, y: 23 },
      { x: 0, y: 11 },
      { x: 2, y: 1 },
    ]);

    expect(result).toEqual({ kind: 'rect', confidence: 'high' });
  });

  it('recognizes a hand-drawn circle as ellipse even when points are not perfectly symmetric', () => {
    const result = classifyShapeCandidate([
      { x: 20, y: 1 },
      { x: 30, y: 4 },
      { x: 38, y: 12 },
      { x: 39, y: 21 },
      { x: 31, y: 31 },
      { x: 20, y: 36 },
      { x: 9, y: 31 },
      { x: 2, y: 21 },
      { x: 3, y: 11 },
      { x: 11, y: 3 },
      { x: 20, y: 1 },
    ]);

    expect(result).toEqual({ kind: 'ellipse', confidence: 'high' });
  });

  it('classifies a trunk with a pointed end as arrow', () => {
    const result = classifyShapeCandidate([
      { x: 0, y: 10 },
      { x: 20, y: 10 },
      { x: 16, y: 6 },
      { x: 20, y: 10 },
      { x: 16, y: 14 },
    ]);

    expect(result).toEqual({ kind: 'arrow', confidence: 'high' });
  });

  it('returns a preview shape for high confidence assist candidates', () => {
    const preview = getAssistPreviewShapeType([
      { x: 0, y: 0 },
      { x: 20, y: 1 },
      { x: 40, y: 2 },
    ]);

    expect(preview).toBe('line');
  });

  it('returns null for low confidence assist candidates', () => {
    const preview = getAssistPreviewShapeType([
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 5, y: 2 },
      { x: 30, y: 18 },
    ]);

    expect(preview).toBeNull();
  });
});
