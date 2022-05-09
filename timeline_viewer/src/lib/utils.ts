export function dumpUint32(value: number) {
  let valueStr = value.toString(16);
  while (valueStr.length < 8) {
    valueStr = '0' + valueStr;
  }
  return valueStr;
}

export function dumpUint8(value: number) {
  let valueStr = value.toString(16);
  while (valueStr.length < 2) {
    valueStr = '0' + valueStr;
  }
  return valueStr;
}