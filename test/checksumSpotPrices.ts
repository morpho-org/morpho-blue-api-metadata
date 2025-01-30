// checksum-spot-prices.ts
import { getAddress } from "viem";
import fs from "fs";

interface SpotPrice {
  assetAddress: string;
  contractAddress: string;
  order: number;
  type: string;
  data: string;
  assetChainId: number;
  contractChainId: number;
}

function checksumAddress(address: string): string {
  try {
    return getAddress(address);
  } catch (error) {
    console.error(`Invalid address format: ${address}`);
    return address;
  }
}

// Read the file
const spotPrices = JSON.parse(
  fs.readFileSync("../data/spot-prices.json", "utf8")
) as SpotPrice[];

// Process each spot price entry
const processedSpotPrices = spotPrices.map((price) => {
  // Create a new object to avoid mutating the original
  return {
    ...price,
    assetAddress: checksumAddress(price.assetAddress),
    contractAddress: checksumAddress(price.contractAddress),
  };
});

// Write the new content to a file with proper formatting
const output = JSON.stringify(processedSpotPrices, null, 2);
fs.writeFileSync("spot-prices-checksummed.json", output);

// Count and log changes
let changesCount = 0;
spotPrices.forEach((price, index) => {
  const processed = processedSpotPrices[index];

  if (price.assetAddress !== processed.assetAddress) changesCount++;
  if (price.contractAddress !== processed.contractAddress) changesCount++;
});

console.log(`\nProcessing complete!`);
console.log(`Made ${changesCount} address corrections`);
console.log(`Updated file saved as: spot-prices-checksummed.json\n`);

// Log specific changes for verification
console.log("Changes made:");
spotPrices.forEach((price, index) => {
  const processed = processedSpotPrices[index];

  if (
    price.assetAddress !== processed.assetAddress ||
    price.contractAddress !== processed.contractAddress
  ) {
    console.log(`\nSpot price for assetChainId ${price.assetChainId}:`);

    if (price.assetAddress !== processed.assetAddress) {
      console.log(`  AssetAddress changed from: ${price.assetAddress}`);
      console.log(`                        to: ${processed.assetAddress}`);
    }

    if (price.contractAddress !== processed.contractAddress) {
      console.log(`  ContractAddress changed from: ${price.contractAddress}`);
      console.log(
        `                           to: ${processed.contractAddress}`
      );
    }
  }
});
