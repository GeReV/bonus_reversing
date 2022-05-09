import { createContext } from "react";

export type RegistersContextProps = Map<"esp" | "ebp" | "esi" | "edi" | "eip", number | undefined>;

const RegistersContext = createContext<RegistersContextProps>(new Map([
  ["esp", undefined],
  ["ebp", undefined],
  ["eip", undefined],
]));

export default RegistersContext;

