import { describe, expect, test } from "@jest/globals";
import { loadJsonFile, VALID_CHAIN_IDS } from "../../utils/jsonValidators";
import { getAddress } from "viem";

interface VaultMigrationEntry {
  v1VaultAddress: string;
  v2VaultAddress: string;
  chainId: number;
}

interface VaultV2 {
  address: string;
  chainId: number;
  description: string;
  history: Array<{ action: string; timestamp: number }>;
}

describe("vaults-v1-to-v2-migration.json validation", () => {
  const migrations = loadJsonFile(
    "vaults-v1-to-v2-migration.json"
  ) as VaultMigrationEntry[];
  const v2Vaults = loadJsonFile("vaults-v2-listing.json") as VaultV2[];

  test("file is a valid array", () => {
    expect(Array.isArray(migrations)).toBe(true);
  });

  test("each entry has required fields with correct types", () => {
    const errors: string[] = [];

    migrations.forEach((entry, index) => {
      try {
        expect(entry).toEqual(
          expect.objectContaining({
            v1VaultAddress: expect.any(String),
            v2VaultAddress: expect.any(String),
            chainId: expect.any(Number),
          })
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push(
          `Entry at index ${index} is missing or has invalid required fields:\n${errorMessage}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} validation errors:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("V1 vault addresses are properly checksummed", () => {
    migrations.forEach((entry, index) => {
      try {
        const checksummedAddress = getAddress(entry.v1VaultAddress);
        expect(entry.v1VaultAddress).toBe(checksummedAddress);
      } catch (error) {
        throw new Error(
          `Invalid V1 address format at index ${index}: ${entry.v1VaultAddress}`
        );
      }
    });
  });

  test("V2 vault addresses are properly checksummed", () => {
    migrations.forEach((entry, index) => {
      try {
        const checksummedAddress = getAddress(entry.v2VaultAddress);
        expect(entry.v2VaultAddress).toBe(checksummedAddress);
      } catch (error) {
        throw new Error(
          `Invalid V2 address format at index ${index}: ${entry.v2VaultAddress}`
        );
      }
    });
  });

  test("chain IDs are valid", () => {
    const validChainIds: number[] = [...VALID_CHAIN_IDS];
    const errors: string[] = [];

    migrations.forEach((entry, index) => {
      if (!validChainIds.includes(entry.chainId)) {
        errors.push(
          `Entry at index ${index} has invalid chain ID: ${entry.chainId}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} invalid chain ID errors:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("V1 and V2 addresses are different (no self-referencing)", () => {
    const errors: string[] = [];

    migrations.forEach((entry, index) => {
      if (
        entry.v1VaultAddress.toLowerCase() ===
        entry.v2VaultAddress.toLowerCase()
      ) {
        errors.push(
          `Entry at index ${index} has same V1 and V2 address: ${entry.v1VaultAddress} on chain ${entry.chainId}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} self-referencing entries:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("no duplicate V1 vault addresses per chain", () => {
    const seen = new Set<string>();
    const duplicates: Array<{ v1VaultAddress: string; chainId: number }> = [];

    migrations.forEach((entry) => {
      const key = `${entry.chainId}:${entry.v1VaultAddress.toLowerCase()}`;

      if (seen.has(key)) {
        duplicates.push({
          v1VaultAddress: entry.v1VaultAddress,
          chainId: entry.chainId,
        });
      }

      seen.add(key);
    });

    try {
      expect(duplicates).toHaveLength(0);
    } catch (error) {
      throw new Error(
        `Found duplicate V1 vault address-chainId combinations: ${JSON.stringify(
          duplicates,
          null,
          2
        )}`
      );
    }
  });

  test("V2 vaults are listed and currently active in vaults-v2-listing.json", () => {
    const v2VaultMap = new Map<string, VaultV2>();
    v2Vaults.forEach((vault) => {
      const key = `${vault.chainId}:${vault.address.toLowerCase()}`;
      v2VaultMap.set(key, vault);
    });

    const errors: string[] = [];

    migrations.forEach((entry, index) => {
      const key = `${entry.chainId}:${entry.v2VaultAddress.toLowerCase()}`;
      const v2Vault = v2VaultMap.get(key);

      if (!v2Vault) {
        errors.push(
          `Entry at index ${index}: V2 vault ${entry.v2VaultAddress} on chain ${entry.chainId} is not listed in vaults-v2-listing.json`
        );
        return;
      }

      const lastHistoryEntry = v2Vault.history[v2Vault.history.length - 1];
      if (!lastHistoryEntry || lastHistoryEntry.action !== "added") {
        errors.push(
          `Entry at index ${index}: V2 vault ${entry.v2VaultAddress} on chain ${entry.chainId} is not currently active (last action: ${lastHistoryEntry?.action ?? "none"})`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} V2 vault listing errors:\n\n${errors.join("\n\n")}`
      );
    }
  });
});
