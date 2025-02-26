// checksum-addresses.ts
import { getAddress } from "viem";
import fs from "fs";

interface OraclePrice {
  assetAddress: string;
  contractAddress: string;
  order: number;
  type: string;
  data: string;
  assetChainId: number;
  contractChainId: number;
}

// Read the file
const oraclePrices = JSON.parse(
  fs.readFileSync("../data/oracle-prices.json", "utf8")
) as OraclePrice[];

// Track non-checksummed addresses
const nonChecksummed: {
  type: string;
  original: string;
  checksummed: string;
}[] = [];

// Check each address
oraclePrices.forEach((price) => {
  try {
    const checksummedAsset = getAddress(price.assetAddress);
    if (checksummedAsset !== price.assetAddress) {
      nonChecksummed.push({
        type: "assetAddress",
        original: price.assetAddress,
        checksummed: checksummedAsset,
      });
    }

    const checksummedContract = getAddress(price.contractAddress);
    if (checksummedContract !== price.contractAddress) {
      nonChecksummed.push({
        type: "contractAddress",
        original: price.contractAddress,
        checksummed: checksummedContract,
      });
    }
  } catch (error) {
    console.error(`Invalid address format:`, {
      assetAddress: price.assetAddress,
      contractAddress: price.contractAddress,
    });
  }
});

// Print results in a clear format
if (nonChecksummed.length > 0) {
  console.log("\nAddresses that need to be checksummed:\n");
  nonChecksummed.forEach(({ type, original, checksummed }) => {
    console.log(`${type}:`);
    console.log(`  Original:   ${original}`);
    console.log(`  Checksummed: ${checksummed}\n`);
  });
  console.log(`Total addresses to fix: ${nonChecksummed.length}`);
} else {
  console.log("All addresses are properly checksummed!");
}
