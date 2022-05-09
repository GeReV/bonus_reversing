import React from "react";

import styles from "./Ascii.module.css";
import { Unit } from "./Unit";
import { Color } from "../types";

interface Props {
  children: number;
  address: number;
  highlight?: Color;
}

function getChar(byte: number) {
  if (byte > 0x20 && byte < 0x7f || byte > 0x9f) {
    return String.fromCharCode(byte);
  }

  if (byte >= 0x80 && byte <= 0x9a) {
    return "אבגדהוזחטיךכלםמןנסעףפץצקרשת"[byte - 0x80];
  }

  return '.';
}

export function Ascii(props: Props) {
  const b = props.children;

  const c = getChar(b);

  return <Unit className={styles.ascii} highlight={props.highlight} address={props.address}>{c}</Unit>;
}

export default Ascii;