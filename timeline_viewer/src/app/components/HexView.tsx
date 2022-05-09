import React, { useLayoutEffect, useRef, useState } from "react";

import HexRow from "./HexRow";
import { Octet } from "./Octet";

import styles from "./HexView.module.css";
import { useScroll } from "react-use";

interface Props {
  buffer: Uint8Array;
  rows?: number;
  targetAddress?: number;
}

interface Sizing {
  height: number;
  itemHeight: number;
}

export default function HexView(props: Props) {
  const { buffer, rows = 50, targetAddress } = props;

  const viewRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);


  const [sizing, setSizing] = useState<Sizing | undefined>();

  useLayoutEffect(() => {
    if (scrollContainerRef.current && headerRef.current) {
      setSizing({
        height: scrollContainerRef.current.offsetHeight,
        itemHeight: headerRef.current.offsetHeight,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (scrollContainerRef.current && sizing && targetAddress && targetAddress !== 0xffffffff) {
      const targetRow = Math.floor(targetAddress / 16);

      scrollContainerRef.current.scrollTop = targetRow * sizing.itemHeight;
    }
  }, [targetAddress]);

  const { y } = useScroll(scrollContainerRef);

  const rowStart = sizing ? Math.ceil(y / sizing.itemHeight) : 0;

  return (
    <div ref={viewRef} className={styles.hexview}>
      <div ref={headerRef} className={styles.header}>
        <span className={styles.headerAddress}>00000000:</span>
        {
          Array.from({ length: 16 }).map((_, i) => <Octet key={i} address={i}>{i}</Octet>)
        }
      </div>
      <div
        ref={scrollContainerRef}
        className={styles.hexContainer}
        style={{ height: sizing ? rows * sizing?.itemHeight : undefined }}
      >
        {
          sizing ? (
            <>
              <div className={styles.hexRows}>
                {
                  Array.from({ length: rows }).map((_, index) => {
                    const offset = 16 * (index + rowStart);
                    const highlight = targetAddress ? (offset <= targetAddress && targetAddress < offset + 16) : false;

                    return <HexRow key={index} buffer={buffer} offset={offset} highlight={highlight} targetAddress={targetAddress} />;
                  })
                }
              </div>
              <div
                className={styles.hexScrollPlaceholder}
                style={{ height: Math.ceil(buffer.length / 16 * sizing.itemHeight) }}
              />
            </>
          ) : null
        }
      </div>
    </div>
  );
}