// test/json/validation/price-feeds.test.ts
import { describe, expect, test } from "@jest/globals";
import { loadJsonFile } from "../../utils/jsonValidators";
import { getAddress } from "viem";

interface Token {
  address: string;
  chainId: number;
}

interface PriceFeed {
  chainId: number;
  address: string;
  vendor: string;
  description: string;
  pair: string[];
  tokenIn?: Token;
  tokenOut?: Token;
}

describe("price-feeds.json validation", () => {
  // Load and filter price feeds for only chain IDs 1 and 8453
  const allPriceFeeds = loadJsonFile("price-feeds.json") as PriceFeed[];
  const priceFeeds = allPriceFeeds.filter(
    (feed) =>
      feed.chainId === 1 ||
      feed.chainId === 8453 ||
      feed.chainId === 137 ||
      feed.chainId === 130
  );

  test("addresses are checksummed", () => {
    const errors: string[] = [];

    priceFeeds.forEach((feed, index) => {
      try {
        // Check main address
        const checksummedAddress = getAddress(feed.address);
        if (feed.address !== checksummedAddress) {
          errors.push(
            `Invalid address format at index ${index}: ${feed.address}, should be ${checksummedAddress}`
          );
        }

        // Check tokenIn if it exists
        if (feed.tokenIn) {
          const checksummedTokenIn = getAddress(feed.tokenIn.address);
          if (feed.tokenIn.address !== checksummedTokenIn) {
            errors.push(
              `Invalid tokenIn address at index ${index}: ${feed.tokenIn.address}, should be ${checksummedTokenIn}`
            );
          }
        }

        // Check tokenOut if it exists
        if (feed.tokenOut) {
          const checksummedTokenOut = getAddress(feed.tokenOut.address);
          if (feed.tokenOut.address !== checksummedTokenOut) {
            errors.push(
              `Invalid tokenOut address at index ${index}: ${feed.tokenOut.address}, should be ${checksummedTokenOut}`
            );
          }
        }
      } catch (error) {
        errors.push(`Invalid address format at index ${index}: ${error}`);
      }
    });

    if (errors.length > 0) {
      throw new Error(`Found address validation errors:\n${errors.join("\n")}`);
    }
  });

  test("chain IDs are valid (1 or 8453 or 137 or 130)", () => {
    const validChainIds = [1, 8453, 137, 130];
    const errors: string[] = [];

    priceFeeds.forEach((feed, index) => {
      // Check main chainId
      if (!validChainIds.includes(feed.chainId)) {
        errors.push(`Invalid chainId at index ${index}: ${feed.chainId}`);
      }

      // Check tokenIn chainId if it exists
      if (feed.tokenIn && !validChainIds.includes(feed.tokenIn.chainId)) {
        errors.push(
          `Invalid tokenIn chainId at index ${index}: ${feed.tokenIn.chainId}`
        );
      }

      // Check tokenOut chainId if it exists
      if (feed.tokenOut && !validChainIds.includes(feed.tokenOut.chainId)) {
        errors.push(
          `Invalid tokenOut chainId at index ${index}: ${feed.tokenOut.chainId}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found chain ID validation errors:\n${errors.join("\n")}`
      );
    }
  });

  test("string fields have correct types", () => {
    const errors: string[] = [];

    priceFeeds.forEach((feed, index) => {
      // Check vendor is string
      if (typeof feed.vendor !== "string" || feed.vendor.trim() === "") {
        errors.push(
          `Invalid vendor at index ${index}: ${feed.vendor} (address: ${feed.address})`
        );
      }

      // Check description is string
      if (
        typeof feed.description !== "string" ||
        feed.description.trim() === ""
      ) {
        errors.push(
          `Invalid description at index ${index}: ${feed.description} (address: ${feed.address})`
        );
      }

      // Check pair is array of strings only if it exists and is not null
      if (feed.pair !== null && feed.pair !== undefined) {
        if (!Array.isArray(feed.pair) || feed.pair.length === 0) {
          errors.push(
            `Invalid pair at index ${index}: ${JSON.stringify(
              feed.pair
            )} (address: ${feed.address}, vendor: ${feed.vendor})`
          );
        } else if (
          !feed.pair.every(
            (item) => typeof item === "string" && item.trim() !== ""
          )
        ) {
          errors.push(
            `Invalid pair elements at index ${index}: ${JSON.stringify(
              feed.pair
            )} (address: ${feed.address}, vendor: ${feed.vendor})`
          );
        }
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found string field validation errors:\n${errors.join("\n")}`
      );
    }
  });

  test("tokenIn and tokenOut have consistent chain IDs", () => {
    const errors: string[] = [];

    priceFeeds.forEach((feed, index) => {
      // If tokenIn exists, its chainId should match the main chainId
      if (feed.tokenIn && feed.tokenIn.chainId !== feed.chainId) {
        errors.push(
          `Inconsistent chainId for tokenIn at index ${index}: feed chainId is ${feed.chainId} but tokenIn chainId is ${feed.tokenIn.chainId}`
        );
      }

      // If tokenOut exists, its chainId should match the main chainId
      if (feed.tokenOut && feed.tokenOut.chainId !== feed.chainId) {
        errors.push(
          `Inconsistent chainId for tokenOut at index ${index}: feed chainId is ${feed.chainId} but tokenOut chainId is ${feed.tokenOut.chainId}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Found chain ID consistency errors:\n${errors.join("\n")}`
      );
    }
  });
});
