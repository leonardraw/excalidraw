import fs from "fs";
import path from "path";

import {
  decodeAnimatedGif,
  getAnimatedImageFrame,
} from "../src/animatedImage";

import type { AnimatedImage } from "../src/animatedImage";

const fixture = fs.readFileSync(
  path.resolve(__dirname, "fixtures/animated.gif"),
);

describe("getAnimatedImageFrame", () => {
  const frame = (delay: number) => ({
    bitmap: document.createElement("canvas"),
    delay,
  });
  const animation: AnimatedImage = {
    frames: [frame(100), frame(50), frame(150)],
    duration: 300,
  };

  it("picks the frame whose delay window contains the time", () => {
    expect(getAnimatedImageFrame(animation, 0)).toBe(animation.frames[0]);
    expect(getAnimatedImageFrame(animation, 99)).toBe(animation.frames[0]);
    expect(getAnimatedImageFrame(animation, 100)).toBe(animation.frames[1]);
    expect(getAnimatedImageFrame(animation, 149)).toBe(animation.frames[1]);
    expect(getAnimatedImageFrame(animation, 150)).toBe(animation.frames[2]);
    expect(getAnimatedImageFrame(animation, 299)).toBe(animation.frames[2]);
  });

  it("loops", () => {
    expect(getAnimatedImageFrame(animation, 300)).toBe(animation.frames[0]);
    expect(getAnimatedImageFrame(animation, 1000 * 300 + 120)).toBe(
      animation.frames[1],
    );
  });
});

describe("decodeAnimatedGif", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        arrayBuffer: async () =>
          fixture.buffer.slice(
            fixture.byteOffset,
            fixture.byteOffset + fixture.byteLength,
          ),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("decodes every frame with its delay and the total duration", async () => {
    const animation = await decodeAnimatedGif(
      "data:image/gif;base64,...",
      () => document.createElement("canvas"),
    );
    expect(animation).not.toBeNull();
    // 20 frames at 10 fps
    expect(animation!.frames).toHaveLength(20);
    expect(animation!.frames.every((frame) => frame.delay === 100)).toBe(true);
    expect(animation!.duration).toBe(2000);
    expect(animation!.frames[0].bitmap.width).toBe(160);
    expect(animation!.frames[0].bitmap.height).toBe(120);
  });
});
