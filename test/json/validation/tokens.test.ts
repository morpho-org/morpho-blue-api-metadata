// test/json/validation/tokens.test.ts
import { describe, expect, test } from "@jest/globals";
import { loadJsonFile } from "../../utils/jsonValidators";
import { getAddress } from "viem";

interface TokenMetadata {
  logoURI: string;
  tags?: string[];
  alternativeOracle?: string;
  alternativeOracles?: any[];
  alternativeHardcodedOracle?: string;
  alternativeHardcodedOracles?: any[];
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

  // Helper function to check for unknown keys in an object
  const checkUnknownKeys = (
    obj: Record<string, any> | null | undefined,
    allowedKeys: Set<string>,
    identifier: string,
    objectName: string,
    errors: string[],
    ignoreKeys: Set<string> = new Set() // Optional set of keys to ignore
  ) => {
    if (!obj) return;

    Object.keys(obj).forEach((key) => {
      if (ignoreKeys.has(key)) return; // Skip ignored keys

      if (!allowedKeys.has(key)) {
        errors.push(`${identifier} has unknown key in ${objectName}: '${key}'`);
      }
    });
  };

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

      // Add validation for oracle arrays in metadata
      try {
        if (token.metadata?.alternativeOracles !== undefined) {
          expect(Array.isArray(token.metadata.alternativeOracles)).toBe(true);
        }

        if (token.metadata?.alternativeHardcodedOracles !== undefined) {
          expect(
            Array.isArray(token.metadata.alternativeHardcodedOracles)
          ).toBe(true);
        }

        // Check for incorrect singular forms and suggest the plural version
        if (token.metadata?.alternativeOracle !== undefined) {
          errors.push(
            `Token at index ${index} (address: ${token.address}) has incorrect 'metadata.alternativeOracle' field. Use 'alternativeOracles' (plural) instead.`
          );
        }

        if (token.metadata?.alternativeHardcodedOracle !== undefined) {
          errors.push(
            `Token at index ${index} (address: ${token.address}) has incorrect 'metadata.alternativeHardcodedOracle' field. Use 'alternativeHardcodedOracles' (plural) instead.`
          );
        }
      } catch (error) {
        errors.push(
          `Token at index ${index} (address: ${token.address}) has invalid oracle fields in metadata: ${error}`
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

  // Add this new test to explicitly check for singular/plural naming issues
  test("token fields use correct plural naming conventions", () => {
    const singularFields = ["alternativeOracle", "alternativeHardcodedOracle"];
    const correctPluralFields = [
      "alternativeOracles",
      "alternativeHardcodedOracles",
    ];
    const errors: string[] = [];

    tokens.forEach((token, index) => {
      // Check for incorrect singular forms in the token object
      for (const singularField of singularFields) {
        if (Object.prototype.hasOwnProperty.call(token, singularField)) {
          errors.push(
            `Token at index ${index} (address: ${token.address}, chainId: ${token.chainId}) uses incorrect singular field name "${singularField}". Use the plural form instead.`
          );
        }

        // Also check inside metadata object
        if (
          token.metadata &&
          Object.prototype.hasOwnProperty.call(token.metadata, singularField)
        ) {
          errors.push(
            `Token at index ${index} (address: ${token.address}, chainId: ${token.chainId}) has metadata with incorrect singular field name "${singularField}". Use the plural form instead.`
          );
        }
      }

      // Verify the correct plural fields when present
      for (const pluralField of correctPluralFields) {
        // Check in token object
        if (Object.prototype.hasOwnProperty.call(token, pluralField)) {
          if (!Array.isArray(token[pluralField as keyof Token])) {
            errors.push(
              `Token at index ${index} (address: ${token.address}, chainId: ${token.chainId}) has ${pluralField} that is not an array.`
            );
          }
        }

        // Also check inside metadata object
        if (
          token.metadata &&
          Object.prototype.hasOwnProperty.call(token.metadata, pluralField)
        ) {
          if (
            !Array.isArray(
              token.metadata[pluralField as keyof typeof token.metadata]
            )
          ) {
            errors.push(
              `Token at index ${index} (address: ${token.address}, chainId: ${token.chainId}) has metadata.${pluralField} that is not an array.`
            );
          }
        }
      }
    });

    // If we collected any errors, fail the test with all error messages
    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} naming convention errors:\n\n${errors.join(
          "\n\n"
        )}`
      );
    }
  });

  // Updated test to validate metadata structure AND tag values
  test("metadata structure is correct and tags are known values", () => {
    const errors: string[] = [];
    // Define the set of allowed tags - expand this list as needed
    const allowedTags = new Set([
      "EUR",
      "btc",
      "convex-wrapper",
      "dai-specific-permit",
      "erc4626",
      "eth",
      "eur-pegged",
      "governance-token",
      "hardcoded",
      "lrt",
      "lst",
      "permissioned",
      "rwa",
      "simple-permit",
      "stablecoin",
      "usd",
      "usd-pegged",
      "yield",
    ]);

    tokens.forEach((token, index) => {
      if (token.metadata) {
        // Check for nested 'metadata' object using hasOwnProperty to avoid TS errors
        if (
          Object.prototype.hasOwnProperty.call(token.metadata, "metadata") &&
          typeof (token.metadata as any).metadata === "object" && // Cast needed here after hasOwnProperty check
          (token.metadata as any).metadata !== null
        ) {
          errors.push(
            `Token at index ${index} (address: ${token.address}, chainId: ${token.chainId}) has incorrect nested 'metadata.metadata' structure. Properties like 'tags' should be directly under 'metadata'.`
          );
        }

        // Check if 'tags' exists and is an array
        if (
          Object.prototype.hasOwnProperty.call(token.metadata, "tags") &&
          !Array.isArray(token.metadata.tags) // TS knows 'tags' can be string[] | undefined now
        ) {
          errors.push(
            `Token at index ${index} (address: ${token.address}, chainId: ${token.chainId}) has 'metadata.tags' which is not an array.`
          );
        }

        // Check if all elements in 'tags' array are strings and known
        if (Array.isArray(token.metadata.tags)) {
          token.metadata.tags.forEach((tag: string, tagIndex: number) => {
            if (typeof tag !== "string") {
              errors.push(
                `Token at index ${index} (address: ${token.address}, chainId: ${token.chainId}) has a non-string tag at tags[${tagIndex}]: ${tag}`
              );
            } else {
              // Check if the tag is in the allowed list
              if (!allowedTags.has(tag)) {
                errors.push(
                  `Token at index ${index} (address: ${
                    token.address
                  }, chainId: ${
                    token.chainId
                  }) has unknown tag '${tag}' at tags[${tagIndex}]. Allowed tags are: [${Array.from(
                    allowedTags
                  ).join(", ")}]`
                );
              }
            }
          });
        }
      }
    });

    // If we collected any errors, fail the test with all error messages
    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} metadata structure/tag errors:\n\n${errors.join(
          "\n\n"
        )}`
      );
    }
  });

  // Test using the helper function
  test("no unknown keys are present in token objects", () => {
    const allowedTokenKeys = new Set([
      "chainId",
      "address",
      "name",
      "symbol",
      "decimals",
      "metadata",
      "isWhitelisted",
    ]);

    const allowedMetadataKeys = new Set([
      "logoURI",
      "tags",
      "alternativeOracle",
      "alternativeOracles",
      "alternativeHardcodedOracle",
      "alternativeHardcodedOracles",
    ]);

    const errors: string[] = [];
    const metadataIgnoreKeys = new Set(["metadata"]); // Temporarily ignore nested 'metadata'

    tokens.forEach((token, index) => {
      const identifier = `Token at index ${index} (address: ${token.address}, chainId: ${token.chainId})`;

      // Check token keys
      checkUnknownKeys(token, allowedTokenKeys, identifier, "token", errors);

      // Check metadata keys
      checkUnknownKeys(
        token.metadata,
        allowedMetadataKeys,
        identifier,
        "metadata",
        errors,
        metadataIgnoreKeys // Pass the set of keys to ignore in metadata
      );
    });

    // If we collected any errors, fail the test with all error messages
    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} unknown key errors:\n\n${errors.join("\n\n")}`
      );
    }
  });
});
