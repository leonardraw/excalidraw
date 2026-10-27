import { decompressFrames, parseGIF } from "gifuct-js";

/**
 * Animated image support: a GIF is decoded once into composed frames
 * (one bitmap per frame, disposal methods applied). The renderer picks the
 * frame to draw from an animation clock, so an animated image stays a
 * regular `image` element (selection, frames, groups, exports) and only its
 * pixels change over time.
 */

export type AnimatedImageFrame = {
  bitmap: HTMLCanvasElement;
  /** display duration in ms */
  delay: number;
};

export type AnimatedImage = {
  frames: readonly AnimatedImageFrame[];
  /** sum of the frame delays, in ms */
  duration: number;
};

/** Browsers clamp delays below 20ms to 100ms (de facto GIF convention). */
const normalizeDelay = (delay: number) => (delay >= 20 ? delay : 100);

const DISPOSAL_RESTORE_BACKGROUND = 2;
const DISPOSAL_RESTORE_PREVIOUS = 3;

/**
 * Decodes a GIF (data URL or URL) into composed frames. Returns `null` for a
 * single-frame GIF (rendered as a static image) or when decoding fails.
 */
export const decodeAnimatedGif = async (
  src: string,
  createCanvas: () => HTMLCanvasElement,
): Promise<AnimatedImage | null> => {
  const buffer = await (await fetch(src)).arrayBuffer();
  const gif = parseGIF(buffer);
  const parsedFrames = decompressFrames(gif, true);
  if (parsedFrames.length < 2) {
    return null;
  }

  const { width, height } = gif.lsd;
  const composite = createCanvas();
  composite.width = width;
  composite.height = height;
  const context = composite.getContext("2d");
  const patchCanvas = createCanvas();
  const patchContext = patchCanvas.getContext("2d");
  if (!context || !patchContext) {
    return null;
  }

  const frames: AnimatedImageFrame[] = [];
  let duration = 0;
  let previous: typeof parsedFrames[number] | null = null;
  let snapshotBeforePrevious: ImageData | null = null;

  for (const frame of parsedFrames) {
    if (previous) {
      if (previous.disposalType === DISPOSAL_RESTORE_BACKGROUND) {
        context.clearRect(
          previous.dims.left,
          previous.dims.top,
          previous.dims.width,
          previous.dims.height,
        );
      } else if (
        previous.disposalType === DISPOSAL_RESTORE_PREVIOUS &&
        snapshotBeforePrevious
      ) {
        context.putImageData(snapshotBeforePrevious, 0, 0);
      }
    }
    snapshotBeforePrevious =
      frame.disposalType === DISPOSAL_RESTORE_PREVIOUS
        ? context.getImageData(0, 0, width, height)
        : null;

    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    patchContext.putImageData(
      new ImageData(
        new Uint8ClampedArray(frame.patch),
        frame.dims.width,
        frame.dims.height,
      ),
      0,
      0,
    );
    context.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

    const bitmap = createCanvas();
    bitmap.width = width;
    bitmap.height = height;
    bitmap.getContext("2d")?.drawImage(composite, 0, 0);

    const delay = normalizeDelay(frame.delay);
    frames.push({ bitmap, delay });
    duration += delay;
    previous = frame;
  }

  return { frames, duration };
};

/** The frame to display at `timeMs` (any monotonic clock; loops forever). */
export const getAnimatedImageFrame = (
  animation: AnimatedImage,
  timeMs: number,
): AnimatedImageFrame => {
  let t = timeMs % animation.duration;
  for (const frame of animation.frames) {
    if (t < frame.delay) {
      return frame;
    }
    t -= frame.delay;
  }
  return animation.frames[animation.frames.length - 1];
};
