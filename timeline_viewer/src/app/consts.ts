import { Color } from "./types";

export const SIZE_U32 = 4;
export const BASE_BUFFER_SIZE = 0x100000;
export const DIFF_SIZE = 2 * SIZE_U32;

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
] as const;

export const REGISTER_COLORS: Partial<Record<typeof REGISTERS_386[number], Color>> = {
  esp: "blue",
  ebp: "cyan",
  eip: "orange"
};

export const REGISTERS_SIZE = REGISTERS_386.length * SIZE_U32;
export const STEP_SIZE = REGISTERS_SIZE + DIFF_SIZE;