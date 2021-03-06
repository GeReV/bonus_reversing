import { strict as assert } from "assert";
import * as readline from "readline";
import { Buffer } from "buffer";
import { writeFile } from "fs/promises";
import { performance, PerformanceObserver } from 'perf_hooks';

import { dumpUint8, GDBClient } from "./gdbclient";
import { printRegisters, REGISTERS_386 } from "./gdb-utils";

const DEFAULT_STEP_COUNT = 300000;

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
        // instruction: string;
        registersStart: number;
        diffStart: number;
        diffCount: number;
        diffEnd: number;
    }>;
}

interface BufferDiff {
    address: number;
    value: number;
}

function diffBuffers(a: Uint32Array, b: Uint32Array) {
    assert(a.length === b.length, `a.length == ${a.length}, b.length == ${b.length}`);

    const diffs: BufferDiff[] = [];

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            diffs.push({
                address: i,
                value: b[i]
            });
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

async function cleanup(gdb: GDBClient) {
    if (gdb.isConnected) {
        console.log('Disconnecting...');
        
        await gdb.monitor("remote_debug 0");
        await sleep(200);
        
        await gdb.monitor("int_bp 0x21 0");
        await sleep(200);

        await gdb.continue();
        
        await gdb.disconnect();
    }
}

function run(gdb: GDBClient, steps: number) {
    return new Promise<void>((resolve) => {
        (async () => {
            let snapshot: Uint8Array | undefined;

            const metadata: Metadata = {
                memoryStart: 0,
                memoryEnd: 0,
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

            const buffer = Buffer.alloc(256 * 1024 * 1024);

            let offset = 0;
        
            offset += buffer.write(FOURCC_CODE, offset);
            offset = buffer.writeUint32LE(VERSION_CODE, offset);
            offset = buffer.writeUint32LE(BASE_BUFFER_SIZE, offset);

            metadata.memoryStart = offset;

            const baseMemory = Buffer.from(await readMemory(gdb, BASE_BUFFER_SIZE));

            offset += baseMemory.copy(buffer, offset);

            metadata.memoryEnd = offset;

            for (let step = 0; step < steps; step++) {
                // performance.mark("dump");
        
                console.log(`${step}: ${offset} written`);
        
                // const instruction = ""; // await gdb.monitor("x/i $pc");

                const stepMetadata: Metadata["steps"][number] = {
                    // instruction,
                    registersStart: offset,
                    diffCount: 0,
                    diffStart: 0,
                    diffEnd: 0,
                };

                const registers = await gdb.readRegisters();

                registers.forEach(r => {
                    offset = buffer.writeUint32LE(r, offset);
                });

                stepMetadata.diffStart = offset;

                const memory = await readMemory(gdb, BASE_BUFFER_SIZE);
        
                if (snapshot) {
                    const diffs = diffBuffers(new Uint32Array(snapshot.buffer), new Uint32Array(memory.buffer));
        
                    stepMetadata.diffCount = diffs.length;

                    offset = buffer.writeUint32LE(diffs.length, offset);

                    diffs.forEach((diff, i) => {
                        offset = buffer.writeUint32LE(diff.address, offset);
                        offset = buffer.writeUint32LE(diff.value, offset);
                    });
                } else {
                    offset = buffer.writeUint32LE(0, offset);
                }

                stepMetadata.diffEnd = offset;
        
                snapshot = memory;

                metadata.steps.push(stepMetadata);
        
                // performance.measure("dump", "dump");
        
                await gdb.singleStep();
            }

            await writeFile(`buffer-${now}.bin`, buffer.slice(0, offset), { encoding: "binary" });
        
            await writeFile(`metadata-${now}.json`, JSON.stringify(metadata), "utf-8");
        
            rl.question("Press any key to continue... ", async () => {
                await cleanup(gdb);

                resolve();
            });
        })();
    });
}

const gdb = new GDBClient(Boolean(process.env.DEBUG));

process.on("SIGINT", async () => {
    await cleanup(gdb);

    process.exit();
});

async function sleep(timeout: number) {
    return new Promise<void>(resolve => {
        setTimeout(resolve, timeout);
    });
}

(async () => {
    rl.question(`Choose how many steps to run [${DEFAULT_STEP_COUNT}]: `, async (answer) => {
        console.log("Connecting to GDB...");
        await gdb.connect();

        await gdb.monitor("remote_debug 0");
        await sleep(200);

        await gdb.monitor("int_bp 0x21 0");
        await sleep(200);

        console.log("Running...");
        await run(gdb, answer ? +answer : DEFAULT_STEP_COUNT);

        process.exit();
    });
})();
