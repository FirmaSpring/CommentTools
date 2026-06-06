import { describe, expect, it } from 'vitest';
import {
  createOcrQueueState,
  enqueueLatestOcrJob,
  finishActiveOcrJob,
} from '../../src/canvas/ocrQueue';

describe('ocrQueue', () => {
  it('starts immediately when no OCR job is running', () => {
    const result = enqueueLatestOcrJob(createOcrQueueState<string>(), 'draft-a');

    expect(result.jobToRun).toBe('draft-a');
    expect(result.state).toEqual({
      active: 'draft-a',
      queued: null,
    });
  });

  it('keeps only the latest pending OCR job while one is already running', () => {
    const first = enqueueLatestOcrJob(createOcrQueueState<string>(), 'draft-a');
    const second = enqueueLatestOcrJob(first.state, 'draft-b');
    const third = enqueueLatestOcrJob(second.state, 'draft-c');

    expect(second.jobToRun).toBeNull();
    expect(third.jobToRun).toBeNull();
    expect(third.state).toEqual({
      active: 'draft-a',
      queued: 'draft-c',
    });
  });

  it('runs the latest queued OCR job after the active one finishes', () => {
    const queuedState = enqueueLatestOcrJob(
      enqueueLatestOcrJob(createOcrQueueState<string>(), 'draft-a').state,
      'draft-b',
    ).state;

    const finished = finishActiveOcrJob(queuedState);

    expect(finished.jobToRun).toBe('draft-b');
    expect(finished.state).toEqual({
      active: 'draft-b',
      queued: null,
    });
  });
});
