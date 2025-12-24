import { describe, expect, test, beforeAll, jest } from "@jest/globals";
import { loadJsonFile, VALID_CHAIN_IDS, fetchWithRetry } from "../../utils/jsonValidators";
import { getAddress } from "viem";

interface Metadata {
  content: string;
}

interface VaultWarning {
  vaultAddress: string;
  chainId: number;
  level: string;
  metadata: Metadata;
}

interface MarketWarning {
  marketId: string;
  chainId: number;
  level: string;
  metadata: Metadata;
}

type CustomWarning = VaultWarning | MarketWarning;

const shouldSkipApiTests = process.env.SKIP_VAULTS_API_TESTS === "true";
const MORPHO_API_URL = "https://api.morpho.org/graphql";

describe("custom-warnings.json validation", () => {
  const warnings = loadJsonFile("custom-warnings.json") as CustomWarning[];

  // Split warnings into vaults and markets based on the presence of vaultAddress or marketId
  const vaultWarnings = warnings.filter((w): w is VaultWarning => 'vaultAddress' in w);
  const marketWarnings = warnings.filter((w): w is MarketWarning => 'marketId' in w);

  test("file is an array", () => {
    expect(Array.isArray(warnings)).toBe(true);
  });

  test("each vault address is checksummed", () => {
    vaultWarnings.forEach((warning, index) => {
      try {
        const checksummedAddress = getAddress(warning.vaultAddress);
        expect(warning.vaultAddress).toBe(checksummedAddress);
      } catch (error) {
        throw new Error(
          `Invalid vault address format at index ${index}: ${warning.vaultAddress}`
        );
      }
    });
  });

  test("each market marketId is a valid 32-byte hex string", () => {
    const errors: string[] = [];

    marketWarnings.forEach((warning, index) => {
      const marketId = warning.marketId;
      // marketId should be a 32-byte hex string (0x + 64 hex chars = 66 chars total)
      const hexPattern = /^0x[a-fA-F0-9]{64}$/;
      if (!hexPattern.test(marketId)) {
        errors.push(
          `Market warning at index ${index} has invalid marketId format: ${marketId}. Expected 32-byte hex string (0x + 64 hex characters)`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} marketId format errors:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("no duplicate vaultAddress + chainId combinations", () => {
    const seen = new Map<string, number>();
    const duplicates: Array<{ vaultAddress: string; chainId: number; indices: number[] }> = [];

    vaultWarnings.forEach((warning, index) => {
      const key = `${warning.chainId}:${warning.vaultAddress.toLowerCase()}`;
      const firstIndex = seen.get(key);

      if (firstIndex !== undefined) {
        const existing = duplicates.find(d =>
          d.vaultAddress.toLowerCase() === warning.vaultAddress.toLowerCase() &&
          d.chainId === warning.chainId
        );
        if (existing) {
          existing.indices.push(index);
        } else {
          duplicates.push({
            vaultAddress: warning.vaultAddress,
            chainId: warning.chainId,
            indices: [firstIndex, index],
          });
        }
      } else {
        seen.set(key, index);
      }
    });

    try {
      expect(duplicates).toHaveLength(0);
    } catch (error) {
      throw new Error(
        `Found duplicate vaultAddress-chainId combinations:\n${JSON.stringify(
          duplicates,
          null,
          2
        )}`
      );
    }
  });

  test("no duplicate marketId + chainId combinations", () => {
    const seen = new Map<string, number>();
    const duplicates: Array<{ marketId: string; chainId: number; indices: number[] }> = [];

    marketWarnings.forEach((warning, index) => {
      const key = `${warning.chainId}:${warning.marketId.toLowerCase()}`;
      const firstIndex = seen.get(key);

      if (firstIndex !== undefined) {
        const existing = duplicates.find(d =>
          d.marketId.toLowerCase() === warning.marketId.toLowerCase() &&
          d.chainId === warning.chainId
        );
        if (existing) {
          existing.indices.push(index);
        } else {
          duplicates.push({
            marketId: warning.marketId,
            chainId: warning.chainId,
            indices: [firstIndex, index],
          });
        }
      } else {
        seen.set(key, index);
      }
    });

    try {
      expect(duplicates).toHaveLength(0);
    } catch (error) {
      throw new Error(
        `Found duplicate marketId-chainId combinations:\n${JSON.stringify(
          duplicates,
          null,
          2
        )}`
      );
    }
  });

  test("vault chain IDs are valid", () => {
    const validChainIds: number[] = [...VALID_CHAIN_IDS];
    const errors: string[] = [];

    vaultWarnings.forEach((warning, index) => {
      if (!validChainIds.includes(warning.chainId)) {
        errors.push(
          `Vault warning at index ${index} has invalid chain ID: ${warning.chainId}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} invalid chain ID errors:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("market chain IDs are valid", () => {
    const validChainIds: number[] = [...VALID_CHAIN_IDS];
    const errors: string[] = [];

    marketWarnings.forEach((warning, index) => {
      if (!validChainIds.includes(warning.chainId)) {
        errors.push(
          `Market warning at index ${index} has invalid chain ID: ${warning.chainId}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} invalid chain ID errors:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("each vault warning has required fields with correct types", () => {
    const errors: string[] = [];

    vaultWarnings.forEach((warning, index) => {
      const missingFields: string[] = [];

      if (typeof warning.vaultAddress !== "string" || !warning.vaultAddress) {
        missingFields.push("vaultAddress (string)");
      }
      if (typeof warning.chainId !== "number") {
        missingFields.push("chainId (number)");
      }
      if (typeof warning.level !== "string" || !warning.level) {
        missingFields.push("level (string)");
      }
      if (typeof warning.metadata !== "object" || warning.metadata === null) {
        missingFields.push("metadata (object)");
      }

      if (missingFields.length > 0) {
        errors.push(
          `Vault warning at index ${index} is missing or has invalid required fields: ${missingFields.join(", ")}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} validation errors:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("each market warning has required fields with correct types", () => {
    const errors: string[] = [];

    marketWarnings.forEach((warning, index) => {
      const missingFields: string[] = [];

      if (typeof warning.marketId !== "string" || !warning.marketId) {
        missingFields.push("marketId (string)");
      }
      if (typeof warning.chainId !== "number") {
        missingFields.push("chainId (number)");
      }
      if (typeof warning.level !== "string" || !warning.level) {
        missingFields.push("level (string)");
      }
      if (typeof warning.metadata !== "object" || warning.metadata === null) {
        missingFields.push("metadata (object)");
      }

      if (missingFields.length > 0) {
        errors.push(
          `Market warning at index ${index} is missing or has invalid required fields: ${missingFields.join(", ")}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} validation errors:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("vault metadata.content is a non-empty string", () => {
    const errors: string[] = [];

    vaultWarnings.forEach((warning, index) => {
      if (typeof warning.metadata.content !== "string" || warning.metadata.content.trim().length === 0) {
        errors.push(
          `Vault warning at index ${index}: metadata.content must be a non-empty string`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} content validation errors:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("market metadata.content is a non-empty string", () => {
    const errors: string[] = [];

    marketWarnings.forEach((warning, index) => {
      if (typeof warning.metadata.content !== "string" || warning.metadata.content.trim().length === 0) {
        errors.push(
          `Market warning at index ${index}: metadata.content must be a non-empty string`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} content validation errors:\n\n${errors.join("\n\n")}`
      );
    }
  });
});

// Separate describe block for API tests (can be skipped)
describe("custom-warnings.json - vault and market existence in Morpho API", () => {
  if (shouldSkipApiTests) {
    test.skip("SKIPPED via SKIP_VAULTS_API_TESTS", () => {});
    return;
  }

  const warnings = loadJsonFile("custom-warnings.json") as CustomWarning[];
  const vaultWarnings = warnings.filter((w): w is VaultWarning => 'vaultAddress' in w);
  const marketWarnings = warnings.filter((w): w is MarketWarning => 'marketId' in w);

  // Allow more time for network calls
  jest.setTimeout(60_000);

  /**
   * Fetch vault by address and chain ID to verify it exists
   */
  async function fetchVaultByAddress(
    address: string,
    chainId: number
  ): Promise<{ address: string } | null> {
    const query = `
      query VaultByAddress($address: String!, $chainId: Int!) {
        vaultByAddress(address: $address, chainId: $chainId) {
          address
        }
      }
    `;

    const response = await fetchWithRetry({
      input: MORPHO_API_URL,
      init: {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { address, chainId },
        }),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Morpho API HTTP error ${response.status} for vault ${address} on chain ${chainId}`
      );
    }

    const json = await response.json();

    if (json.errors?.length) {
      const msg = json.errors.map((e: any) => e.message).join("; ");
      throw new Error(
        `Morpho API GraphQL error for vault ${address} on chain ${chainId}: ${msg}`
      );
    }

    return json.data?.vaultByAddress ?? null;
  }

  /**
   * Fetch market by marketId and chain ID to verify it exists
   * Note: marketId is the same as uniqueKey, we use marketByUniqueKey query
   */
  async function fetchMarketById(
    marketId: string,
    chainId: number
  ): Promise<{ uniqueKey: string } | null> {
    const query = `
      query MarketByUniqueKey($uniqueKey: String!, $chainId: Int!) {
        marketByUniqueKey(uniqueKey: $uniqueKey, chainId: $chainId) {
          uniqueKey
        }
      }
    `;

    const response = await fetchWithRetry({
      input: MORPHO_API_URL,
      init: {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { uniqueKey: marketId, chainId },
        }),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Morpho API HTTP error ${response.status} for market ${marketId} on chain ${chainId}`
      );
    }

    const json = await response.json();

    if (json.errors?.length) {
      const msg = json.errors.map((e: any) => e.message).join("; ");
      throw new Error(
        `Morpho API GraphQL error for market ${marketId} on chain ${chainId}: ${msg}`
      );
    }

    return json.data?.marketByUniqueKey ?? null;
  }

  vaultWarnings.forEach((warning, index) => {
    test(`vault ${warning.vaultAddress} on chain ${warning.chainId} exists in Morpho API`, async () => {
      const vault = await fetchVaultByAddress(warning.vaultAddress, warning.chainId);

      expect(vault).not.toBeNull();
      expect(vault?.address?.toLowerCase()).toBe(warning.vaultAddress.toLowerCase());
    });
  });

  marketWarnings.forEach((warning, index) => {
    test(`market ${warning.marketId} on chain ${warning.chainId} exists in Morpho API`, async () => {
      const market = await fetchMarketById(warning.marketId, warning.chainId);

      expect(market).not.toBeNull();
      // The API returns uniqueKey, but we're querying by marketId (which should be the same)
      expect(market?.uniqueKey).toBe(warning.marketId);
    });
  });
});
