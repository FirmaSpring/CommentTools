export type CanvasShapeType = 'line' | 'ellipse' | 'rect' | 'arrow';

export type StrokeCanvasObject = {
  kind: 'stroke';
  id: string;
};

export type ShapeCanvasObject = {
  kind: 'shape';
  id: string;
  shapeType: CanvasShapeType;
  strokeId?: string;
};

export type TextCanvasObject = {
  kind: 'text';
  id: string;
  text: string;
  fontSize?: number;
  targetIds?: string[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color?: string;
};

export type CanvasObject = StrokeCanvasObject | ShapeCanvasObject | TextCanvasObject;

export interface CanvasObjectsState {
  objects: CanvasObject[];
}

export function createCanvasObjectsState(): CanvasObjectsState {
  return { objects: [] };
}

export function appendStrokeObject(
  state: CanvasObjectsState,
  object: StrokeCanvasObject,
): CanvasObjectsState {
  return {
    objects: [...state.objects, object],
  };
}

export function appendShapeObject(
  state: CanvasObjectsState,
  object: ShapeCanvasObject,
): CanvasObjectsState {
  return {
    objects: [...state.objects, object],
  };
}

export function appendTextObject(
  state: CanvasObjectsState,
  object: TextCanvasObject,
): CanvasObjectsState {
  return {
    objects: [...state.objects, object],
  };
}

export function undoLastCanvasObject(state: CanvasObjectsState): CanvasObjectsState {
  return {
    objects: state.objects.slice(0, -1),
  };
}

export function clearCanvasObjects(): CanvasObjectsState {
  return {
    objects: [],
  };
}

export function replaceStrokeObjectsWithText(
  state: CanvasObjectsState,
  targetIds: string[],
  textObject: TextCanvasObject,
): CanvasObjectsState {
  const targetIdSet = new Set(targetIds);

  return {
    objects: [
      ...state.objects.filter((object) => {
        if (object.kind === 'stroke') {
          return !targetIdSet.has(object.id);
        }

        return true;
      }),
      textObject,
    ],
  };
}

export function getCanvasObjectStrokeIds(state: CanvasObjectsState): string[] {
  return state.objects.flatMap((object) => {
    if (object.kind === 'stroke') {
      return [object.id];
    }

    if (object.kind === 'shape' && object.strokeId) {
      return [object.strokeId];
    }

    return [];
  });
}

export function getRecognizedTextTargetGroups(state: CanvasObjectsState): string[][] {
  return state.objects.flatMap((object) => {
    if (object.kind === 'text' && object.targetIds && object.targetIds.length > 0) {
      return [object.targetIds];
    }

    return [];
  });
}
