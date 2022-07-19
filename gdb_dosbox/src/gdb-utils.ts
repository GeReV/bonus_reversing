import { dumpUint32 } from "./gdbclient";

export const REGISTERS_386 = [
    "eax",
    "ecx",
    "edx",
    "ebx",
    "esp",
    "ebp",
    "esi",
    "edi",
    "eip",
    "eflags",
    "cs",
    "ss",
    "ds",
    "es",
    "fs",
    "gs",

    // "fs_base",
    // "gs_base",
    // "k_gs_base",

    // "cr0", // bitsize="32" type="i386_cr0"
    // "cr2", // bitsize="32" type="int32"
    // "cr3", // bitsize="32" type="i386_cr3"
    // "cr4", // bitsize="32" type="i386_cr4"
    // "cr8", // bitsize="32" type="int32"
    // "efer", // bitsize="32" type="i386_efer"
    // "st0", // bitsize="80" type="i387_ext"
    // "st1", // bitsize="80" type="i387_ext"
    // "st2", // bitsize="80" type="i387_ext"
    // "st3", // bitsize="80" type="i387_ext"
    // "st4", // bitsize="80" type="i387_ext"
    // "st5", // bitsize="80" type="i387_ext"
    // "st6", // bitsize="80" type="i387_ext"
    // "st7", // bitsize="80" type="i387_ext"
    // "fctrl", // bitsize="32" type="int" group="float"
    // "fstat", // bitsize="32" type="int" group="float"
    // "ftag", // bitsize="32" type="int" group="float"
    // "fiseg", // bitsize="32" type="int" group="float"
    // "fioff", // bitsize="32" type="int" group="float"
    // "foseg", // bitsize="32" type="int" group="float"
    // "fooff", // bitsize="32" type="int" group="float"
    // "fop", // bitsize="32" type="int" group="float"

    // "xmm0", // bitsize="128" type="vec128"
    // "xmm1", // bitsize="128" type="vec128"
    // "xmm2", // bitsize="128" type="vec128"
    // "xmm3", // bitsize="128" type="vec128"
    // "xmm4", // bitsize="128" type="vec128"
    // "xmm5", // bitsize="128" type="vec128"
    // "xmm6", // bitsize="128" type="vec128"
    // "xmm7", // bitsize="128" type="vec128"

    // "mxcsr", // bitsize="32" type="i386_mxcsr" group="vector"
];

export function encodeHexByte(value: number) {
    return (value >> 4).toString(16) + (value & 0xf).toString(16);
}

export function encodeHexBuf(buf: Uint8Array) {
    return Array.from(buf).map(encodeHexByte).join('');
}

export function encodeHexUint32BE(value: number) {
    return encodeHexBuf(
        new Uint8Array([(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff])
    );
}

export function encodeHexUint32(value: number) {
    const buf = new Uint32Array([value]);
    return encodeHexBuf(new Uint8Array(buf.buffer));
}

export function decodeHexBuf(encoded: string) {
    
    // const result = new Uint8Array(encoded.length / 2);
    // for (let i = 0; i < result.length; i++) {
    //     result[i] = parseInt(encoded.substring(i * 2, i * 2 + 2), 16);
    // }
    // return result;

    return Uint8Array.from(Buffer.from(encoded, "hex"));
}

export function decodeHexUint32Array(encoded: string) {
    return new Uint32Array(decodeHexBuf(encoded).buffer);
}

export function decodeHexUint32(encoded: string) {
    return decodeHexUint32Array(encoded)[0];
}

export function gdbChecksum(text: string) {
    const value =
        text
            .split('')
            .map((c) => c.charCodeAt(0))
            .reduce((a, b) => a + b, 0) & 0xff;
    return encodeHexByte(value);
}

export function gdbMessage(value: string) {
    return `$${value}#${gdbChecksum(value)}`;
}

export function printRegisters(registers: Uint32Array) {
    let buffer = '';

    for (let i=0; i < REGISTERS_386.length; i++) {
        buffer += `${REGISTERS_386[i]}: ${dumpUint32(registers[i])}\n`;
    }

    console.log(buffer);
}
