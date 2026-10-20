declare module 'googleapis' {
  export const google: any;
}

declare module 'google-auth-library' {
  export class OAuth2Client {
    constructor(...args: any[]);
    setCredentials(credentials: any): void;
  }
}

declare module 'buffer' {
  export class Buffer {
    static from(data: any, encoding?: string): any;
    static alloc(size: number, fill?: any): any;
    static allocUnsafe(size: number): any;
    static isBuffer(obj: any): boolean;
    static concat(list: any[], totalLength?: number): any;
    static [key: string]: any;
    [key: string]: any;
  }
}
