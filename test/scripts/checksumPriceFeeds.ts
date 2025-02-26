// checksum-price-feeds.ts
import { getAddress } from "viem";
import fs from "fs";

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

function checksumAddress(address: string): string {
  try {
    // Skip special addresses like 0xEeeee...
    if (
      address.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    ) {
      return address;
    }
    return getAddress(address);
  } catch (error) {
    console.error(`Invalid address format: ${address}`);
    return address;
  }
}

// Read the file
const priceFeeds = JSON.parse(
  fs.readFileSync("../data/price-feeds.json", "utf8")
) as PriceFeed[];

// Process each price feed
const processedFeeds = priceFeeds.map((feed) => {
  // Create a new object to avoid mutating the original
  const newFeed = { ...feed };

  // Checksum main address
  newFeed.address = checksumAddress(feed.address);

  // Process tokenIn if it exists
  if (feed.tokenIn) {
    newFeed.tokenIn = {
      ...feed.tokenIn,
      address: checksumAddress(feed.tokenIn.address),
    };
  }

  // Process tokenOut if it exists
  if (feed.tokenOut) {
    newFeed.tokenOut = {
      ...feed.tokenOut,
      address: checksumAddress(feed.tokenOut.address),
    };
  }

  return newFeed;
});

// Write the new content to a file with proper formatting
const output = JSON.stringify(processedFeeds, null, 2);
fs.writeFileSync("price-feeds-checksummed.json", output);

// Count changes made
let changesCount = 0;
priceFeeds.forEach((feed, index) => {
  const processed = processedFeeds[index];

  if (feed.address !== processed.address) changesCount++;
  if (feed.tokenIn && feed.tokenIn.address !== processed.tokenIn?.address)
    changesCount++;
  if (feed.tokenOut && feed.tokenOut.address !== processed.tokenOut?.address)
    changesCount++;
});

console.log(`\nProcessing complete!`);
console.log(`Made ${changesCount} address corrections`);
console.log(`Updated file saved as: price-feeds-checksummed.json\n`);

// Optional: Log specific changes for verification
console.log("Changes made:");
priceFeeds.forEach((feed, index) => {
  const processed = processedFeeds[index];

  if (feed.address !== processed.address) {
    console.log(`\nFeed for ${feed.description}:`);
    console.log(`  Address changed from: ${feed.address}`);
    console.log(`                   to: ${processed.address}`);
  }

  if (feed.tokenIn && feed.tokenIn.address !== processed.tokenIn?.address) {
    console.log(`  TokenIn changed from: ${feed.tokenIn.address}`);
    console.log(`                   to: ${processed.tokenIn?.address}`);
  }

  if (feed.tokenOut && feed.tokenOut.address !== processed.tokenOut?.address) {
    console.log(`  TokenOut changed from: ${feed.tokenOut.address}`);
    console.log(`                    to: ${processed.tokenOut?.address}`);
  }
});
