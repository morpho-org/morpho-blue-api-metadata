import { describe, expect, test } from "@jest/globals";
import {
  fetchWithRetry,
  loadJsonFile,
  VALID_CHAIN_IDS,
} from "../../utils/jsonValidators";
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

interface Curator {
  name: string;
  id: string;
  addresses: { [chainId: string]: string[] };
}

const MORPHO_API_URL = "https://api.morpho.org/graphql";

async function fetchVaultNames(
  v1Address: string,
  v2Address: string,
  chainId: number
): Promise<{ v1Name: string | null; v2Name: string | null }> {
  const query = `
    query {
      vault: vaultByAddress(address: "${v1Address}", chainId: ${chainId}) {
        name
      }
      vaultV2: vaultV2ByAddress(address: "${v2Address}", chainId: ${chainId}) {
        name
      }
    }
  `;

  const response = await fetchWithRetry({
    input: MORPHO_API_URL,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    },
  });

  const json = (await response.json()) as {
    data?: {
      vault?: { name: string } | null;
      vaultV2?: { name: string } | null;
    };
  };

  return {
    v1Name: json.data?.vault?.name ?? null,
    v2Name: json.data?.vaultV2?.name ?? null,
  };
}

describe("vaults-v1-to-v2-migration.json validation", () => {
  const migrations = loadJsonFile(
    "vaults-v1-to-v2-migration.json"
  ) as VaultMigrationEntry[];
  const v2Vaults = loadJsonFile("vaults-v2-listing.json") as VaultV2[];
  const curators = loadJsonFile("curators-listing.json") as Curator[];

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

  test(
    "(informational) curator name appears in both V1 and V2 vault names",
    async () => {
      const curatorNames = curators.map((c) => c.name);
      const warnings: string[] = [];

      for (const [index, entry] of migrations.entries()) {
        let v1Name: string | null;
        let v2Name: string | null;

        try {
          ({ v1Name, v2Name } = await fetchVaultNames(
            entry.v1VaultAddress,
            entry.v2VaultAddress,
            entry.chainId
          ));
        } catch {
          console.warn(
            `Entry ${index}: Could not fetch vault names from Morpho API for chain ${entry.chainId}`
          );
          continue;
        }

        if (!v1Name || !v2Name) {
          console.warn(
            `Entry ${index}: Vault not found on Morpho API — ` +
              `V1=${v1Name ?? "not found"}, V2=${v2Name ?? "not found"}`
          );
          continue;
        }

        const v1NameLower = v1Name.toLowerCase();
        const v2NameLower = v2Name.toLowerCase();

        const v1MatchingCurators = curatorNames.filter((name) =>
          v1NameLower.includes(name.toLowerCase())
        );
        const v2MatchingCurators = curatorNames.filter((name) =>
          v2NameLower.includes(name.toLowerCase())
        );

        const commonCurators = v1MatchingCurators.filter((name) =>
          v2MatchingCurators.includes(name)
        );

        if (commonCurators.length > 0) {
          console.log(
            `Entry ${index}: Curator [${commonCurators.join(", ")}] found in both vault names. ` +
              `V1="${v1Name}", V2="${v2Name}"`
          );
        } else if (
          v1MatchingCurators.length > 0 ||
          v2MatchingCurators.length > 0
        ) {
          const onlyInV1 = v1MatchingCurators.filter(
            (name) => !v2MatchingCurators.includes(name)
          );
          const onlyInV2 = v2MatchingCurators.filter(
            (name) => !v1MatchingCurators.includes(name)
          );
          warnings.push(
            `Entry ${index}: Curator name mismatch — ` +
              `V1="${v1Name}" matches [${onlyInV1.join(", ") || "none"}], ` +
              `V2="${v2Name}" matches [${onlyInV2.join(", ") || "none"}]`
          );
        } else {
          warnings.push(
            `Entry ${index}: No curator name found in either vault name. ` +
              `V1="${v1Name}", V2="${v2Name}"`
          );
        }
      }

      if (warnings.length > 0) {
        console.warn(
          `\n=== Curator Name Warnings (${warnings.length}) ===\n` +
            warnings.join("\n")
        );
      }

      // Non-blocking: always pass
      expect(true).toBe(true);
    },
    30000
  );
});
