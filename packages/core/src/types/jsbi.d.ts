declare module "jsbi" {
  class JSBI {
    private constructor(length: number, sign: boolean);

    static BigInt(from: number | string | boolean | object): JSBI;

    toString(radix?: number): string;
    static toNumber(x: JSBI): number;

    static unaryMinus(x: JSBI): JSBI;
    static bitwiseNot(x: JSBI): JSBI;

    static exponentiate(x: JSBI, y: JSBI): JSBI;
    static multiply(x: JSBI, y: JSBI): JSBI;
    static divide(x: JSBI, y: JSBI): JSBI;
    static remainder(x: JSBI, y: JSBI): JSBI;
    static add(x: JSBI, y: JSBI): JSBI;
    static subtract(x: JSBI, y: JSBI): JSBI;
    static leftShift(x: JSBI, y: JSBI): JSBI;
    static signedRightShift(x: JSBI, y: JSBI): JSBI;

    static lessThan(x: JSBI, y: JSBI): boolean;
    static lessThanOrEqual(x: JSBI, y: JSBI): boolean;
    static greaterThan(x: JSBI, y: JSBI): boolean;
    static greaterThanOrEqual(x: JSBI, y: JSBI): boolean;
    static equal(x: JSBI, y: JSBI): boolean;
    static notEqual(x: JSBI, y: JSBI): boolean;

    static bitwiseAnd(x: JSBI, y: JSBI): JSBI;
    static bitwiseXor(x: JSBI, y: JSBI): JSBI;
    static bitwiseOr(x: JSBI, y: JSBI): JSBI;

    static asIntN(n: number, x: JSBI): JSBI;
    static asUintN(n: number, x: JSBI): JSBI;
  }

  export = JSBI;
}
