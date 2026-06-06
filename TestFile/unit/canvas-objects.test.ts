import { describe, expect, it } from 'vitest';
import {
  appendShapeObject,
  appendStrokeObject,
  appendTextObject,
  clearCanvasObjects,
  createCanvasObjectsState,
  getRecognizedTextTargetGroups,
  replaceStrokeObjectsWithText,
  undoLastCanvasObject,
} from '../../src/canvas/canvasObjects';

describe('canvasObjects', () => {
  it('stores stroke, shape and text objects in one stack', () => {
    const state = appendTextObject(
      appendShapeObject(
        appendStrokeObject(createCanvasObjectsState(), { kind: 'stroke', id: 's1' }),
        { kind: 'shape', id: 'g1', shapeType: 'line' },
      ),
      { kind: 'text', id: 't1', text: '我是学生' },
    );

    expect(state.objects.map((item) => item.kind)).toEqual(['stroke', 'shape', 'text']);
  });

  it('undoes the last object regardless of kind', () => {
    const state = undoLastCanvasObject({
      objects: [
        { kind: 'stroke', id: 's1' },
        { kind: 'shape', id: 'g1', shapeType: 'rect' },
      ],
    });

    expect(state.objects).toEqual([{ kind: 'stroke', id: 's1' }]);
  });

  it('undoes text objects the same way as strokes', () => {
    const state = undoLastCanvasObject({
      objects: [
        { kind: 'stroke', id: 's1' },
        { kind: 'text', id: 't1', text: '我爱你' },
      ],
    });

    expect(state.objects).toEqual([{ kind: 'stroke', id: 's1' }]);
  });

  it('clears all objects at once', () => {
    expect(clearCanvasObjects({ objects: [{ kind: 'text', id: 't1', text: '我' }] })).toEqual({
      objects: [],
    });
  });

  it('replaces target stroke objects with one text object after confirmation', () => {
    const state = replaceStrokeObjectsWithText(
      {
        objects: [
          { kind: 'stroke', id: 's1' },
          { kind: 'stroke', id: 's2' },
          { kind: 'shape', id: 'shape-1', shapeType: 'line', strokeId: 's3' },
        ],
      },
      ['s1', 's2'],
      {
        kind: 'text',
        id: 'text-1',
        text: '我',
        targetIds: ['s1', 's2'],
      },
    );

    expect(state.objects).toEqual([
      { kind: 'shape', id: 'shape-1', shapeType: 'line', strokeId: 's3' },
      { kind: 'text', id: 'text-1', text: '我', targetIds: ['s1', 's2'] },
    ]);
  });

  it('returns recognized text target groups so OCR can skip already replaced handwriting', () => {
    expect(
      getRecognizedTextTargetGroups({
        objects: [
          { kind: 'stroke', id: 's1' },
          { kind: 'text', id: 't1', text: '你好', targetIds: ['s2', 's3'] },
          { kind: 'text', id: 't2', text: '世界' },
        ],
      }),
    ).toEqual([['s2', 's3']]);
  });
});
