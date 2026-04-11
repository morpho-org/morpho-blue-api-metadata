import { describe, expect, test } from "@jest/globals";
import { loadJsonFile, VALID_CHAIN_IDS } from "../../utils/jsonValidators";

interface MerklSingleTokenEntry {
  market: string;
  chainId: number;
}

const MARKET_ID_HEX = /^0x[a-fA-F0-9]{64}$/;

describe("merkl-single-token-blacklist.json validation", () => {
  const entries = loadJsonFile("merkl-single-token-blacklist.json") as MerklSingleTokenEntry[];

  test("file is a non-empty array", () => {
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  test("each entry has market id and chainId with correct types", () => {
    const errors: string[] = [];
    entries.forEach((row, index) => {
      if (typeof row.market !== "string" || !row.market) {
        errors.push(`index ${index}: market must be a non-empty string`);
      }
      if (typeof row.chainId !== "number" || !Number.isInteger(row.chainId)) {
        errors.push(`index ${index}: chainId must be an integer`);
      }
    });
    if (errors.length) throw new Error(errors.join("\n"));
  });

  test("each market id is a 32-byte hex string", () => {
    const errors: string[] = [];
    entries.forEach((row, index) => {
      if (!MARKET_ID_HEX.test(row.market)) {
        errors.push(
          `index ${index}: invalid market id (expected 0x + 64 hex chars): ${row.market}`
        );
      }
    });
    if (errors.length) throw new Error(errors.join("\n"));
  });

  test("chain IDs are supported", () => {
    const allowed = new Set<number>(VALID_CHAIN_IDS);
    const errors: string[] = [];
    entries.forEach((row, index) => {
      if (!allowed.has(row.chainId)) {
        errors.push(`index ${index}: unsupported chainId ${row.chainId}`);
      }
    });
    if (errors.length) throw new Error(errors.join("\n"));
  });

  test("no duplicate market + chainId pairs", () => {
    const seen = new Map<string, number>();
    const dupes: string[] = [];
    entries.forEach((row, index) => {
      const key = `${row.chainId}:${row.market.toLowerCase()}`;
      const first = seen.get(key);
      if (first !== undefined) {
        dupes.push(
          `duplicate market on chain ${row.chainId} (indices ${first} and ${index})`
        );
      } else {
        seen.set(key, index);
      }
    });
    expect(dupes).toEqual([]);
  });
});
