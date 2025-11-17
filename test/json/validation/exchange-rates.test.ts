// test/json/validation/exchange-rates.test.ts
import { describe, expect, test } from "@jest/globals";
import { loadJsonFile } from "../../utils/jsonValidators";
import { getAddress } from "viem";

interface ExchangeRateData {
  abi: string;
  decimals: number;
  function: string;
  args: Array<{
    type: string;
    value: string;
  }>;
}

interface ExchangeRate {
  assetAddress: string;
  contractAddress: string;
  data: string;
  assetChainId: number;
  contractChainId: number;
}

describe("exchange-rates.json validation", () => {
  // Load and filter exchange rates for only chain IDs 1, 8453, 10, 130, 137, 999, 747474, 42161
  const allExchangeRates = loadJsonFile(
    "exchange-rates.json"
  ) as ExchangeRate[];
  const exchangeRates = allExchangeRates.filter(
    (rate) =>
      (rate.assetChainId === 1 ||
        rate.assetChainId === 8453 ||
        rate.assetChainId === 10 ||
        rate.assetChainId === 130 ||
        rate.assetChainId === 137 ||
        rate.assetChainId === 999 ||
        rate.assetChainId === 747474 ||
        rate.assetChainId === 42161) &&
      (rate.contractChainId === 1 ||
        rate.contractChainId === 8453 ||
        rate.contractChainId === 10 ||
        rate.contractChainId === 130 ||
        rate.contractChainId === 137 ||
        rate.contractChainId === 999 ||
        rate.contractChainId === 747474 ||
        rate.contractChainId === 42161)
  );

  test("addresses are checksummed", () => {
    exchangeRates.forEach((rate, index) => {
      try {
        // Check assetAddress
        const checksummedAssetAddress = getAddress(rate.assetAddress);
        expect(rate.assetAddress).toBe(checksummedAssetAddress);

        // Check contractAddress
        const checksummedContractAddress = getAddress(rate.contractAddress);
        expect(rate.contractAddress).toBe(checksummedContractAddress);
      } catch (error) {
        throw new Error(
          `Invalid address format at index ${index}: asset: ${rate.assetAddress}, contract: ${rate.contractAddress}`
        );
      }
    });
  });

  test("chain IDs are valid (1, 8453, 10, 130, 137, 999, 747474, 42161 or 143)", () => {
    const validChainIds = [1, 8453, 10, 130, 137, 999, 747474, 42161, 143];
    const errors: string[] = [];

    exchangeRates.forEach((rate, index) => {
      if (!validChainIds.includes(rate.assetChainId)) {
        errors.push(
          `Invalid assetChainId at index ${index}: ${rate.assetChainId}`
        );
      }
      if (!validChainIds.includes(rate.contractChainId)) {
        errors.push(
          `Invalid contractChainId at index ${index}: ${rate.contractChainId}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found chain ID validation errors:\n${errors.join("\n")}`
      );
    }
  });

  test("data field has valid structure and values", () => {
    const errors: string[] = [];

    exchangeRates.forEach((rate, index) => {
      try {
        // Parse the data string
        const parsedData = JSON.parse(rate.data) as ExchangeRateData;

        // Check decimals
        if (
          typeof parsedData.decimals !== "number" ||
          parsedData.decimals < 0 ||
          parsedData.decimals > 18
        ) {
          errors.push(
            `Invalid decimals value at index ${index}: ${parsedData.decimals}`
          );
        }

        // Check args structure
        if (!Array.isArray(parsedData.args) || parsedData.args.length !== 1) {
          errors.push(`Invalid args structure at index ${index}`);
        } else {
          const arg = parsedData.args[0];
          if (arg.type !== "bigint") {
            errors.push(`Invalid arg type at index ${index}: ${arg.type}`);
          }

          // Verify value matches 1e{decimals}
          const expectedValue = `1${"0".repeat(parsedData.decimals)}`; // Constructs string like "1000000000000000000" for 18 decimals
          if (arg.value !== expectedValue) {
            errors.push(
              `Invalid value at index ${index}: expected ${expectedValue}, got ${arg.value}`
            );
          }
        }

        // Check ABI string
        if (
          parsedData.abi !==
          `function ${parsedData.function}(uint256) view returns (uint256)`
        ) {
          errors.push(
            `Invalid ABI string at index ${index} for function '${parsedData.abi}': '${parsedData.abi}'`
          );
        }
      } catch (error) {
        errors.push(`Failed to parse data field at index ${index}: ${error}`);
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} data validation errors:\n${errors.join("\n")}`
      );
    }
  });

  test("addresses are unique per chain ID combination", () => {
    const addressPairMap = new Map<string, Set<string>>();
    const duplicates: Array<{
      assetAddress: string;
      contractAddress: string;
      assetChainId: number;
      contractChainId: number;
    }> = [];

    exchangeRates.forEach((rate) => {
      const key = `${rate.assetChainId}-${rate.contractChainId}`;
      const addressPair = `${rate.assetAddress.toLowerCase()}-${rate.contractAddress.toLowerCase()}`;

      const existingPairs = addressPairMap.get(key) || new Set();

      if (existingPairs.has(addressPair)) {
        duplicates.push({
          assetAddress: rate.assetAddress,
          contractAddress: rate.contractAddress,
          assetChainId: rate.assetChainId,
          contractChainId: rate.contractChainId,
        });
      }

      existingPairs.add(addressPair);
      addressPairMap.set(key, existingPairs);
    });

    try {
      expect(duplicates).toHaveLength(0);
    } catch (error) {
      throw new Error(
        `Found duplicate address pair-chainId combinations: ${JSON.stringify(
          duplicates,
          null,
          2
        )}`
      );
    }
  });
});
