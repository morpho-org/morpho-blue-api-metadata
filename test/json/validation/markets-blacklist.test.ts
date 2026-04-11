import { describe, expect, test } from "@jest/globals";
import { loadJsonFile, VALID_CHAIN_IDS } from "../../utils/jsonValidators";

interface MarketBlacklistEntry {
  id: string;
  chainId: number;
  countryCodes: string[];
}

const MARKET_ID_HEX = /^0x[a-fA-F0-9]{64}$/;

/** ISO 3166-1 alpha-2 or "*" for all regions (see README markets blacklist). */
function isValidCountryCode(code: string): boolean {
  if (code === "*") return true;
  return /^[A-Z]{2}$/.test(code);
}

describe("markets-blacklist.json validation", () => {
  const entries = loadJsonFile("markets-blacklist.json") as MarketBlacklistEntry[];

  test("file is a non-empty array", () => {
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  test("each entry has id, chainId, and countryCodes with correct types", () => {
    const errors: string[] = [];
    entries.forEach((row, index) => {
      if (typeof row.id !== "string" || !row.id) {
        errors.push(`index ${index}: id must be a non-empty string`);
      }
      if (typeof row.chainId !== "number" || !Number.isInteger(row.chainId)) {
        errors.push(`index ${index}: chainId must be an integer`);
      }
      if (!Array.isArray(row.countryCodes) || row.countryCodes.length === 0) {
        errors.push(`index ${index}: countryCodes must be a non-empty array`);
      }
    });
    if (errors.length) throw new Error(errors.join("\n"));
  });

  test("each market id is a 32-byte hex string", () => {
    const errors: string[] = [];
    entries.forEach((row, index) => {
      if (!MARKET_ID_HEX.test(row.id)) {
        errors.push(
          `index ${index}: invalid market id (expected 0x + 64 hex chars): ${row.id}`
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

  test("country codes are ISO 3166-1 alpha-2 or *", () => {
    const errors: string[] = [];
    entries.forEach((row, index) => {
      row.countryCodes.forEach((code, cIdx) => {
        if (typeof code !== "string" || !isValidCountryCode(code)) {
          errors.push(
            `index ${index}, countryCodes[${cIdx}]: invalid code "${code}" (use two uppercase letters or *)`
          );
        }
      });
    });
    if (errors.length) throw new Error(errors.join("\n"));
  });

  test("no duplicate id + chainId pairs", () => {
    const seen = new Map<string, number>();
    const dupes: string[] = [];
    entries.forEach((row, index) => {
      const key = `${row.chainId}:${row.id.toLowerCase()}`;
      const first = seen.get(key);
      if (first !== undefined) {
        dupes.push(`duplicate id ${row.id} on chain ${row.chainId} (indices ${first} and ${index})`);
      } else {
        seen.set(key, index);
      }
    });
    expect(dupes).toEqual([]);
  });
});
