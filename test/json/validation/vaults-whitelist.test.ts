// test/json/validation/vaults-whitelist.test.ts
import { describe, expect, test } from "@jest/globals";
import { loadJsonFile } from "../../utils/jsonValidators";
import { getAddress } from "viem"; // We'll use viem for checksum validation

interface Curator {
  name: string;
  image: string;
  url: string;
  verified: boolean;
}

interface Vault {
  address: string;
  chainId: number;
  image: string;
  description: string;
  forumLink: string;
  curators: Curator[];
}
describe("vaults-whitelist.json validation", () => {
  const vaults = loadJsonFile("vaults-whitelist.json") as Vault[];

  test("each vault address is checksummed", () => {
    vaults.forEach((vault, index) => {
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

    vaults.forEach((vault) => {
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

  test("each vault has required fields", () => {
    const errors: string[] = []; // Collect all errors instead of throwing immediately

    vaults.forEach((vault, index) => {
      const requiredVaultFields = {
        address: expect.any(String),
        chainId: expect.any(Number),
        image: expect.any(String),
        description: expect.any(String),
        forumLink: expect.any(String),
        curators: expect.any(Array),
      };

      // Check vault fields
      try {
        expect(vault).toEqual(expect.objectContaining(requiredVaultFields));
      } catch (error) {
        // Extract the specific missing fields from the error message
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push(
          `Vault at index ${index} is missing or has invalid required fields:\n${errorMessage}`
        );
      }

      // Check curator fields if curators array exists
      if (Array.isArray(vault.curators)) {
        const requiredCuratorFields = {
          name: expect.any(String),
          image: expect.any(String),
          url: expect.any(String),
          verified: expect.any(Boolean),
        };

        vault.curators.forEach((curator, curatorIndex) => {
          try {
            expect(curator).toEqual(
              expect.objectContaining(requiredCuratorFields)
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.push(
              `Curator at index ${curatorIndex} in vault ${index} (address: ${vault.address}) has invalid fields:\n${errorMessage}`
            );
          }
        });
      } else {
        errors.push(
          `Vault at index ${index} (address: ${vault.address}) has invalid curators array`
        );
      }
    });

    // If we collected any errors, fail the test with all error messages
    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} validation errors:\n\n${errors.join("\n\n")}`
      );
    }
  });
});
