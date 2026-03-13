import { db } from "../db";

export type DrizzleTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TxFn<T> = (trx: DrizzleTx) => Promise<T>;

export const tx = {
  run<T>(fn: TxFn<T>): Promise<T> {
    return db.transaction(fn);
  },
};
