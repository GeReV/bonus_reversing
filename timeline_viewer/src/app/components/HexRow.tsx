import React, { useMemo } from "react";
import cx from "classnames";

import { dumpUint32 } from "../../lib/utils";
import { Octet } from "./Octet";
import { Ascii } from "./Ascii";

import styles from "./HexRow.module.css";
import { SIZE_U32 } from "../consts";

interface Props {
  buffer: Uint8Array;
  offset: number;
  targetAddress?: number;
  highlight?: boolean;
}

export default function HexRow(props: Props) {
  const { buffer, offset, highlight, targetAddress } = props;

  const slice = useMemo(() => Array.from(buffer.slice(offset, offset + 16)), [buffer, offset]);

  const row = useMemo(
    () =>
      <>
        <span className={styles.hexRowOctets}>
          {slice.map((b, i) => {
            const address = offset + i;
            const isTarget = targetAddress && targetAddress !== 0xffffffff && address >= targetAddress && address < targetAddress + SIZE_U32;

            return <Octet key={`octet-${i}`} address={address} highlight={isTarget ? "magenta" : undefined}>{b}</Octet>;
          })}
        </span>
        <span className={styles.hexRowAscii}>
          {slice.map((b, i) => {
            const address = offset + i;
            const isTarget = targetAddress && targetAddress !== 0xffffffff && address >= targetAddress && address < targetAddress + SIZE_U32;

            return <Ascii key={`ascii-${i}`} address={address} highlight={isTarget ? "magenta" : undefined}>{b}</Ascii>;
          })}
        </span>
      </>,
    [buffer, offset, targetAddress]
  );

  return (
    <div className={cx(styles.hexRow, { [styles.hexRowHighlight]: highlight })}>
      <span className={styles.hexRowAddress}>{`${dumpUint32(props.offset)}:`}</span>
      {row}
    </div>
  );
}
