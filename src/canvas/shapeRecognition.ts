export interface ShapePoint {
  x: number;
  y: number;
}

export type RecognizedShapeKind = 'line' | 'ellipse' | 'rect' | 'arrow' | 'freehand';
export type ShapeConfidence = 'high' | 'low';

export interface ShapeCandidateResult {
  kind: RecognizedShapeKind;
  confidence: ShapeConfidence;
}

export function getAssistPreviewShapeType(
  points: ShapePoint[],
): Exclude<RecognizedShapeKind, 'freehand'> | null {
  const result = classifyShapeCandidate(points);
  if (result.confidence !== 'high' || result.kind === 'freehand') {
    return null;
  }

  return result.kind;
}

export function classifyShapeCandidate(points: ShapePoint[]): ShapeCandidateResult {
  if (points.length < 2) {
    return { kind: 'freehand', confidence: 'low' };
  }

  if (isArrow(points)) {
    return { kind: 'arrow', confidence: 'high' };
  }

  if (isClosedPath(points)) {
    if (isRectangle(points)) {
      return { kind: 'rect', confidence: 'high' };
    }

    if (isEllipse(points)) {
      return { kind: 'ellipse', confidence: 'high' };
    }
  }

  if (isLine(points)) {
    return { kind: 'line', confidence: 'high' };
  }

  return { kind: 'freehand', confidence: 'low' };
}

function isClosedPath(points: ShapePoint[]): boolean {
  const first = points[0];
  const last = points[points.length - 1];

  return getDistance(first, last) <= 4;
}

function isLine(points: ShapePoint[]): boolean {
  const start = points[0];
  const end = points[points.length - 1];
  const length = getDistance(start, end);

  if (length < 12) {
    return false;
  }

  const maxDeviation = Math.max(
    ...points.map((point) => getDistanceToSegment(point, start, end)),
  );

  return maxDeviation <= Math.max(2.5, length * 0.08);
}

function isRectangle(points: ShapePoint[]): boolean {
  if (points.length < 5) {
    return false;
  }

  const openPoints = points.slice(0, -1);
  const bounds = getBounds(openPoints);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  if (width < 8 || height < 8) {
    return false;
  }

  const edgeThreshold = Math.max(3, Math.min(width, height) * 0.14);
  const cornerThreshold = Math.max(4, Math.min(width, height) * 0.18);
  const nearEdgeCount = openPoints.filter((point) => {
    const distanceToEdge = Math.min(
      Math.abs(point.x - bounds.minX),
      Math.abs(point.x - bounds.maxX),
      Math.abs(point.y - bounds.minY),
      Math.abs(point.y - bounds.maxY),
    );

    return distanceToEdge <= edgeThreshold;
  }).length;

  const hasTopLeft = openPoints.some(
    (point) =>
      Math.abs(point.x - bounds.minX) <= cornerThreshold &&
      Math.abs(point.y - bounds.minY) <= cornerThreshold,
  );
  const hasTopRight = openPoints.some(
    (point) =>
      Math.abs(point.x - bounds.maxX) <= cornerThreshold &&
      Math.abs(point.y - bounds.minY) <= cornerThreshold,
  );
  const hasBottomRight = openPoints.some(
    (point) =>
      Math.abs(point.x - bounds.maxX) <= cornerThreshold &&
      Math.abs(point.y - bounds.maxY) <= cornerThreshold,
  );
  const hasBottomLeft = openPoints.some(
    (point) =>
      Math.abs(point.x - bounds.minX) <= cornerThreshold &&
      Math.abs(point.y - bounds.maxY) <= cornerThreshold,
  );

  return (
    nearEdgeCount / openPoints.length >= 0.75 &&
    hasTopLeft &&
    hasTopRight &&
    hasBottomRight &&
    hasBottomLeft
  );
}

function isEllipse(points: ShapePoint[]): boolean {
  if (points.length < 5) {
    return false;
  }

  const bounds = getBounds(points.slice(0, -1));
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  if (width < 8 || height < 8) {
    return false;
  }

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const hasLeft = points.some((point) => point.x <= centerX - width * 0.25);
  const hasRight = points.some((point) => point.x >= centerX + width * 0.25);
  const hasTop = points.some((point) => point.y <= centerY - height * 0.25);
  const hasBottom = points.some((point) => point.y >= centerY + height * 0.25);

  return hasLeft && hasRight && hasTop && hasBottom;
}

function isArrow(points: ShapePoint[]): boolean {
  if (points.length < 5) {
    return false;
  }

  for (let index = 1; index <= points.length - 3; index += 1) {
    const tipA = points[index];
    const wing = points[index + 1];
    const tipB = points[index + 2];

    if (getDistance(tipA, tipB) > 1) {
      continue;
    }

    const trunkLength = getDistance(points[0], tipA);
    const wingLength = getDistance(tipA, wing);

    if (trunkLength < 12 || wingLength < 3) {
      continue;
    }

    return true;
  }

  return false;
}

function getDistance(pointA: ShapePoint, pointB: ShapePoint): number {
  const dx = pointB.x - pointA.x;
  const dy = pointB.y - pointA.y;

  return Math.hypot(dx, dy);
}

function getDistanceToSegment(point: ShapePoint, start: ShapePoint, end: ShapePoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return getDistance(point, start);
  }

  const ratio = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );
  const projectedPoint = {
    x: start.x + dx * ratio,
    y: start.y + dy * ratio,
  };

  return getDistance(point, projectedPoint);
}

function getBounds(points: ShapePoint[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}
