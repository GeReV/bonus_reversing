import assert from "assert";
import readline from "readline";
import { createWriteStream } from "fs";
import { writeFile } from "fs/promises";
import { performance, PerformanceObserver } from 'perf_hooks';

import { dumpUint8, GDBClient } from "./gdbclient";
import { printRegisters, REGISTERS_386 } from "./gdb-utils";

const perfObserver = new PerformanceObserver((items) => {
    items.getEntries().forEach((entry) => {
        console.log(entry)
    })
})

perfObserver.observe({ entryTypes: ["measure"] });

interface Metadata {
    memoryStart: number;
    memoryEnd: number;
    steps: Array<{
        instruction: string;
        registersStart: number;
        registersEnd: number;
        diffStart: number;
        diffEnd: number;
    }>;
}

interface BufferDiff {
    address: number;
    value: number;
}

function diffBuffers(a: Uint8Array, b: Uint8Array) {
    assert(a.length === b.length, `a.length == ${a.length}, b.length == ${b.length}`);

    const diffs: BufferDiff[] = [];

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            diffs.push({
                address: i,
                value: b[i] << 24 | b[i + 1] << 16 | b[i + 2] << 8 | b[i + 3]
            });

            // Skip another 3 bytes because we're reading 32-bits for value.
            i += 3;
        }
    }

    return diffs;
}

const FOURCC_CODE = 'GDBR';
const VERSION_CODE = 1;

const SIZE_U32 = 4;
const BASE_BUFFER_SIZE = process.env.BASE_BUFFER_SIZE ? Number(process.env.BASE_BUFFER_SIZE) : 0x100000;
const REGISTERS_SIZE = REGISTERS_386.length * SIZE_U32;
const DIFF_SIZE = 2 * SIZE_U32;

const EMPTY_DIFF = [0xffffffff, 0x00000000];

const PACKET_LENGTH = 2048 - 5;

async function readMemory(gdb: GDBClient, length: number): Promise<Uint8Array> {
    const buffer = new Uint8Array(length);

    let i = 0;
    while (i < length) {
        const mem = await gdb.readMemory(i, Math.min(length - i, PACKET_LENGTH));

        buffer.set(mem, i);

        i += mem.length;
    }

    return buffer;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function run(gdb: GDBClient, steps: number) {
    let snapshot: Uint8Array | undefined;

    const metadata: Metadata = {
        memoryStart: 0,
        memoryEnd: BASE_BUFFER_SIZE,
        steps: [],
    };

    console.log("Waiting for INT 21 3D")
    
    await gdb.monitor("int_bp 0x21 1");
    await sleep(200);
    
    await gdb.continue();

    while (true) {
        const trapMessage = await gdb.readResponse();

        if (trapMessage !== "S05") {
            continue;
        }

        const registers = await gdb.readRegisters();

        if (((registers[0] >> 8) & 0xff) === 0x3d) {
            break;
        }

        await gdb.continue();
    }

    const now = Date.now();

    const binFile = createWriteStream(`buffer-${now}.bin`, "binary");

    binFile.write(FOURCC_CODE);
    binFile.write(new Uint8Array(new Uint32Array([VERSION_CODE, BASE_BUFFER_SIZE])));

    binFile.write(await readMemory(gdb, BASE_BUFFER_SIZE));

    for (let step = 0; step < steps; step++) {
        // performance.mark("dump");

        console.log(step);

        const instruction = ""; // await gdb.monitor("x/i $pc");

        const registersOffset = BASE_BUFFER_SIZE + step * (REGISTERS_SIZE + DIFF_SIZE);
        const diffOffset = BASE_BUFFER_SIZE + step * (REGISTERS_SIZE + DIFF_SIZE) + REGISTERS_SIZE;

        const stepMetadata: Metadata["steps"][number] = {
            instruction,
            registersStart: registersOffset,
            registersEnd: registersOffset + REGISTERS_SIZE,
            diffStart: diffOffset,
            diffEnd: diffOffset + DIFF_SIZE,
        };

        metadata.steps.push(stepMetadata);

        const registers = await gdb.readRegisters();

        binFile.write(new Uint8Array(registers.buffer));

        const memory = await readMemory(gdb, BASE_BUFFER_SIZE);

        if (snapshot) {
            const diffs = diffBuffers(snapshot, memory);

            const diffBuffer = new Uint32Array(SIZE_U32 + diffs.length * SIZE_U32);

            diffBuffer[0] = diffs.length;

            diffs.forEach((diff, i) => {
                diffBuffer[i * DIFF_SIZE + 1] = diff.address;
                diffBuffer[i * DIFF_SIZE + 2] = diff.value;
            });

            binFile.write(new Uint8Array(diffBuffer));
        } else {
            binFile.write(new Uint8Array(new Uint32Array([0])));
        }

        snapshot = memory;

        // performance.measure("dump", "dump");

        await gdb.singleStep();
    }

    binFile.close();

    await writeFile(`metadata-${now}.json`, JSON.stringify(metadata), "utf-8");

    rl.question("Press any key to continue... ", async (answer) => {
        await gdb.disconnect();
    });
}

const gdb = new GDBClient(Boolean(process.env.DEBUG));

process.on("SIGINT", async () => {
    if (gdb.isConnected) {
        console.log('Disconnecting...');
        await gdb.disconnect();
    }

    process.exit();
});

async function sleep(timeout: number) {
    return new Promise<void>(resolve => {
        setTimeout(resolve, timeout);
    });
}

(async () => {
    rl.question("Choose how many steps to run [30000]: ", async (answer) => {
        console.log("Connecting to GDB...");
        await gdb.connect();

        await gdb.monitor("remote_debug 0");
        await sleep(200);

        await gdb.monitor("int_bp 0x21 0");
        await sleep(200);

        console.log("Running...");
        await run(gdb, answer ? +answer : 30000);

        process.exit();
    });
})();
