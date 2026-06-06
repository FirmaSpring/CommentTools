function getPixelGray(pixels: Uint8ClampedArray, offset: number): number {
  return Math.round((pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3);
}

function getBinaryThreshold(grays: number[]): number {
  let min = 255;
  let max = 0;

  for (const gray of grays) {
    min = Math.min(min, gray);
    max = Math.max(max, gray);
  }

  if (max - min < 32) {
    return Math.max(112, Math.round(max - 12));
  }

  return Math.round((min + max) / 2);
}

export function createBinaryMask(pixels: Uint8ClampedArray): Uint8Array {
  const pixelCount = Math.floor(pixels.length / 4);
  const grays = new Array<number>(pixelCount);

  for (let index = 0; index < pixelCount; index += 1) {
    grays[index] = getPixelGray(pixels, index * 4);
  }

  const threshold = getBinaryThreshold(grays);
  const mask = new Uint8Array(pixelCount);

  for (let index = 0; index < pixelCount; index += 1) {
    mask[index] = grays[index] <= threshold ? 1 : 0;
  }

  return mask;
}

export function getInkColumnSegments(
  mask: Uint8Array,
  width: number,
  height: number,
): Array<{ start: number; end: number }> {
  const segments: Array<{ start: number; end: number }> = [];
  let segmentStart = -1;

  for (let x = 0; x < width; x += 1) {
    let hasInk = false;

    for (let y = 0; y < height; y += 1) {
      if (mask[y * width + x] === 1) {
        hasInk = true;
        break;
      }
    }

    if (hasInk && segmentStart === -1) {
      segmentStart = x;
      continue;
    }

    if (!hasInk && segmentStart !== -1) {
      segments.push({ start: segmentStart, end: x - 1 });
      segmentStart = -1;
    }
  }

  if (segmentStart !== -1) {
    segments.push({ start: segmentStart, end: width - 1 });
  }

  return segments;
}

function dilateMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const dilated = new Uint8Array(mask.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let ink = 0;

      for (let offsetY = -radius; offsetY <= radius && ink === 0; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const sampleX = x + offsetX;
          const sampleY = y + offsetY;

          if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) {
            continue;
          }

          if (mask[sampleY * width + sampleX] === 1) {
            ink = 1;
            break;
          }
        }
      }

      dilated[y * width + x] = ink;
    }
  }

  return dilated;
}

export function applyOcrPreprocess(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const binaryMask = createBinaryMask(pixels);
  const thickenedMask = dilateMask(binaryMask, width, height, 1);
  const output = new Uint8ClampedArray(pixels.length);

  for (let index = 0; index < thickenedMask.length; index += 1) {
    const value = thickenedMask[index] === 1 ? 0 : 255;
    const offset = index * 4;
    output[offset] = value;
    output[offset + 1] = value;
    output[offset + 2] = value;
    output[offset + 3] = 255;
  }

  return output;
}
