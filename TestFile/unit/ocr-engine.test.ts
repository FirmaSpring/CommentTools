import { describe, expect, it, vi } from 'vitest';
import {
  getOcrAttemptProfiles,
  getOcrTimeoutMs,
  normalizeOcrText,
  withOcrTimeout,
} from '../../src/canvas/ocrEngine';

describe('ocrEngine', () => {
  it('normalizes OCR output by trimming whitespace and collapsing line breaks', () => {
    expect(normalizeOcrText('  你\n 好  ')).toBe('你好');
  });

  it('falls back to an empty string when OCR only returns noise', () => {
    expect(normalizeOcrText(' \n\t ')).toBe('');
  });

  it('uses multiple OCR parameter profiles so handwriting can retry with a different segmentation mode', () => {
    expect(getOcrAttemptProfiles()).toEqual([
      {
        tessedit_pageseg_mode: 7,
        user_defined_dpi: '300',
        preserve_interword_spaces: '0',
        tessedit_char_blacklist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      },
      {
        tessedit_pageseg_mode: 6,
        user_defined_dpi: '300',
        preserve_interword_spaces: '0',
      },
    ]);
  });

  it('tries a Chinese-first OCR profile before the general fallback profile', () => {
    const profiles = getOcrAttemptProfiles();

    expect(profiles[0]?.tessedit_char_blacklist).toContain('A');
    expect(profiles[0]?.tessedit_pageseg_mode).toBe(7);
    expect(profiles[1]?.tessedit_char_blacklist).toBeUndefined();
  });

  it('uses a finite OCR timeout so the recognition bar can exit loading state', () => {
    expect(getOcrTimeoutMs()).toBe(8000);
  });

  it('rejects stalled OCR work when it runs past the timeout window', async () => {
    vi.useFakeTimers();

    const stalled = withOcrTimeout(new Promise<string>(() => {}), 200);
    const assertion = expect(stalled).rejects.toThrow('OCR timeout');
    await vi.advanceTimersByTimeAsync(250);
    await assertion;
    vi.useRealTimers();
  });
});
