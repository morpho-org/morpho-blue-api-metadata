import { describe, expect, test } from "@jest/globals";
import { loadJsonFile } from "../../utils/jsonValidators";
import { getAddress } from "viem";

interface OracleVault {
  address: string;
  chainId: number;
  vendor: string;
  pair: string[];
  diffDecimals?: number;
}

describe("oracle-vaults.json validation", () => {
  // Load and filter oracle vaults for only chain IDs 1, 8453, 10, 137, 130, 999, 747474 & 42161];
  const allOracleVaults = loadJsonFile("oracle-vaults.json") as OracleVault[];
  const oracleVaults = allOracleVaults.filter(
    (vault) => vault.chainId === 1 || vault.chainId === 8453 || vault.chainId === 137 || vault.chainId === 130 || vault.chainId === 10 || vault.chainId === 999 || vault.chainId === 747474 || vault.chainId === 42161
  );

  test("addresses are checksummed", () => {
    oracleVaults.forEach((vault, index) => {
      try {
        const checksummedAddress = getAddress(vault.address);
        expect(vault.address).toBe(checksummedAddress);
      } catch (error) {
        throw new Error(
          `Invalid address format at index ${index}: ${vault.address}`
        );
      }
    });
  });

  test("vault addresses are unique per chain ID", () => {
    const addressChainMap = new Map<string, Set<number>>();
    const duplicates: Array<{ address: string; chainId: number }> = [];

    oracleVaults.forEach((vault) => {
      const existingChainIds =
        addressChainMap.get(vault.address.toLowerCase()) || new Set();

      if (existingChainIds.has(vault.chainId)) {
        duplicates.push({
          address: vault.address,
          chainId: vault.chainId,
        });
      }

      existingChainIds.add(vault.chainId);
      addressChainMap.set(vault.address.toLowerCase(), existingChainIds);
    });

    try {
      expect(duplicates).toHaveLength(0);
    } catch (error) {
      throw new Error(
        `Found duplicate address-chainId combinations: ${JSON.stringify(
          duplicates,
          null,
          2
        )}`
      );
    }
  });

  test("chain IDs are valid (1, 8453, 10, 130, 137, 999, 747474 or 42161)", () => {
    const validChainIds = [1, 8453, 10, 130, 137, 999, 747474, 42161];
    const errors: string[] = [];

    oracleVaults.forEach((vault, index) => {
      if (!validChainIds.includes(vault.chainId)) {
        errors.push(`Invalid chainId at index ${index}: ${vault.chainId}`);
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found chain ID validation errors:\n${errors.join("\n")}`
      );
    }
  });

  test("vendor is a non-empty string", () => {
    const errors: string[] = [];

    oracleVaults.forEach((vault, index) => {
      if (typeof vault.vendor !== "string" || vault.vendor.trim() === "") {
        errors.push(
          `Invalid vendor at index ${index}: ${vault.vendor} (address: ${vault.address})`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(`Found vendor validation errors:\n${errors.join("\n")}`);
    }
  });

  test("pair is an array of exactly two non-empty strings", () => {
    const errors: string[] = [];

    oracleVaults.forEach((vault, index) => {
      // Check if pair is an array
      if (!Array.isArray(vault.pair)) {
        errors.push(
          `Invalid pair at index ${index}: not an array (address: ${vault.address})`
        );
        return;
      }

      // Check array length
      if (vault.pair.length !== 2) {
        errors.push(
          `Invalid pair at index ${index}: expected 2 elements, got ${vault.pair.length} (address: ${vault.address})`
        );
        return;
      }

      // Check each element is a non-empty string
      vault.pair.forEach((token, tokenIndex) => {
        if (typeof token !== "string" || token.trim() === "") {
          errors.push(
            `Invalid pair token at index ${index}, position ${tokenIndex}: ${token} (address: ${vault.address})`
          );
        }
      });
    });

    if (errors.length > 0) {
      throw new Error(`Found pair validation errors:\n${errors.join("\n")}`);
    }
  });
});
