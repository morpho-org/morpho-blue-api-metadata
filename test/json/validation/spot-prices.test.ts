// test/json/validation/spot-prices.test.ts
import { describe, expect, test } from "@jest/globals";
import { loadJsonFile, VALID_CHAIN_IDS } from "../../utils/jsonValidators";
import { getAddress } from "viem";

interface SpotPriceData {
  in_token: number;
  first_block_number: number;
}

interface SpotPrice {
  assetAddress: string;
  contractAddress: string;
  order: number;
  type: string;
  data: string;
  assetChainId: number;
  contractChainId: number;
}

describe("spot-prices.json validation", () => {
  // Load and filter spot prices for only chain IDs 1, 8453, 10, 130, 137, 999, 747474 & 42161
  const allSpotPrices = loadJsonFile("spot-prices.json") as SpotPrice[];
  const spotPrices = allSpotPrices.filter(
    (price) =>
      (price.assetChainId === 1 || price.assetChainId === 8453 || price.assetChainId === 10 || price.assetChainId === 130 || price.assetChainId === 137 || price.assetChainId === 999 || price.assetChainId === 747474 || price.assetChainId === 42161) &&
      (price.contractChainId === 1 || price.contractChainId === 8453 || price.contractChainId === 10 || price.contractChainId === 130 || price.contractChainId === 137 || price.contractChainId === 999 || price.contractChainId === 747474 || price.contractChainId === 42161)
  );

  test("addresses are checksummed", () => {
    spotPrices.forEach((price, index) => {
      try {
        // Check assetAddress
        const checksummedAssetAddress = getAddress(price.assetAddress);
        expect(price.assetAddress).toBe(checksummedAssetAddress);

        // Check contractAddress
        const checksummedContractAddress = getAddress(price.contractAddress);
        expect(price.contractAddress).toBe(checksummedContractAddress);
      } catch (error) {
        throw new Error(
          `Invalid address format at index ${index}: asset: ${price.assetAddress}, contract: ${price.contractAddress}`
        );
      }
    });
  });

  test("chain IDs are valid", () => {
    const validChainIds: number[] = [...VALID_CHAIN_IDS];
    const errors: string[] = [];

    spotPrices.forEach((price, index) => {
      if (!validChainIds.includes(price.assetChainId)) {
        errors.push(
          `Invalid assetChainId at index ${index}: ${price.assetChainId}`
        );
      }
      if (!validChainIds.includes(price.contractChainId)) {
        errors.push(
          `Invalid contractChainId at index ${index}: ${price.contractChainId}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found chain ID validation errors:\n${errors.join("\n")}`
      );
    }
  });

  test("data field has valid structure", () => {
    const errors: string[] = [];

    spotPrices.forEach((price, index) => {
      try {
        const parsedData = JSON.parse(price.data) as SpotPriceData;

        // Check in_token is a number if it exists
        if (
          parsedData.in_token !== undefined &&
          typeof parsedData.in_token !== "number"
        ) {
          errors.push(
            `Invalid in_token at index ${index} for asset ${price.assetAddress}: must be a number`
          );
        }

        // Check first_block_number exists and is a number
        if (
          typeof parsedData.first_block_number !== "number" ||
          parsedData.first_block_number <= 0
        ) {
          errors.push(
            `Invalid first_block_number at index ${index} for asset ${price.assetAddress}`
          );
        }
      } catch (error) {
        errors.push(
          `Failed to parse data field at index ${index} for asset ${price.assetAddress}: ${error}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} data validation errors:\n${errors.join("\n")}`
      );
    }
  });

  test("pricing chains are valid", () => {
    // Group by asset address and chain ID
    const assetGroups = new Map<string, Map<number, SpotPrice[]>>();

    spotPrices.forEach((price) => {
      const assetKey = price.assetAddress.toLowerCase();
      if (!assetGroups.has(assetKey)) {
        assetGroups.set(assetKey, new Map());
      }

      const chainGroup = assetGroups.get(assetKey)!;
      if (!chainGroup.has(price.assetChainId)) {
        chainGroup.set(price.assetChainId, []);
      }

      chainGroup.get(price.assetChainId)!.push(price);
    });

    const errors: string[] = [];

    // Validate each asset group
    assetGroups.forEach((chainGroups, assetAddress) => {
      chainGroups.forEach((prices, chainId) => {
        // Sort by order
        const sortedPrices = prices.sort((a, b) => a.order - b.order);

        // Check if orders are sequential starting from 0
        sortedPrices.forEach((price, idx) => {
          if (price.order !== idx) {
            errors.push(
              `Invalid order sequence for asset ${price.assetAddress} on chain ${chainId}. ` +
                `Expected order ${idx} but got ${price.order}`
            );
          }
        });

        // Validate that orders are unique
        const orders = new Set(prices.map((p) => p.order));
        if (orders.size !== prices.length) {
          errors.push(
            `Duplicate orders found for asset ${assetAddress} on chain ${chainId}`
          );
        }
      });
    });

    if (errors.length > 0) {
      throw new Error(
        `Found pricing chain validation errors:\n${errors.join("\n")}`
      );
    }
  });

  test("type field is valid", () => {
    const validTypes = [
      "uniswap_v3_twap",
      "aerodrome",
      "aerodrome_slip_stream",
      "ethena_staked_usde_exchange_rate",
      "erc4626_exchange_rate",
      "curve_pool",
    ]; // Add other valid types as needed
    const errors: string[] = [];

    spotPrices.forEach((price, index) => {
      if (!validTypes.includes(price.type)) {
        errors.push(
          `Invalid type at index ${index}: ${
            price.type
          }. Expected one of: ${validTypes.join(", ")}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(`Found type validation errors:\n${errors.join("\n")}`);
    }
  });
});
