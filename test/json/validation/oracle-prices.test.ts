// test/json/validation/oracle-prices.test.ts
import { describe, expect, test } from "@jest/globals";
import { loadJsonFile } from "../../utils/jsonValidators";
import { getAddress } from "viem";

interface OraclePriceData {
  decimals: number;
  abi?: string;
  function?: string;
  args?: Array<{
    type: string;
    value: string;
  }>;
  first_block_number?: number;
}

interface OraclePrice {
  assetAddress: string;
  contractAddress: string;
  order: number;
  type: string;
  data: string;
  assetChainId: number;
  contractChainId: number;
}

describe("oracle-prices.json validation", () => {
  // Load and filter oracle prices for only chain IDs 1 and 8453
  const allOraclePrices = loadJsonFile("oracle-prices.json") as OraclePrice[];
  const oraclePrices = allOraclePrices.filter(
    (price) =>
      (price.assetChainId === 1 || price.assetChainId === 8453) &&
      (price.contractChainId === 1 || price.contractChainId === 8453)
  );

  test("addresses are checksummed", () => {
    oraclePrices.forEach((price, index) => {
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

  test("chain IDs are valid (1 or 8453)", () => {
    const validChainIds = [1, 8453];
    const errors: string[] = [];

    oraclePrices.forEach((price, index) => {
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

  test("data field contains valid decimals", () => {
    const errors: string[] = [];

    oraclePrices.forEach((price, index) => {
      try {
        const parsedData = JSON.parse(price.data) as OraclePriceData;

        if (typeof parsedData.decimals !== "number") {
          errors.push(
            `Missing or invalid decimals at index ${index} for asset ${price.assetAddress}`
          );
        }

        // Check decimals range (assuming same 0-18 range as tokens)
        if (parsedData.decimals < 0 || parsedData.decimals > 18) {
          errors.push(
            `Invalid decimals value at index ${index}: ${parsedData.decimals}. Should be between 0 and 18.`
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
    const assetGroups = new Map<string, Map<number, OraclePrice[]>>();

    oraclePrices.forEach((price) => {
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
      "chainlink_aggregator",
      "chainlink_without_logs",
      "exchange_rate",
      "tri_crypto",
      "chronicle",
      "api3",
      "pyth_network",
      "redstone_without_logs",
      "hardcoded",
      "pendle_asset_rate",
      "hash_note",
    ];
    const errors: string[] = [];

    oraclePrices.forEach((price, index) => {
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

  test("exchange_rate type has required fields", () => {
    const errors: string[] = [];

    oraclePrices.forEach((price, index) => {
      if (price.type === "exchange_rate") {
        try {
          const parsedData = JSON.parse(price.data) as OraclePriceData;

          if (!parsedData.abi) {
            errors.push(
              `Missing abi field for exchange_rate at index ${index} for asset ${price.assetAddress}`
            );
          }

          if (!parsedData.function) {
            errors.push(
              `Missing function field for exchange_rate at index ${index} for asset ${price.assetAddress}`
            );
          }

          // Only require args if function is convertToAssets
          if (parsedData.function === "convertToAssets") {
            if (!parsedData.args || !Array.isArray(parsedData.args)) {
              errors.push(
                `Missing or invalid args field for convertToAssets at index ${index} for asset ${price.assetAddress}`
              );
            }
          }
        } catch (error) {
          errors.push(
            `Failed to parse data field at index ${index} for asset ${price.assetAddress}: ${error}`
          );
        }
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} exchange_rate validation errors:\n${errors.join(
          "\n"
        )}`
      );
    }
  });
});
