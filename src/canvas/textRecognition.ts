export interface InkBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HandwritingStrokeMeta {
  id: string;
  endAt: number;
  bounds: InkBounds;
}

export interface RecognitionDraft {
  text: string;
  fontSize: number;
  targetIds: string[];
  bounds: InkBounds;
}

const TEXT_RECOGNITION_DELAY_MS = 3000;
const HANDWRITING_LINE_GAP_PX = 30;
const HANDWRITING_STROKE_GAP_PX = 40;
const HANDWRITING_STROKE_GAP_MS = 800;
const MINIMUM_TEXT_FONT_SIZE = 16;

export function shouldTriggerTextRecognition(
  lastStrokeEndAt: number,
  now: number,
): boolean {
  return now - lastStrokeEndAt >= TEXT_RECOGNITION_DELAY_MS;
}

export function groupHandwritingBatch(
  strokes: HandwritingStrokeMeta[],
): HandwritingStrokeMeta[][] {
  if (strokes.length === 0) {
    return [];
  }

  const groups: HandwritingStrokeMeta[][] = [[strokes[0]]];

  for (let index = 1; index < strokes.length; index += 1) {
    const previous = strokes[index - 1];
    const current = strokes[index];
    const sameLine = Math.abs(current.bounds.y - previous.bounds.y) < HANDWRITING_LINE_GAP_PX;
    const nearPrevious =
      current.bounds.x - (previous.bounds.x + previous.bounds.width) <
      HANDWRITING_STROKE_GAP_PX;
    const closeInTime = current.endAt - previous.endAt < HANDWRITING_STROKE_GAP_MS;

    if (sameLine && nearPrevious && closeInTime) {
      groups[groups.length - 1]?.push(current);
      continue;
    }

    groups.push([current]);
  }

  return groups;
}

export function estimateTextFontSize(bounds: Pick<InkBounds, 'height'>): number {
  return Math.max(MINIMUM_TEXT_FONT_SIZE, Math.round(bounds.height));
}

export function buildRecognitionDraft(strokes: HandwritingStrokeMeta[]): RecognitionDraft {
  const bounds = mergeInkBounds(strokes.map((stroke) => stroke.bounds));

  return {
    text: '手写识别候选',
    fontSize: estimateTextFontSize(bounds),
    targetIds: strokes.map((stroke) => stroke.id),
    bounds,
  };
}

function isSameTargetGroup(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

export function buildPendingRecognitionDrafts(
  strokes: HandwritingStrokeMeta[],
  ignoredTargetGroups: string[][] = [],
): RecognitionDraft[] {
  return groupHandwritingBatch(strokes)
    .map((group) => buildRecognitionDraft(group))
    .filter(
      (draft) =>
        !ignoredTargetGroups.some((targetGroup) => isSameTargetGroup(targetGroup, draft.targetIds)),
    );
}

function mergeInkBounds(boundsList: InkBounds[]): InkBounds {
  const [firstBounds] = boundsList;

  if (!firstBounds) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const minX = Math.min(...boundsList.map((bounds) => bounds.x));
  const minY = Math.min(...boundsList.map((bounds) => bounds.y));
  const maxX = Math.max(...boundsList.map((bounds) => bounds.x + bounds.width));
  const maxY = Math.max(...boundsList.map((bounds) => bounds.y + bounds.height));

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}
