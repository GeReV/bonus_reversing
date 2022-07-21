import { Socket } from 'net';
import {
  decodeHexBuf,
  decodeHexUint32,
  decodeHexUint32Array,
  encodeHexBuf,
  encodeHexByte,
  encodeHexUint32,
  encodeHexUint32BE,
  gdbMessage,
  REGISTERS_386,
} from './gdb-utils';

export function dumpUint8(value: number) {
  let valueStr = value.toString(16);
  while (valueStr.length < 2) {
    valueStr = '0' + valueStr;
  }
  return valueStr;
}

export function dumpUint32(value: number) {
  let valueStr = value.toString(16);
  while (valueStr.length < 8) {
    valueStr = '0' + valueStr;
  }
  return valueStr;
}

export class GDBClient {
  private socket = new Socket();
  private connected: boolean = false;

  private rejectCurrentResponse?: (e: Error) => void;


  constructor(private readonly debug: boolean = false) {
  }

  get isConnected() {
    return this.connected;
  }

  async connect(host: string = "127.0.0.1", port: number = 1234) {
    return new Promise<Buffer>((resolve, reject) => {
      this.rejectCurrentResponse = reject;

      const handleError = (error: Error) => {
        console.error("Error:", error);

        this.rejectCurrentResponse?.(new Error(`Socket error: ${error}`));

        cleanup();
      };

      const handleClose = () => {
        console.log("Socket closed");
        this.rejectCurrentResponse?.(new Error(`Socket was closed`));

        cleanup();
      };

      const handleData = (data: Buffer) => {
        console.log("Data");
        if (data.toString() === '+') {
          resolve(data);
        } else {
          reject(new Error(`Invalid data from gdbserver: ${data}`));
        }

        cleanup();
      };

      const cleanup = () => {
        this.socket.off('error', handleError);
        this.socket.off('close', handleClose);
        this.socket.off('data', handleData);
      };

      this.socket.once('error', handleError);
      this.socket.once('close', handleClose);
      this.socket.once('data', handleData);
      this.socket.once("connect", () => {
        console.log("Connected.");
        this.connected = true;

        cleanup();

        resolve(Buffer.from(""));
      });

      this.socket.setEncoding("utf8");

      if (this.debug) {
        this.socket.on('data', (buffer: Buffer) => {
          console.log("Received:", buffer);
        })
      }

      this.socket.connect(port, host);
    });
  }

  readResponse(needAck = true) {
    return new Promise<string>((resolve, reject) => {
      this.rejectCurrentResponse = reject;
      let data = '';

      const listener = (buffer: Buffer) => {
        data += buffer.toString();

        if (data.startsWith('$O')) {

          const hashIndex = data.indexOf('#');

          if (hashIndex >= 0 && hashIndex + 2 < data.length) {
            if (this.debug) {
              console.log("Remote console:", String.fromCharCode(...decodeHexBuf(data.slice(0, -3))));
            }

            this.socketWrite('+');

            data = '';
          }

          return;
        }

        if (needAck) {
          if (data[0] === '+') {
            needAck = false;
            data = data.slice(1);
          } else {
            this.socket.off('data', listener);

            reject(new Error(`No ack from gdbserver: ${data}`));
          }
        }

        if (data.length && data[0] !== '$') {
          this.socket.off('data', listener);

          reject(new Error(`Invalid response from gdbserver: ${data}`));
        }

        const hashIndex = data.indexOf('#');

        if (hashIndex >= 0 && hashIndex + 2 < data.length) {
          this.socket.off('data', listener);

          this.socketWrite("+");

          resolve(data.slice(1, hashIndex));
        }
      };

      this.socket.on('data', listener);
    });
  }

  private async sendCommand(command: string, needAck = true) {
    this.sendMessage(command);

    return await this.readResponse(needAck);
  }

  private sendMessage(command: string) {
    this.socketWrite(gdbMessage(command));
  }

  private socketWrite(data: string) {
    if (this.debug) {
      console.log("Sent:", data);
    }
    this.socket.write(data);
  }

  async monitor(cmd: string) {
    const buf = new Uint8Array(cmd.length);

    for (let i = 0; i < cmd.length; i++) {
      buf[i] = cmd.charCodeAt(i);
    }

    this.sendMessage(`qRcmd,${encodeHexBuf(buf)}`);

    const response = await this.readResponse();

    if (response !== 'OK') {
      throw new Error(`Invalid monitor response: ${response}`);
    }

    return response;
  }

  async readCommands() {
    return await this.sendCommand('?');
  }

  async readRegisters() {
    const response = await this.sendCommand('g');

    return decodeHexUint32Array(response.slice(0, REGISTERS_386.length * 8));
  }

  async readRegister(index: number) {
    const response = await this.sendCommand(`p${encodeHexByte(index)}`);
    if (response.length === 2) {
      return decodeHexBuf(response)[0];
    }
    return decodeHexUint32(response);
  }

  async writeRegister(index: number, value: number, width: 8 | 32 = 32) {
    const response = await this.sendCommand(
      `P${encodeHexByte(index)}=${width === 32 ? encodeHexUint32(value) : encodeHexByte(value)}`
    );
    if (response !== 'OK') {
      throw new Error(`Invalid writeRegister response: ${response}`);
    }
  }

  async continue() {
    // this.sendMessage('vCont;c');
    return this.sendMessage('c');
  }

  async singleStep() {
    const response = await this.sendCommand('s');

    if (!response.startsWith('T') && !response.startsWith('S')) {
      throw new Error(`Invalid singleStep response: ${response}`);
    }
  }

  async readMemory(address: number, length: number) {
    const addressStr = encodeHexUint32BE(address);
    const lengthStr = encodeHexUint32BE(length);
    const response = await this.sendCommand(`m ${addressStr},${lengthStr}`);
    return decodeHexBuf(response);
  }

  async writeMemory(address: number, data: Uint8Array) {
    const addressStr = encodeHexUint32BE(address);
    const lengthStr = encodeHexUint32BE(data.length);

    const response = await this.sendCommand(`M ${addressStr},${lengthStr}:${encodeHexBuf(data)}`);

    if (response !== 'OK') {
      throw new Error(`Invalid writeRegister response: ${response}`);
    }
  }

  async disconnect() {
    this.rejectCurrentResponse = undefined;

    this.continue();

    this.socket.destroy();
  }
}
