// Shim for WatermelonDB until npm i @nozbe/watermelondb — allows tsc --noEmit verde in Swarm phase
declare module '@nozbe/watermelondb' {
  export const appSchema: any;
  export const tableSchema: any;
  export class Model { update(fn: any): Promise<void>; }
  export class Database { constructor(opts: any); get<T>(name: string): any; write(fn: any): Promise<void>; action(fn: any): any; }
  export const Q: any;
}
declare module '@nozbe/watermelondb/adapters/sqlite' {
  export default class SQLiteAdapter { constructor(opts: any); }
}
declare module '@nozbe/watermelondb/decorators' {
  export function field(name: string): any;
  export function text(name: string): any;
  export function json(name: string, sanitizer: any): any;
  export function date(name: string): any;
  export function readonly(fn: any): any;
  export function writer(fn: any): any;
  export function children(name: string): any;
  export function lazy(fn: any): any;
}
declare module '@nozbe/watermelondb/sync' { export function synchronize(opts: any): Promise<void>; }
declare module '@nozbe/watermelondb/react' { export function withObservables(...args: any[]): any; }
