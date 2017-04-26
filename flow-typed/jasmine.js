// @flow
/* eslint-disable no-unused-vars */

declare function describe(description: string, cb: Function): void

declare function it(description: string, cb: Function): void

type JasmineExpectType = {
  not: JasmineExpectType;
  toBe(value: mixed): void;
  toBeCloseTo(num: number, delta: mixed): void;
  toBeDefined(): void;
  toBeFalsy(): void;
  toBeGreaterThan(number: number): void;
  toBeLessThan(number: number): void;
  toBeNull(): void;
  toBeTruthy(): void;
  toBeUndefined(): void;
  toContain(str: string): void;
  toEqual(value: mixed): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledTimes(number: number): void;
  toHaveBeenCalledWith(...args: Array<any>): void;
  toMatch(regexp: RegExp): void;
  toThrow(message?: string): void;
  toThrowError(val: mixed): void;
};

declare function expect(value: mixed): JasmineExpectType;
