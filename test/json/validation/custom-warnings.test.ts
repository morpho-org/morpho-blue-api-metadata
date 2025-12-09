import { describe, expect, test, beforeAll, jest } from "@jest/globals";
import { loadJsonFile, VALID_CHAIN_IDS, fetchWithRetry } from "../../utils/jsonValidators";
import { getAddress } from "viem";

interface MetadataPart {
  type: "text" | "link";
  content?: string;
  text?: string;
  href?: string;
  external?: boolean;
}

interface Metadata {
  content?: string;
  parts?: MetadataPart[];
}

interface CustomWarning {
  vaultAddress: string;
  chainId: number;
  level: string;
  metadata: Metadata;
}

const shouldSkipApiTests = process.env.SKIP_VAULTS_API_TESTS === "true";
const MORPHO_API_URL = "https://api.morpho.org/graphql";

describe("custom-warnings.json validation", () => {
  const warnings = loadJsonFile("custom-warnings.json") as CustomWarning[];

  test("each vault address is checksummed", () => {
    warnings.forEach((warning, index) => {
      try {
        const checksummedAddress = getAddress(warning.vaultAddress);
        expect(warning.vaultAddress).toBe(checksummedAddress);
      } catch (error) {
        throw new Error(
          `Invalid address format at index ${index}: ${warning.vaultAddress}`
        );
      }
    });
  });

  test("no duplicate vaultAddress + chainId combinations", () => {
    const seen = new Map<string, number>();
    const duplicates: Array<{ vaultAddress: string; chainId: number; indices: number[] }> = [];

    warnings.forEach((warning, index) => {
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

  test("chain IDs are valid", () => {
    const validChainIds: number[] = [...VALID_CHAIN_IDS];
    const errors: string[] = [];

    warnings.forEach((warning, index) => {
      if (!validChainIds.includes(warning.chainId)) {
        errors.push(
          `Warning at index ${index} has invalid chain ID: ${warning.chainId}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} invalid chain ID errors:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("each warning has required fields with correct types", () => {
    const errors: string[] = [];

    warnings.forEach((warning, index) => {
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
          `Warning at index ${index} is missing or has invalid required fields: ${missingFields.join(", ")}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} validation errors:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("metadata has valid structure (content XOR parts)", () => {
    const errors: string[] = [];

    warnings.forEach((warning, index) => {
      const hasContent = typeof warning.metadata.content === "string" && warning.metadata.content.length > 0;
      const hasParts = Array.isArray(warning.metadata.parts) && warning.metadata.parts.length > 0;

      if (!hasContent && !hasParts) {
        errors.push(
          `Warning at index ${index}: metadata must have either 'content' (non-empty string) OR 'parts' (non-empty array)`
        );
      } else if (hasContent && hasParts) {
        errors.push(
          `Warning at index ${index}: metadata cannot have both 'content' and 'parts', only one`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} metadata structure errors:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("metadata.content is non-empty when used", () => {
    const errors: string[] = [];

    warnings.forEach((warning, index) => {
      if (warning.metadata.content !== undefined) {
        if (typeof warning.metadata.content !== "string" || warning.metadata.content.trim().length === 0) {
          errors.push(
            `Warning at index ${index}: metadata.content must be a non-empty string`
          );
        }
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} content validation errors:\n\n${errors.join("\n\n")}`
      );
    }
  });

  test("metadata.parts have valid structure when used", () => {
    const errors: string[] = [];

    warnings.forEach((warning, index) => {
      if (Array.isArray(warning.metadata.parts)) {
        warning.metadata.parts.forEach((part, partIndex) => {
          const partErrors: string[] = [];

          // Check type field
          if (!part.type || (part.type !== "text" && part.type !== "link")) {
            partErrors.push(`part ${partIndex}: type must be "text" or "link"`);
          }

          // Validate text parts
          if (part.type === "text") {
            if (typeof part.content !== "string" || part.content.length === 0) {
              partErrors.push(`part ${partIndex}: text type must have non-empty 'content' field`);
            }
          }

          // Validate link parts
          if (part.type === "link") {
            if (typeof part.text !== "string" || part.text.length === 0) {
              partErrors.push(`part ${partIndex}: link type must have non-empty 'text' field`);
            }
            if (typeof part.href !== "string" || part.href.length === 0) {
              partErrors.push(`part ${partIndex}: link type must have non-empty 'href' field`);
            }
            if (typeof part.external !== "boolean") {
              partErrors.push(`part ${partIndex}: link type must have 'external' boolean field`);
            }
          }

          if (partErrors.length > 0) {
            errors.push(
              `Warning at index ${index}:\n  ${partErrors.join("\n  ")}`
            );
          }
        });
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} metadata.parts validation errors:\n\n${errors.join("\n\n")}`
      );
    }
  });
});

// Separate describe block for API tests (can be skipped)
describe("custom-warnings.json - vault existence in Morpho API", () => {
  if (shouldSkipApiTests) {
    test.skip("SKIPPED via SKIP_VAULTS_API_TESTS", () => {});
    return;
  }

  const warnings = loadJsonFile("custom-warnings.json") as CustomWarning[];

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

  warnings.forEach((warning, index) => {
    test(`vault ${warning.vaultAddress} on chain ${warning.chainId} exists in Morpho API`, async () => {
      const vault = await fetchVaultByAddress(warning.vaultAddress, warning.chainId);

      expect(vault).not.toBeNull();
      expect(vault?.address?.toLowerCase()).toBe(warning.vaultAddress.toLowerCase());
    });
  });
});
