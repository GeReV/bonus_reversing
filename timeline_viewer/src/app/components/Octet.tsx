import React from "react";

import { dumpUint8 } from "../../lib/utils";
import Unit from "./Unit";

import styles from "./Octet.module.css";
import { Color } from "../types";


interface Props {
  children: number;
  address: number;
  highlight?: Color;
}

export function Octet(props: Props) {
  const { children, address, highlight } = props;

  return (
    <Unit className={styles.octet} highlight={highlight} address={address}>{dumpUint8(children)}</Unit>
  );
}

export default Octet;