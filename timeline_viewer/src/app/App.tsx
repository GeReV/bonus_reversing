import React, { ChangeEventHandler, useCallback, useMemo, useState } from 'react';
import styles from './App.module.css';
import { dumpUint32 } from "../lib/utils";
import HexView from "./components/HexView";
import RegistersContext, { RegistersContextProps } from './components/RegistersContext';
import {
  REGISTER_COLORS,
  REGISTERS_386,
} from "./consts";
import GDBRecording from "./recording";

const INSTRUCTIONS_PREVIOUS_ROWS = 5;

function App(): JSX.Element | null {
  const [instructions, setInstructions] = useState<string[]>();
  const [recording, setRecording] = useState<GDBRecording | null>(null);
  const [current, setCurrent] = useState(0);

  const buffer = useMemo(
    () => recording ? recording.getMemory(current) : undefined,
    [recording, current]
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

      const recording = new GDBRecording(await file.arrayBuffer());

      setRecording(recording);
    }
  }, []);

  const currentStep = useMemo(() => recording?.getStep(current), [recording, current]);

  const handleInstructionsFile = useCallback<ChangeEventHandler<HTMLInputElement>>(async (e) => {
    if (e.currentTarget.files?.length) {
      const file = e.currentTarget.files[0];

      const instructions = (await file.text()).split(/\r?\n/).map(s => s.replace(/^"|"$|\\r\\n\\n/g, ""));

      setInstructions(instructions);
    }
  }, []);

  const registersProps = useMemo<RegistersContextProps>(() => new Map<"esp" | "ebp" | "esi" | "edi" | "eip", number | undefined>([
    ["esp", currentStep?.registers.at(4)],
    ["ebp", currentStep?.registers.at(5)],
    ["eip", currentStep?.registers.at(8)],
  ]), [currentStep]);

  const max = recording ? recording.stepCount() - 1 : 0;

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
          recording && currentStep && buffer ? (
            <>
              <ul className={styles.registers}>
                {REGISTERS_386.map((register, i) => {
                  const value = currentStep.registers.at(i);

                  return (
                    <li key={register}>
                      <div className={REGISTER_COLORS[register]}>{register}</div>
                      <div>{typeof value === "undefined" ? "N/A" : dumpUint32(value)}</div>
                    </li>
                  )
                })}
              </ul>
              <RegistersContext.Provider value={registersProps}>
                <div className={styles.splitView}>
                  <HexView buffer={buffer} targetAddress={currentStep.diffs[0]?.[0]} />
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
