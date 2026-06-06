import { describe, expect, it } from 'vitest';
import {
  appendPoint,
  beginStroke,
  clearCommittedStrokes,
  commitStroke,
  createCanvasState,
  finishStroke,
  getRenderableStrokes,
  syncCommittedStrokesWithObjectIds,
  undoLastStroke,
} from '../../src/canvas/canvasState';

describe('canvasState', () => {
  it('commits a finished pen stroke into history', () => {
    let state = createCanvasState();

    state = beginStroke(state, 'pen', '#ff0000', 6, 0, { x: 10, y: 10, timestamp: 100 });
    state = appendPoint(state, { x: 20, y: 20, timestamp: 120 });
    state = finishStroke(state);
    state = commitStroke(state);

    expect(state.committedStrokes).toHaveLength(1);
    expect(state.committedStrokes[0].tool).toBe('pen');
    expect(state.currentStroke).toBeNull();
  });

  it('undo removes the last committed stroke only', () => {
    let state = createCanvasState();

    state = beginStroke(state, 'pen', '#ff0000', 4, 0, { x: 0, y: 0, timestamp: 100 });
    state = appendPoint(state, { x: 5, y: 5, timestamp: 120 });
    state = finishStroke(state);
    state = commitStroke(state);

    state = beginStroke(state, 'eraser', '#000000', 10, 0, { x: 10, y: 10, timestamp: 200 });
    state = appendPoint(state, { x: 15, y: 15, timestamp: 220 });
    state = finishStroke(state);
    state = commitStroke(state);

    state = undoLastStroke(state);

    expect(state.committedStrokes).toHaveLength(1);
    expect(state.committedStrokes[0].tool).toBe('pen');
  });

  it('clear removes all committed strokes and active draft stroke', () => {
    let state = createCanvasState();

    state = beginStroke(state, 'pen', '#00ff00', 8, 0, { x: 1, y: 1, timestamp: 100 });
    state = appendPoint(state, { x: 4, y: 4, timestamp: 110 });
    state = finishStroke(state);
    state = commitStroke(state);
    state = beginStroke(state, 'pen', '#00ff00', 8, 0, { x: 10, y: 10, timestamp: 120 });

    state = clearCommittedStrokes(state);

    expect(state.committedStrokes).toHaveLength(0);
    expect(state.currentStroke).toBeNull();
  });

  it('filters trail points by age for renderable output', () => {
    let state = createCanvasState();

    state = beginStroke(state, 'pen', '#ffffff', 5, 50, { x: 0, y: 0, timestamp: 1000 });
    state = appendPoint(state, { x: 10, y: 10, timestamp: 1400 });
    state = appendPoint(state, { x: 20, y: 20, timestamp: 1800 });
    state = finishStroke(state);
    state = commitStroke(state);

    const visible = getRenderableStrokes(state, 2000);

    expect(visible).toHaveLength(1);
    expect(visible[0].points).toEqual([{ x: 20, y: 20, timestamp: 1800 }]);
  });

  it('keeps only strokes referenced by the remaining canvas objects', () => {
    const state = syncCommittedStrokesWithObjectIds(
      {
        committedStrokes: [
          {
            id: 's1',
            tool: 'pen',
            color: '#ff0000',
            trailColor: '#ff0000',
            size: 4,
            trail: 0,
            points: [{ x: 0, y: 0, timestamp: 100 }],
            isFinished: true,
          },
          {
            id: 's2',
            tool: 'pen',
            color: '#00ff00',
            trailColor: '#00ff00',
            size: 4,
            trail: 0,
            points: [{ x: 10, y: 10, timestamp: 120 }],
            isFinished: true,
          },
        ],
        currentStroke: null,
      },
      ['s1'],
    );

    expect(state.committedStrokes.map((stroke) => stroke.id)).toEqual(['s1']);
  });
});
