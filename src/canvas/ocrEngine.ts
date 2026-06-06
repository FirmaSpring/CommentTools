export function normalizeOcrText(text: string): string {
  return text.replace(/\s+/g, '').trim();
}

const OCR_PSM_SINGLE_BLOCK = 6;
const OCR_PSM_SINGLE_LINE = 7;
const OCR_TIMEOUT_MS = 8000;

export function getOcrTimeoutMs(): number {
  return OCR_TIMEOUT_MS;
}

export function withOcrTimeout<T>(task: Promise<T>, timeoutMs = OCR_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new Error('OCR timeout'));
    }, timeoutMs);

    task.then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function getOcrAttemptProfiles() {
  return [
    {
      tessedit_pageseg_mode: OCR_PSM_SINGLE_LINE,
      user_defined_dpi: '300',
      preserve_interword_spaces: '0',
      tessedit_char_blacklist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    },
    {
      tessedit_pageseg_mode: OCR_PSM_SINGLE_BLOCK,
      user_defined_dpi: '300',
      preserve_interword_spaces: '0',
    },
  ] as const;
}

let workerPromise: Promise<{
  recognize: (image: string) => Promise<{ data: { text: string } }>;
  setParameters: (params: Record<string, string | number>) => Promise<unknown>;
  terminate: () => Promise<unknown>;
}> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(async ({ createWorker }) => {
      const worker = await createWorker('chi_sim+eng');
      return worker;
    });
  }

  return workerPromise;
}

export async function recognizeTextFromDataUrl(dataUrl: string): Promise<string> {
  try {
    const worker = await getWorker();

    for (const profile of getOcrAttemptProfiles()) {
      await worker.setParameters(profile);
      const result = await withOcrTimeout(worker.recognize(dataUrl));
      const normalizedText = normalizeOcrText(result.data.text);
      if (normalizedText) {
        return normalizedText;
      }
    }

    return '';
  } catch {
    void resetOcrWorker();
    return '';
  }
}

export async function resetOcrWorker(): Promise<void> {
  if (!workerPromise) {
    return;
  }

  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch {
    // Ignore terminate failures so the next recognition can recreate the worker.
  } finally {
    workerPromise = null;
  }
}
