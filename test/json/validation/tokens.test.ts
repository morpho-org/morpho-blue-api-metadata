// test/json/validation/tokens.test.ts
import { describe, expect, test } from "@jest/globals";
import { loadJsonFile } from "../../utils/jsonValidators";
import { getAddress } from "viem";

interface TokenMetadata {
  logoURI: string;
}

interface Token {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  metadata: TokenMetadata;
  isWhitelisted: boolean;
}

describe("tokens.json validation", () => {
  // Load and filter tokens for only chain IDs 1 and 8453
  const allTokens = loadJsonFile("tokens.json") as Token[];
  const tokens = allTokens.filter(
    (token) => token.chainId === 1 || token.chainId === 8453
  );

  test("each token address is checksummed", () => {
    tokens.forEach((token, index) => {
      try {
        const checksummedAddress = getAddress(token.address);
        expect(token.address).toBe(checksummedAddress);
      } catch (error) {
        throw new Error(
          `Invalid address format at index ${index}: ${token.address}`
        );
      }
    });
  });

  test("token addresses are unique per chain ID", () => {
    const addressChainMap = new Map<string, Set<number>>();
    const duplicates: Array<{ address: string; chainId: number }> = [];

    tokens.forEach((token) => {
      const existingChainIds =
        addressChainMap.get(token.address.toLowerCase()) || new Set();

      if (existingChainIds.has(token.chainId)) {
        duplicates.push({
          address: token.address,
          chainId: token.chainId,
        });
      }

      existingChainIds.add(token.chainId);
      addressChainMap.set(token.address.toLowerCase(), existingChainIds);
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

  test("each token has required fields with correct types", () => {
    const errors: string[] = [];

    tokens.forEach((token, index) => {
      // Check number types
      try {
        expect(typeof token.chainId).toBe("number");
        expect(typeof token.decimals).toBe("number");
      } catch (error) {
        errors.push(
          `Token at index ${index} (address: ${token.address}) has invalid number fields: ${error}`
        );
      }

      // Check string types
      try {
        expect(typeof token.address).toBe("string");
        expect(typeof token.name).toBe("string");
        expect(typeof token.symbol).toBe("string");
      } catch (error) {
        errors.push(
          `Token at index ${index} (address: ${token.address}) has invalid string fields: ${error}`
        );
      }

      // Check boolean type
      try {
        expect(typeof token.isWhitelisted).toBe("boolean");
      } catch (error) {
        errors.push(
          `Token at index ${index} (address: ${token.address}) has invalid boolean field: ${error}`
        );
      }

      // Check metadata structure
      try {
        if (token.metadata) {
          if (token.metadata.logoURI === undefined) {
            // console.warn(
            //   `Warning: Undefined logoURI for token ${token.address} on chain ${token.chainId}`
            // );
          } else {
            expect(typeof token.metadata.logoURI).toBe("string");
            // Temporary bypass: Allow empty string for logoURI
            if (token.metadata.logoURI === "") {
              // console.warn(
              //   `Warning: Empty logoURI for token ${token.address} on chain ${token.chainId}`
              // );
            }
          }
        } else {
          // console.warn(
          //   `Warning: Missing metadata for token ${token.address} on chain ${token.chainId}`
          // );
        }
      } catch (error) {
        errors.push(
          `Token at index ${index} (address: ${token.address}) has invalid metadata structure: ${error}`
        );
      }
    });

    // Additional validation for decimal values
    tokens.forEach((token, index) => {
      if (token.decimals < 0 || token.decimals > 18) {
        errors.push(
          `Token at index ${index} (address: ${token.address}) has invalid decimals value: ${token.decimals}. Should be between 0 and 18.`
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

  test("each logoURI has properly encoded special characters", () => {
    const errors: string[] = [];
    const CDN_PREFIX = "https://cdn.morpho.org/assets/logos/";

    tokens.forEach((token, index) => {
      if (token.metadata?.logoURI) {
        // Skip if not using Morpho CDN
        if (!token.metadata.logoURI.startsWith(CDN_PREFIX)) {
          return;
        }

        const symbol = token.metadata.logoURI.replace(CDN_PREFIX, "");
        const decodedSymbol = decodeURIComponent(symbol);
        const properlyEncodedUri = `${CDN_PREFIX}${encodeURIComponent(
          decodedSymbol
        )}`;

        try {
          expect(token.metadata.logoURI).toBe(properlyEncodedUri);
        } catch (error) {
          errors.push(
            `Token at index ${index} (address: ${token.address}, chainId: ${token.chainId}) has improperly encoded logoURI:
            Current:  ${token.metadata.logoURI}
            Expected: ${properlyEncodedUri}`
          );
        }
      }
    });

    // If we collected any errors, fail the test with all error messages
    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} logoURI encoding errors:\n\n${errors.join(
          "\n\n"
        )}`
      );
    }
  });
});
