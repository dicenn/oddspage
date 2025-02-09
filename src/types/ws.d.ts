
declare module 'ws' {
  import { EventEmitter } from 'events';
  import { IncomingMessage } from 'http';
  import { Duplex } from 'stream';

  class WebSocket extends EventEmitter {
    static CONNECTING: 0;
    static OPEN: 1;
    static CLOSING: 2;
    static CLOSED: 3;

    constructor(address: string, options?: WebSocket.ClientOptions);
    constructor(address: string, protocols?: string | string[], options?: WebSocket.ClientOptions);

    readyState: number;
    send(data: string | Buffer | DataView | ArrayBuffer, cb?: (err?: Error) => void): void;
    close(code?: number, data?: string): void;
    terminate(): void;

    on(event: 'close', listener: (code: number, reason: string) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'message', listener: (data: WebSocket.RawData) => void): this;
    on(event: 'open', listener: () => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  namespace WebSocket {
    interface ClientOptions {
      protocol?: string;
      handshakeTimeout?: number;
      perMessageDeflate?: boolean | PerMessageDeflateOptions;
      maxPayload?: number;
      followRedirects?: boolean;
      headers?: { [key: string]: string };
    }

    interface PerMessageDeflateOptions {
      serverNoContextTakeover?: boolean;
      clientNoContextTakeover?: boolean;
      serverMaxWindowBits?: number;
      clientMaxWindowBits?: number;
      zlibInflateOptions?: {
        chunkSize?: number;
        windowBits?: number;
        level?: number;
        memLevel?: number;
        strategy?: number;
      };
      zlibDeflateOptions?: {
        chunkSize?: number;
        windowBits?: number;
        level?: number;
        memLevel?: number;
        strategy?: number;
      };
      threshold?: number;
      concurrencyLimit?: number;
    }

    type RawData = Buffer | ArrayBuffer | Buffer[];

    interface ServerOptions {
      host?: string;
      port?: number;
      backlog?: number;
      server?: import('http').Server | import('https').Server;
      verifyClient?: VerifyClientCallbackAsync | VerifyClientCallbackSync;
      handleProtocols?: (protocols: string[], request: IncomingMessage) => string | false;
      path?: string;
      noServer?: boolean;
      clientTracking?: boolean;
      perMessageDeflate?: boolean | PerMessageDeflateOptions;
      maxPayload?: number;
    }

    type VerifyClientCallbackAsync = (info: { origin: string; secure: boolean; req: IncomingMessage }, callback: (res: boolean, code?: number, message?: string) => void) => void;
    type VerifyClientCallbackSync = (info: { origin: string; secure: boolean; req: IncomingMessage }) => boolean;

    class Server extends EventEmitter {
      constructor(options?: ServerOptions, callback?: () => void);
      close(cb?: (err?: Error) => void): void;
      handleUpgrade(request: IncomingMessage, socket: Duplex, upgradeHead: Buffer, callback: (client: WebSocket) => void): void;
      on(event: 'connection', cb: (socket: WebSocket, request: IncomingMessage) => void): this;
      on(event: 'error', cb: (error: Error) => void): this;
      on(event: 'headers', cb: (headers: string[], request: IncomingMessage) => void): this;
      on(event: string | symbol, listener: (...args: any[]) => void): this;
    }
  }

  export = WebSocket;
}
