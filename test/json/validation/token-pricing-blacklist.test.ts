import { describe, expect, test } from "@jest/globals";
import { getAddress } from "viem";
import { loadJsonFile, VALID_CHAIN_IDS } from "../../utils/jsonValidators";

interface TokenPricingBlacklistEntry {
  address: string;
  chainId: number;
}

describe("token-pricing-blacklist.json validation", () => {
  const entries = loadJsonFile("token-pricing-blacklist.json") as TokenPricingBlacklistEntry[];

  test("file is an array", () => {
    expect(Array.isArray(entries)).toBe(true);
  });

  test("each entry has checksummed address and integer chainId", () => {
    const errors: string[] = [];
    entries.forEach((row, index) => {
      if (typeof row.address !== "string" || !row.address) {
        errors.push(`index ${index}: address must be a non-empty string`);
        return;
      }
      try {
        const checksummed = getAddress(row.address);
        if (row.address !== checksummed) {
          errors.push(
            `index ${index}: address must be checksummed (expected ${checksummed}, got ${row.address})`
          );
        }
      } catch {
        errors.push(`index ${index}: invalid address ${row.address}`);
      }
      if (typeof row.chainId !== "number" || !Number.isInteger(row.chainId)) {
        errors.push(`index ${index}: chainId must be an integer`);
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

  test("no duplicate address + chainId pairs", () => {
    const seen = new Map<string, number>();
    const dupes: string[] = [];
    entries.forEach((row, index) => {
      const key = `${row.chainId}:${row.address.toLowerCase()}`;
      const first = seen.get(key);
      if (first !== undefined) {
        dupes.push(
          `duplicate ${row.address} on chain ${row.chainId} (indices ${first} and ${index})`
        );
      } else {
        seen.set(key, index);
      }
    });
    expect(dupes).toEqual([]);
  });
});
