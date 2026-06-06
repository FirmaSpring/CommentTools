export type DrawingTool = 'mouse' | 'pen' | 'eraser';

export interface CanvasPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface CanvasStroke {
  id?: string;
  tool: DrawingTool;
  color: string;
  trailColor: string;
  size: number;
  trail: number;
  points: CanvasPoint[];
  isFinished: boolean;
}

export interface CanvasState {
  committedStrokes: CanvasStroke[];
  currentStroke: CanvasStroke | null;
}

export function createCanvasState(): CanvasState {
  return {
    committedStrokes: [],
    currentStroke: null,
  };
}

export function beginStroke(
  state: CanvasState,
  tool: DrawingTool,
  color: string,
  size: number,
  trail: number,
  point: CanvasPoint,
  trailColor = color,
  strokeId?: string,
): CanvasState {
  if (tool === 'mouse') {
    return state;
  }

  return {
    ...state,
    currentStroke: {
      id: strokeId,
      tool,
      color,
      trailColor,
      size,
      trail,
      points: [point],
      isFinished: false,
    },
  };
}

export function appendPoint(state: CanvasState, point: CanvasPoint): CanvasState {
  if (!state.currentStroke) {
    return state;
  }

  return {
    ...state,
    currentStroke: {
      ...state.currentStroke,
      points: [...state.currentStroke.points, point],
    },
  };
}

export function finishStroke(state: CanvasState): CanvasState {
  if (!state.currentStroke) {
    return state;
  }

  return {
    ...state,
    currentStroke: {
      ...state.currentStroke,
      isFinished: true,
    },
  };
}

export function commitStroke(state: CanvasState): CanvasState {
  if (!state.currentStroke || state.currentStroke.points.length === 0) {
    return {
      ...state,
      currentStroke: null,
    };
  }

  return {
    committedStrokes: [...state.committedStrokes, state.currentStroke],
    currentStroke: null,
  };
}

export function undoLastStroke(state: CanvasState): CanvasState {
  return {
    ...state,
    committedStrokes: state.committedStrokes.slice(0, -1),
  };
}

export function clearCommittedStrokes(): CanvasState {
  return {
    committedStrokes: [],
    currentStroke: null,
  };
}

export function syncCommittedStrokesWithObjectIds(
  state: CanvasState,
  objectIds: string[],
): CanvasState {
  const allowedIds = new Set(objectIds);

  return {
    ...state,
    committedStrokes: state.committedStrokes.filter((stroke) => {
      if (!stroke.id) {
        return true;
      }

      return allowedIds.has(stroke.id);
    }),
  };
}

export function getRenderableStrokes(state: CanvasState, now: number): CanvasStroke[] {
  return state.committedStrokes
    .map((stroke) => ({
      ...stroke,
      points: filterTrailPoints(stroke.points, stroke.trail, now),
    }))
    .filter((stroke) => stroke.points.length > 0);
}

function filterTrailPoints(points: CanvasPoint[], trail: number, now: number): CanvasPoint[] {
  if (trail <= 0) {
    return points;
  }

  const maxAge = trail * 10;
  return points.filter((point) => now - point.timestamp <= maxAge);
}
