import React, { useCallback, useEffect, useRef, useState } from 'react';
import './Canvas.css';
import {
  appendPoint,
  beginStroke,
  clearCommittedStrokes,
  commitStroke,
  createCanvasState,
  finishStroke,
  getRenderableStrokes,
  syncCommittedStrokesWithObjectIds,
  type CanvasPoint,
  type CanvasState,
  type CanvasStroke,
  type DrawingTool,
} from './canvasState';
import {
  appendShapeObject,
  appendStrokeObject,
  clearCanvasObjects,
  createCanvasObjectsState,
  getCanvasObjectStrokeIds,
  getRecognizedTextTargetGroups,
  replaceStrokeObjectsWithText,
  undoLastCanvasObject,
  type CanvasShapeType,
  type TextCanvasObject,
} from './canvasObjects';
import { getAssistPreviewShapeType } from './shapeRecognition';
import {
  buildPendingRecognitionDrafts,
  shouldTriggerTextRecognition,
  type HandwritingStrokeMeta,
  type InkBounds,
  type RecognitionDraft,
} from './textRecognition';
import { recognizeTextFromDataUrl, resetOcrWorker } from './ocrEngine';
import { applyOcrPreprocess, createBinaryMask, getInkColumnSegments } from './ocrPreprocess';
import { getRecognitionBarBounds, getRecognitionBarTheme } from './recognitionBarModel';
import {
  createOcrQueueState,
  enqueueLatestOcrJob,
  finishActiveOcrJob,
} from './ocrQueue';
import { getCanvasCursor } from '../toolbar/toolbarModel';

type SettingPayload = {
  type: 'color' | 'size' | 'trail' | 'trailColor' | 'assistMode';
  value: string | number | boolean;
};

type RecognitionBarState = {
  suggestionText: string;
  draftText: string;
  text: string;
  fontSize: number;
  targetIds: string[];
  bounds: InkBounds;
  isRecognizing: boolean;
};

const TEXT_RECOGNITION_IDLE_MS = 3000;

function getStrokeBounds(stroke: Pick<CanvasStroke, 'points'>): InkBounds {
  const [firstPoint] = stroke.points;

  if (!firstPoint) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = firstPoint.x;
  let maxX = firstPoint.x;
  let minY = firstPoint.y;
  let maxY = firstPoint.y;

  stroke.points.forEach((point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function isSameTargetIds(left: string[] | undefined, right: string[]): boolean {
  if (!left || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function createProcessedRecognitionCanvas(strokes: CanvasStroke[], bounds: InkBounds): HTMLCanvasElement | null {
  const padding = 24;
  const scale = 3;
  const canvas = document.createElement('canvas');
  const width = Math.max(96, Math.ceil(bounds.width + padding * 2));
  const height = Math.max(96, Math.ceil(bounds.height + padding * 2));
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#111111';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  strokes.forEach((stroke) => {
    if (stroke.points.length === 0) {
      return;
    }

    const projectX = (x: number) => x - bounds.x + padding;
    const projectY = (y: number) => y - bounds.y + padding;

    ctx.beginPath();
    ctx.lineWidth = Math.max(2, stroke.size);

    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      if (!point) {
        return;
      }

      ctx.arc(projectX(point.x), projectY(point.y), Math.max(2, stroke.size / 2), 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();
      return;
    }

    const firstPoint = stroke.points[0];
    if (!firstPoint) {
      return;
    }

    ctx.moveTo(projectX(firstPoint.x), projectY(firstPoint.y));
    for (let index = 1; index < stroke.points.length; index += 1) {
      const previous = stroke.points[index - 1];
      const current = stroke.points[index];
      if (!previous || !current) {
        continue;
      }

      const midpointX = (projectX(previous.x) + projectX(current.x)) / 2;
      const midpointY = (projectY(previous.y) + projectY(current.y)) / 2;
      ctx.quadraticCurveTo(projectX(previous.x), projectY(previous.y), midpointX, midpointY);
    }

    const lastPoint = stroke.points[stroke.points.length - 1];
    if (lastPoint) {
      ctx.lineTo(projectX(lastPoint.x), projectY(lastPoint.y));
    }
    ctx.stroke();
  });

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  imageData.data.set(applyOcrPreprocess(imageData.data, canvas.width, canvas.height));
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

function getRecognitionStrokeImageDataUrls(strokes: CanvasStroke[], bounds: InkBounds): string[] {
  const canvas = createProcessedRecognitionCanvas(strokes, bounds);
  if (!canvas) {
    return [];
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return [];
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mask = createBinaryMask(imageData.data);
  const segments = getInkColumnSegments(mask, canvas.width, canvas.height);
  if (segments.length <= 1) {
    return [canvas.toDataURL('image/png')];
  }

  const segmentPadding = 18;
  return segments.map((segment) => {
    const cropCanvas = document.createElement('canvas');
    const sourceX = Math.max(0, segment.start - segmentPadding);
    const sourceWidth = Math.min(
      canvas.width - sourceX,
      segment.end - segment.start + 1 + segmentPadding * 2,
    );
    const cropWidth = Math.max(32, sourceWidth);
    cropCanvas.width = cropWidth;
    cropCanvas.height = canvas.height;

    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) {
      return '';
    }

    cropCtx.fillStyle = '#ffffff';
    cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.drawImage(
      canvas,
      sourceX,
      0,
      sourceWidth,
      canvas.height,
      0,
      0,
      cropWidth,
      cropCanvas.height,
    );

    return cropCanvas.toDataURL('image/png');
  }).filter(Boolean);
}

export const CanvasApp: React.FC = () => {
  const recognitionBarTheme = getRecognitionBarTheme();
  const recognitionBarBounds = getRecognitionBarBounds({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<CanvasState>(createCanvasState());
  const objectStateRef = useRef(createCanvasObjectsState());
  const activeToolRef = useRef<DrawingTool>('mouse');
  const colorRef = useRef('#ff0000');
  const sizeRef = useRef(5);
  const trailRef = useRef(0);
  const trailColorRef = useRef('#7dd3fc');
  const assistModeRef = useRef(false);
  const textRecognitionModeRef = useRef(false);
  const handwritingStrokeMetaRef = useRef<HandwritingStrokeMeta[]>([]);
  const isDrawingRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const recognitionTimerRef = useRef<number | null>(null);
  const objectSequenceRef = useRef(0);
  const previewShapeTypeRef = useRef<CanvasShapeType | null>(null);
  const recognitionRequestRef = useRef(0);
  const ocrQueueRef = useRef(createOcrQueueState<RecognitionDraft>());

  const [activeTool, setActiveTool] = useState<DrawingTool>('mouse');
  const [cursorSize, setCursorSize] = useState(5);
  const [assistMode, setAssistMode] = useState(false);
  const [textRecognitionMode, setTextRecognitionMode] = useState(false);
  const [recognitionBar, setRecognitionBar] = useState<RecognitionBarState | null>(null);

  const createObjectId = useCallback((prefix: string) => {
    objectSequenceRef.current += 1;
    return `${prefix}-${objectSequenceRef.current}`;
  }, []);

  const scheduleFrame = useCallback(() => {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      drawFrame();
    });
  }, []);

  const getVisibleStroke = useCallback((stroke: CanvasStroke, now: number): CanvasStroke | null => {
    const visible = getRenderableStrokes(
      {
        committedStrokes: [stroke],
        currentStroke: null,
      },
      now,
    )[0];

    return visible ?? null;
  }, []);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: CanvasStroke) => {
    if (stroke.points.length === 0) {
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.trail > 0 && stroke.tool === 'pen' ? stroke.trailColor : stroke.color;
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      ctx.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
      if (stroke.tool === 'eraser') {
        ctx.fill();
      } else {
        ctx.fillStyle = stroke.trail > 0 && stroke.tool === 'pen' ? stroke.trailColor : stroke.color;
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let index = 1; index < stroke.points.length; index += 1) {
      const previous = stroke.points[index - 1];
      const current = stroke.points[index];
      const midpointX = (previous.x + current.x) / 2;
      const midpointY = (previous.y + current.y) / 2;
      ctx.quadraticCurveTo(previous.x, previous.y, midpointX, midpointY);
    }

    const lastPoint = stroke.points[stroke.points.length - 1];
    ctx.lineTo(lastPoint.x, lastPoint.y);
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawShape = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      shapeType: CanvasShapeType,
      stroke: CanvasStroke,
      isPreview = false,
    ) => {
      if (stroke.points.length === 0) {
        return;
      }

      const bounds = getStrokeBounds(stroke);
      const firstPoint = stroke.points[0];
      const lastPoint = stroke.points[stroke.points.length - 1];
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const arrowAngle = Math.atan2(lastPoint.y - firstPoint.y, lastPoint.x - firstPoint.x);
      const arrowLength = Math.max(10, stroke.size * 2.5);

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = stroke.color;
      if (isPreview) {
        ctx.setLineDash([10, 6]);
        ctx.globalAlpha = 0.92;
      }

      switch (shapeType) {
        case 'line':
          ctx.moveTo(firstPoint.x, firstPoint.y);
          ctx.lineTo(lastPoint.x, lastPoint.y);
          break;
        case 'rect':
          ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
          break;
        case 'ellipse':
          ctx.ellipse(
            centerX,
            centerY,
            Math.max(bounds.width / 2, 1),
            Math.max(bounds.height / 2, 1),
            0,
            0,
            Math.PI * 2,
          );
          break;
        case 'arrow':
          ctx.moveTo(firstPoint.x, firstPoint.y);
          ctx.lineTo(lastPoint.x, lastPoint.y);
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(
            lastPoint.x - arrowLength * Math.cos(arrowAngle - Math.PI / 6),
            lastPoint.y - arrowLength * Math.sin(arrowAngle - Math.PI / 6),
          );
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(
            lastPoint.x - arrowLength * Math.cos(arrowAngle + Math.PI / 6),
            lastPoint.y - arrowLength * Math.sin(arrowAngle + Math.PI / 6),
          );
          break;
      }

      ctx.stroke();
      ctx.restore();
    },
    [],
  );

  const drawTextObject = useCallback(
    (ctx: CanvasRenderingContext2D, object: TextCanvasObject) => {
      if (!object.bounds || !object.fontSize || !object.text) {
        return;
      }

      ctx.save();
      ctx.fillStyle = object.color ?? '#f8fafc';
      ctx.font = `600 ${object.fontSize}px "Microsoft YaHei", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(object.text, object.bounds.x, object.bounds.y);
      ctx.restore();
    },
    [],
  );

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();
    let needsAnotherFrame = isDrawingRef.current;

    const visibleCommitted = getRenderableStrokes(stateRef.current, now);
    const visibleById = new Map(
      visibleCommitted
        .filter((stroke): stroke is CanvasStroke & { id: string } => typeof stroke.id === 'string')
        .map((stroke) => [stroke.id, stroke]),
    );

    objectStateRef.current.objects.forEach((object) => {
      if (object.kind === 'text') {
        drawTextObject(ctx, object);
        return;
      }

      const strokeId = object.kind === 'shape' ? object.strokeId ?? object.id : object.id;
      const stroke = visibleById.get(strokeId);
      if (!stroke) {
        return;
      }

      if (object.kind === 'shape') {
        drawShape(ctx, object.shapeType, stroke);
      } else {
        drawStroke(ctx, stroke);
      }

      if (stroke.trail > 0) {
        needsAnotherFrame = true;
      }
    });

    if (stateRef.current.currentStroke) {
      const currentVisible = getVisibleStroke(stateRef.current.currentStroke, now);
      if (currentVisible) {
        const previewShapeType = previewShapeTypeRef.current;
        if (previewShapeType) {
          drawShape(ctx, previewShapeType, currentVisible, true);
        } else {
          drawStroke(ctx, currentVisible);
        }
        if (currentVisible.trail > 0) {
          needsAnotherFrame = true;
        }
      }
    }

    if (needsAnotherFrame) {
      scheduleFrame();
    }
  }, [drawShape, drawStroke, drawTextObject, getVisibleStroke, scheduleFrame]);

  const clearRecognitionTimer = useCallback(() => {
    if (recognitionTimerRef.current !== null) {
      window.clearTimeout(recognitionTimerRef.current);
      recognitionTimerRef.current = null;
    }
  }, []);

  const resetOcrProcessing = useCallback(() => {
    recognitionRequestRef.current += 1;
    ocrQueueRef.current = createOcrQueueState<RecognitionDraft>();
    void resetOcrWorker();
  }, []);

  const syncStrokesWithObjectStack = useCallback(() => {
    const strokeIds = getCanvasObjectStrokeIds(objectStateRef.current);
    stateRef.current = syncCommittedStrokesWithObjectIds(stateRef.current, strokeIds);
    const allowedStrokeIds = new Set(strokeIds);
    handwritingStrokeMetaRef.current = handwritingStrokeMetaRef.current.filter((stroke) =>
      allowedStrokeIds.has(stroke.id),
    );
  }, []);

  const buildRecognitionBarState = useCallback((draft: RecognitionDraft): RecognitionBarState => {
    return {
      suggestionText: '',
      draftText: '',
      text: 'OCR 识别中',
      fontSize: draft.fontSize,
      targetIds: draft.targetIds,
      bounds: draft.bounds,
      isRecognizing: true,
    };
  }, []);

  const performOcrForDraft = useCallback(
    async (draft: RecognitionDraft) => {
      const requestId = recognitionRequestRef.current + 1;
      recognitionRequestRef.current = requestId;
      const targetIdSet = new Set(draft.targetIds);
      const targetStrokes = stateRef.current.committedStrokes.filter(
        (stroke): stroke is CanvasStroke & { id: string } =>
          typeof stroke.id === 'string' && targetIdSet.has(stroke.id),
      );
      if (targetStrokes.length === 0) {
        setRecognitionBar((current) =>
          current && isSameTargetIds(current.targetIds, draft.targetIds)
            ? { ...current, text: '未找到可识别笔迹，请手动输入', isRecognizing: false }
            : current,
        );
        return;
      }

      const dataUrls = getRecognitionStrokeImageDataUrls(targetStrokes, draft.bounds);
      let ocrText = '';

      if (dataUrls.length > 1) {
        const segmentTexts: string[] = [];

        for (const dataUrl of dataUrls) {
          segmentTexts.push(await recognizeTextFromDataUrl(dataUrl));
        }

        ocrText = segmentTexts.join('');
      }

      if (!ocrText) {
        const fallbackDataUrl = dataUrls[0];
        ocrText = fallbackDataUrl ? await recognizeTextFromDataUrl(fallbackDataUrl) : '';
      }

      setRecognitionBar((current) => {
        if (
          !current ||
          !isSameTargetIds(current.targetIds, draft.targetIds) ||
          requestId !== recognitionRequestRef.current
        ) {
          return current;
        }

        return {
          ...current,
          suggestionText: ocrText,
          draftText: ocrText,
          text: ocrText ? 'OCR 识别结果' : '未识别到文本，请手动输入',
          isRecognizing: false,
        };
      });
    },
    [],
  );

  const drainOcrQueue = useCallback(async () => {
    const activeDraft = ocrQueueRef.current.active;
    if (!activeDraft) {
      return;
    }

    await performOcrForDraft(activeDraft);

    const finished = finishActiveOcrJob(ocrQueueRef.current);
    ocrQueueRef.current = finished.state;

    if (finished.jobToRun) {
      void drainOcrQueue();
    }
  }, [performOcrForDraft]);

  const runOcrForDraft = useCallback(
    (draft: RecognitionDraft) => {
      const queued = enqueueLatestOcrJob(ocrQueueRef.current, draft);
      ocrQueueRef.current = queued.state;

      if (!queued.jobToRun) {
        return;
      }

      void drainOcrQueue();
    },
    [drainOcrQueue],
  );

  const scheduleTextRecognition = useCallback(() => {
    clearRecognitionTimer();
    if (!textRecognitionModeRef.current) {
      return;
    }

    recognitionTimerRef.current = window.setTimeout(() => {
      const lastStroke = handwritingStrokeMetaRef.current[handwritingStrokeMetaRef.current.length - 1];
      if (!textRecognitionModeRef.current || !lastStroke) {
        return;
      }

      if (!shouldTriggerTextRecognition(lastStroke.endAt, Date.now())) {
        return;
      }

      if (recognitionBar) {
        return;
      }

      const drafts = buildPendingRecognitionDrafts(
        handwritingStrokeMetaRef.current,
        getRecognizedTextTargetGroups(objectStateRef.current),
      );
      const nextDraft = drafts[0];
      if (!nextDraft) {
        return;
      }

      setRecognitionBar((current) => {
        if (current && isSameTargetIds(current.targetIds, nextDraft.targetIds)) {
          return current;
        }

        return buildRecognitionBarState(nextDraft);
      });
      void runOcrForDraft(nextDraft);
      drawFrame();
    }, TEXT_RECOGNITION_IDLE_MS);
  }, [buildRecognitionBarState, clearRecognitionTimer, drawFrame, recognitionBar, runOcrForDraft]);

  const handleRecognitionDraftChange = useCallback((value: string) => {
    setRecognitionBar((current) => (current ? { ...current, draftText: value } : current));
  }, []);

  const queueNextPendingRecognition = useCallback(() => {
    const drafts = buildPendingRecognitionDrafts(
      handwritingStrokeMetaRef.current,
      getRecognizedTextTargetGroups(objectStateRef.current),
    );
    const nextDraft = drafts[0];

    if (!nextDraft) {
      return;
    }

    setRecognitionBar((current) => {
      if (current && isSameTargetIds(current.targetIds, nextDraft.targetIds)) {
        return current;
      }

      return buildRecognitionBarState(nextDraft);
    });
    void runOcrForDraft(nextDraft);
  }, [buildRecognitionBarState, recognitionBar, runOcrForDraft]);

  const handleKeepHandwriting = useCallback(() => {
    clearRecognitionTimer();
    resetOcrProcessing();
    setRecognitionBar(null);
  }, [clearRecognitionTimer, resetOcrProcessing]);

  const handleRetryRecognition = useCallback(() => {
    setRecognitionBar((current) => {
      if (!current) {
        return current;
      }

      const draft: RecognitionDraft = {
        text: current.suggestionText,
        fontSize: current.fontSize,
        targetIds: current.targetIds,
        bounds: current.bounds,
      };
      void runOcrForDraft(draft);
      return {
        ...current,
        text: 'OCR 重新识别中',
        isRecognizing: true,
      };
    });
  }, [runOcrForDraft]);

  const handleConfirmRecognition = useCallback(() => {
    setRecognitionBar((current) => {
      if (!current) {
        return current;
      }

      const confirmedText = current.draftText.trim() || current.suggestionText;
      if (!confirmedText || current.isRecognizing) {
        return current;
      }
      objectStateRef.current = replaceStrokeObjectsWithText(objectStateRef.current, current.targetIds, {
        kind: 'text',
        id: createObjectId('text'),
        text: confirmedText,
        fontSize: current.fontSize,
        targetIds: current.targetIds,
        bounds: current.bounds,
        color: colorRef.current,
      });
      syncStrokesWithObjectStack();
      drawFrame();
      return null;
    });
    queueNextPendingRecognition();
  }, [createObjectId, drawFrame, syncStrokesWithObjectStack]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const syncCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawFrame();
    };

    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);
    return () => window.removeEventListener('resize', syncCanvasSize);
  }, [drawFrame]);

  useEffect(() => {
    const { ipcRenderer } = window.require('electron');

    const handleToolChange = (_event: unknown, tool: DrawingTool | 'text') => {
      const nextTool = tool === 'text' ? 'pen' : tool;
      activeToolRef.current = nextTool;
      textRecognitionModeRef.current = tool === 'text';
      setActiveTool(nextTool);
      setTextRecognitionMode(tool === 'text');

      if (tool !== 'text') {
        clearRecognitionTimer();
        resetOcrProcessing();
        setRecognitionBar(null);
        previewShapeTypeRef.current = null;
      }
    };

    const handleSettingChange = (_event: unknown, setting: SettingPayload) => {
      if (setting.type === 'color' && typeof setting.value === 'string') {
        colorRef.current = setting.value;
      }

      if (setting.type === 'size' && typeof setting.value === 'number') {
        sizeRef.current = setting.value;
        setCursorSize(setting.value);
      }

      if (setting.type === 'trail' && typeof setting.value === 'number') {
        trailRef.current = setting.value;
      }

      if (setting.type === 'trailColor' && typeof setting.value === 'string') {
        trailColorRef.current = setting.value;
      }

      if (setting.type === 'assistMode' && typeof setting.value === 'boolean') {
        assistModeRef.current = setting.value;
        setAssistMode(setting.value);
      }

      drawFrame();
    };

    const handleCanvasCommand = (_event: unknown, command: 'undo' | 'clear') => {
      if (command === 'undo') {
        objectStateRef.current = undoLastCanvasObject(objectStateRef.current);
        syncStrokesWithObjectStack();
        setRecognitionBar(null);
      }

      if (command === 'clear') {
        objectStateRef.current = clearCanvasObjects();
        stateRef.current = clearCommittedStrokes();
        handwritingStrokeMetaRef.current = [];
        isDrawingRef.current = false;
        clearRecognitionTimer();
        resetOcrProcessing();
        setRecognitionBar(null);
        previewShapeTypeRef.current = null;
      }

      drawFrame();
    };

    ipcRenderer.on('active-tool', handleToolChange);
    ipcRenderer.on('setting-changed', handleSettingChange);
    ipcRenderer.on('canvas-command', handleCanvasCommand);

    return () => {
      ipcRenderer.removeListener('active-tool', handleToolChange);
      ipcRenderer.removeListener('setting-changed', handleSettingChange);
      ipcRenderer.removeListener('canvas-command', handleCanvasCommand);
    };
  }, [clearRecognitionTimer, drawFrame, syncStrokesWithObjectStack]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      clearRecognitionTimer();
      resetOcrProcessing();
    };
  }, [clearRecognitionTimer, resetOcrProcessing]);

  const buildPoint = (event: React.PointerEvent<HTMLCanvasElement>): CanvasPoint => ({
    x: event.clientX,
    y: event.clientY,
    timestamp: Date.now(),
  });

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const tool = activeToolRef.current;

    if (tool !== 'pen' && tool !== 'eraser') {
      return;
    }

    isDrawingRef.current = true;
    stateRef.current = beginStroke(
      stateRef.current,
      tool,
      colorRef.current,
      sizeRef.current,
      trailRef.current,
      buildPoint(event),
      trailColorRef.current,
      createObjectId('stroke'),
    );
    previewShapeTypeRef.current = null;
    drawFrame();
    scheduleFrame();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) {
      return;
    }

    stateRef.current = appendPoint(stateRef.current, buildPoint(event));
    if (assistModeRef.current && !textRecognitionModeRef.current && stateRef.current.currentStroke?.tool === 'pen') {
      previewShapeTypeRef.current = getAssistPreviewShapeType(
        stateRef.current.currentStroke.points.map((point) => ({ x: point.x, y: point.y })),
      );
    }
    drawFrame();
    scheduleFrame();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) {
      return;
    }

    isDrawingRef.current = false;
    const finishedState = finishStroke(stateRef.current);
    const finishedStroke = finishedState.currentStroke;
    const previewShapeType = finishedStroke
      ? getAssistPreviewShapeType(finishedStroke.points.map((point) => ({ x: point.x, y: point.y })))
      : null;
    stateRef.current = commitStroke(finishedState);
    previewShapeTypeRef.current = null;

    if (finishedStroke?.id) {
      const isShapeCandidate =
        finishedStroke.tool === 'pen' && assistModeRef.current && !textRecognitionModeRef.current;

      if (isShapeCandidate && previewShapeType) {
          objectStateRef.current = appendShapeObject(objectStateRef.current, {
          kind: 'shape',
          id: createObjectId(previewShapeType),
          shapeType: previewShapeType,
          strokeId: finishedStroke.id,
        });
      } else {
        objectStateRef.current = appendStrokeObject(objectStateRef.current, {
          kind: 'stroke',
          id: finishedStroke.id,
        });
      }

      if (textRecognitionModeRef.current && finishedStroke.tool === 'pen') {
        const finishedAt =
          finishedStroke.points[finishedStroke.points.length - 1]?.timestamp ?? Date.now();
        handwritingStrokeMetaRef.current = [
          ...handwritingStrokeMetaRef.current,
          {
            id: finishedStroke.id,
            endAt: finishedAt,
            bounds: getStrokeBounds(finishedStroke),
          },
        ];
        scheduleTextRecognition();
      }
    }

    drawFrame();
    scheduleFrame();
  };

  return (
    <div className="canvas-root">
      <canvas
        ref={canvasRef}
        data-assist-mode={assistMode ? 'on' : 'off'}
        data-text-recognition-mode={textRecognitionMode ? 'on' : 'off'}
        className="canvas-surface"
        style={{
          cursor: getCanvasCursor(activeTool, cursorSize),
          pointerEvents: activeTool === 'mouse' ? 'none' : 'auto',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      {recognitionBar && textRecognitionMode && (
        <div
          className="recognition-bar"
          style={{
            top: `${recognitionBarBounds.top}px`,
            width: `${recognitionBarBounds.width}px`,
            maxWidth: `calc(100vw - 32px)`,
            maxHeight: `${recognitionBarBounds.maxHeight}px`,
            backgroundColor: recognitionBarTheme.backgroundColor,
            borderColor: recognitionBarTheme.borderColor,
            boxShadow: `0 0 0 1px ${recognitionBarTheme.borderColor}, 0 0 14px ${recognitionBarTheme.shadowColor}`,
          }}
        >
          <div className="recognition-bar__title">{recognitionBar.text}</div>
          <div className="recognition-bar__meta">
            {`字号 ${recognitionBar.fontSize}px · ${recognitionBar.targetIds.length} 笔`}
          </div>
          <input
            className="recognition-bar__input"
            type="text"
            value={recognitionBar.draftText}
            placeholder={recognitionBar.isRecognizing ? 'OCR 正在识别...' : '可手动修改识别结果'}
            onChange={(event) => handleRecognitionDraftChange(event.target.value)}
            style={{
              borderColor: recognitionBarTheme.borderColor,
            }}
          />
          <div className="recognition-bar__actions">
            <button
              type="button"
              className="recognition-bar__button recognition-bar__button--primary"
              disabled={recognitionBar.isRecognizing}
              onClick={handleConfirmRecognition}
            >
              确认替换
            </button>
            <button type="button" className="recognition-bar__button" onClick={handleKeepHandwriting}>
              保留手写
            </button>
            <button type="button" className="recognition-bar__button" disabled={recognitionBar.isRecognizing} onClick={handleRetryRecognition}>
              重新识别
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
