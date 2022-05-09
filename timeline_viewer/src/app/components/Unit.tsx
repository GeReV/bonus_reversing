import React, { memo, useContext } from "react";
import cx from "classnames";

import styles from "./Unit.module.css";
import RegistersContext from "./RegistersContext";
import { REGISTER_COLORS, SIZE_U32 } from "../consts";
import { Color } from "../types";

interface Props {
  children: string;
  address: number;
  className?: string;
  highlight?: Color;
}

export function Unit(props: Props) {
  const { children, className, address } = props;

  const registers = useContext(RegistersContext);

  let highlight = props.highlight;

  if (!highlight) {
    const entry = Array
      .from(registers.entries())
      .find(([, value]) => value && address >= value && address < value + SIZE_U32);

    if (entry) {
      highlight = REGISTER_COLORS[entry[0]];
    }
  }

  const classNames = cx(styles.unit, className, highlight);

  return (
    <span className={classNames}>{children}</span>
  );
}

export default memo(Unit);