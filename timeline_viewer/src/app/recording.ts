import { REGISTERS_386 } from "./consts";

interface Step {
  offset: number;
  registers: Uint32Array;
  diffs: Array<[number, number]>;
}

const SIZE_U32 = 4;
const REGISTERS_SIZE = REGISTERS_386.length * SIZE_U32;

const FOURCC_CODE = 0x52424447;

export default class GDBRecording {
  private readonly dataView: DataView;
  private readonly steps: Step[] = [];
  private readonly keyframes: Uint8Array[] = [];

  public readonly version: number;

  constructor(arrayBuffer: ArrayBuffer, private readonly keyframeInterval: number = 300) {
    this.dataView = new DataView(arrayBuffer);

    if (this.dataView.getUint32(0, true) !== FOURCC_CODE) {
      throw new Error("Unexpected file format.");
    }

    this.version = this.dataView.getUint32(SIZE_U32, true);

    const baseBufferSize = this.dataView.getUint32(2 * SIZE_U32, true);
    const baseBufferStart = 3 * SIZE_U32;

    this.keyframes.push(new Uint8Array(this.dataView.buffer.slice(baseBufferStart, baseBufferStart + baseBufferSize)));

    let index = baseBufferStart + baseBufferSize;

    while (index < this.dataView.byteLength) {
      const step: Step = {
        offset: index,
        registers: new Uint32Array(this.dataView.buffer, index, REGISTERS_386.length),
        diffs: [],
      };

      index += REGISTERS_SIZE;

      const diffCount = this.dataView.getUint32(index, true);

      index += SIZE_U32;

      for (let i = 0; i < diffCount; i++) {
        const diffOffset = i * 2 * SIZE_U32;

        step.diffs.push([
          this.dataView.getUint32(index + diffOffset, true),
          this.dataView.getUint32(index + diffOffset + SIZE_U32, true)
        ]);
      }

      this.steps.push(step);

      index += (diffCount * 2) * SIZE_U32;
    }
  }

  stepCount() {
    return this.steps.length;
  }

  getStep(index: number) {
    if (index >= this.steps.length || index < 0) {
      throw new Error("Step number out of bounds");
    }

    return this.steps[index];
  }

  getMemory(index: number) {
    const nearestAvailableKeyframeIndex = Math.min(Math.floor(index / this.keyframeInterval), this.keyframes.length - 1);

    const initialBuffer = new DataView(this.keyframes[nearestAvailableKeyframeIndex].buffer.slice(0));

    for (let i = nearestAvailableKeyframeIndex * this.keyframeInterval; i <= index; i++) {
      const step = this.getStep(i);

      for (const diff of step.diffs) {
        const [address, value] = diff;

        initialBuffer.setUint32(address, value);
      }

      if (i % this.keyframeInterval == 0) {
        const newKeyframeIndex = i / this.keyframeInterval;

        // Add a new keyframe if necessary.
        if (newKeyframeIndex == this.keyframes.length) {
          this.keyframes.push(new Uint8Array(initialBuffer.buffer.slice(0)));
        }
      }
    }

    return new Uint8Array(initialBuffer.buffer);
  }
}
