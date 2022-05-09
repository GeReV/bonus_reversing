import React, { ChangeEventHandler, useCallback, useMemo, useState } from 'react';
import styles from './App.module.css';
import { dumpUint32 } from "../lib/utils";
import HexView from "./components/HexView";
import RegistersContext, { RegistersContextProps } from './components/RegistersContext';
import {
  BASE_BUFFER_SIZE,
  DIFF_SIZE,
  REGISTER_COLORS,
  REGISTERS_386,
  REGISTERS_SIZE,
  SIZE_U32,
  STEP_SIZE
} from "./consts";

const INSTRUCTIONS_PREVIOUS_ROWS = 5;

function reduceBuffer(dataView: DataView, current: number) {
  const initialBuffer = new DataView(dataView.buffer.slice(0, BASE_BUFFER_SIZE));

  for (let i = 0; i <= current; i++) {
    const diffOffset = BASE_BUFFER_SIZE + (STEP_SIZE * i - DIFF_SIZE) + REGISTERS_SIZE;

    const diffAddress = dataView.getUint32(diffOffset, true);

    if (diffAddress === 0xffffffff) {
      continue;
    }

    const diffValue = dataView.getUint32(diffOffset + SIZE_U32, true);

    initialBuffer.setUint32(diffAddress, diffValue);
  }

  return new Uint8Array(initialBuffer.buffer);
}

function App(): JSX.Element {
  const [dataView, setDataView] = useState<DataView>();
  const [instructions, setInstructions] = useState<string[]>();
  const [max, setMax] = useState(300000);
  const [current, setCurrent] = useState(0);

  const buffer = useMemo(
    () => dataView ? new Uint8Array(reduceBuffer(dataView, current)) : undefined,
    [dataView, current]
  );

  const handleChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      setCurrent(+e.currentTarget.value);
    },
    []
  );

  const handleDumpFile = useCallback<ChangeEventHandler<HTMLInputElement>>(async (e) => {
    if (e.currentTarget.files?.length) {
      const file = e.currentTarget.files[0];

      const arrayBuffer = new DataView(await file.arrayBuffer());

      const steps = ((file.size - BASE_BUFFER_SIZE + DIFF_SIZE) / STEP_SIZE);

      setMax(steps);
      setDataView(arrayBuffer);
    }
  }, []);

  const handleInstructionsFile = useCallback<ChangeEventHandler<HTMLInputElement>>(async (e) => {
    if (e.currentTarget.files?.length) {
      const file = e.currentTarget.files[0];

      const instructions = (await file.text()).split(/\r?\n/).map(s => s.replace(/^"|"$|\\r\\n\\n/g, ""));

      setInstructions(instructions);
    }
  }, []);

  const baseStepAddress = BASE_BUFFER_SIZE + (STEP_SIZE * current) - DIFF_SIZE;

  const registersProps = useMemo<RegistersContextProps>(() => new Map<"esp" | "ebp" | "esi" | "edi" | "eip", number | undefined>([
    ["esp", dataView?.getUint32(baseStepAddress + (4 * SIZE_U32), true)],
    ["ebp", dataView?.getUint32(baseStepAddress + (5 * SIZE_U32), true)],
    ["eip", dataView?.getUint32(baseStepAddress + (8 * SIZE_U32), true)],
  ]), [baseStepAddress]);

  const diffOffset = baseStepAddress + REGISTERS_SIZE;

  const diffAddress = dataView?.getUint32(diffOffset, true);



  const instructionsStartIndex = Math.max(current - INSTRUCTIONS_PREVIOUS_ROWS, 0);
  const instructionsEndIndex = Math.min(instructionsStartIndex + 50, instructions?.length ?? Number.POSITIVE_INFINITY);

  const instructionsSlice = instructions?.slice(instructionsStartIndex, instructionsEndIndex) ?? [];

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <div>
          <input type="file" onChange={handleDumpFile} />
          <input type="file" onChange={handleInstructionsFile} />
        </div>
        {
          dataView && buffer ? (
            <>
              <ul className={styles.registers}>
                {REGISTERS_386.map((register, i) => (
                  <li key={register}>
                    <div className={REGISTER_COLORS[register]}>{register}</div>
                    <div>{dumpUint32(dataView.getUint32(baseStepAddress + (i * SIZE_U32), true))}</div>
                  </li>
                ))}
              </ul>
              <RegistersContext.Provider value={registersProps}>
                <div className={styles.splitView}>
                  <HexView buffer={buffer} targetAddress={diffAddress} />
                  <div>
                    {
                      instructionsSlice
                        .map((s, i) =>
                          <div key={i} className={instructionsStartIndex + i === current - 1 ? "orange" : undefined}>{s}</div>)
                    }
                  </div>
                </div>
              </RegistersContext.Provider>
            </>
          ) : null
        }
      </main>
      <div className={styles.slider}>
        <input
          type="range"
          min={0}
          max={max}
          value={current}
          onChange={handleChange}
          className={styles.sliderControl}
        />
        <span className={styles.sliderCounter}>
          {`${current}/${max}`}
        </span>
      </div>
    </div>
  );
}

export default App;
