export interface OcrQueueState<T> {
  active: T | null;
  queued: T | null;
}

export function createOcrQueueState<T>(): OcrQueueState<T> {
  return {
    active: null,
    queued: null,
  };
}

export function enqueueLatestOcrJob<T>(
  state: OcrQueueState<T>,
  job: T,
): { state: OcrQueueState<T>; jobToRun: T | null } {
  if (!state.active) {
    return {
      state: {
        active: job,
        queued: null,
      },
      jobToRun: job,
    };
  }

  return {
    state: {
      active: state.active,
      queued: job,
    },
    jobToRun: null,
  };
}

export function finishActiveOcrJob<T>(
  state: OcrQueueState<T>,
): { state: OcrQueueState<T>; jobToRun: T | null } {
  if (!state.queued) {
    return {
      state: {
        active: null,
        queued: null,
      },
      jobToRun: null,
    };
  }

  return {
    state: {
      active: state.queued,
      queued: null,
    },
    jobToRun: state.queued,
  };
}
