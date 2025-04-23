import fs from "fs";
import path from "path";
import "dotenv/config";
import {
  createPublicClient,
  http,
  Address,
  getAddress,
  PublicClient,
} from "viem";
import * as chains from "viem/chains";

// --- Interfaces ---

interface TokenInfo {
  address: string;
  chainId: number;
}

interface PriceFeed {
  chainId: number;
  address: string;
  vendor: string;
  description: string;
  pair: [string, string];
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  decimals: number; // This is the field we'll check and potentially update
}

// --- Minimal ABI for decimals() ---

const feedAbi = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// --- Helper: Get Viem Chain by ID ---
// Necessary because viem/chains exports them by name, not ID easily searchable
function getChainById(chainId: number): chains.Chain | undefined {
  for (const chainName in chains) {
    const chain = (chains as any)[chainName] as chains.Chain;
    if (
      chain &&
      typeof chain === "object" &&
      "id" in chain &&
      chain.id === chainId
    ) {
      return chain;
    }
  }
  return undefined;
}

// --- Helper: Delay ---
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Main Function ---

async function checkFeedDecimals() {
  console.log("Starting price feed decimal check...");

  // Load price feeds data
  const filePath = path.join(__dirname, "../../data/price-feeds.json");
  let priceFeeds: PriceFeed[] = [];
  try {
    priceFeeds = JSON.parse(fs.readFileSync(filePath, "utf8"));
    console.log(`Loaded ${priceFeeds.length} price feeds from ${filePath}`);
  } catch (error) {
    console.error(`Error reading price feed file ${filePath}:`, error);
    process.exit(1);
  }

  // Initialize Viem clients dynamically based on chainIds in the feeds
  const clients: Record<number, PublicClient> = {};
  const uniqueChainIds = [...new Set(priceFeeds.map((feed) => feed.chainId))];

  console.log(`Found unique chain IDs: ${uniqueChainIds.join(", ")}`);

  for (const chainId of uniqueChainIds) {
    const chain = getChainById(chainId);
    if (chain) {
      try {
        clients[chainId] = createPublicClient({
          chain: chain,
          transport: http(), // Assumes default RPC for each chain, add specific URLs if needed
        });
        console.log(
          `Created Viem client for chain ID ${chainId} (${chain.name})`
        );
      } catch (error) {
        console.warn(`Could not create client for chain ID ${chainId}:`, error);
      }
    } else {
      console.warn(
        `Chain ID ${chainId} not found in viem/chains. Skipping feeds on this chain.`
      );
    }
  }

  let incorrectFeedsCount = 0;
  const updatedFeedsData = [...priceFeeds]; // Create a mutable copy

  // Process each feed
  console.log("\nChecking feed decimals on-chain...");
  for (let i = 0; i < updatedFeedsData.length; i++) {
    const feed = updatedFeedsData[i];
    const client = clients[feed.chainId];

    if (!client) {
      console.warn(
        `Skipping feed ${feed.address} on chain ${feed.chainId} - no client available.`
      );
      continue;
    }

    console.log(
      `\nChecking: ${feed.description} (${feed.address}) on chain ${feed.chainId}`
    );
    try {
      const onChainDecimals = await client.readContract({
        address: getAddress(feed.address), // Ensure address is checksummed
        abi: feedAbi,
        functionName: "decimals",
      });

      console.log(`  On-chain decimals: ${onChainDecimals}`);
      console.log(`  Config file decimals: ${feed.decimals}`);

      if (Number(onChainDecimals) !== feed.decimals) {
        console.warn(
          `  🚨 MISMATCH FOUND! Updating config file decimals from ${feed.decimals} to ${onChainDecimals}`
        );
        updatedFeedsData[i].decimals = Number(onChainDecimals); // Update the copy
        incorrectFeedsCount++;
      } else {
        console.log("  ✅ Decimals match.");
      }
    } catch (error) {
      console.error(
        `  ❌ Error fetching decimals for ${feed.address} on chain ${feed.chainId}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Decide if you want to stop or continue on error. Continuing for now.
    }

    // Optional delay to avoid rate limiting
    if (i < updatedFeedsData.length - 1) {
      await delay(100); // Small delay between checks
    }
  }

  // Write back updated data if changes were made
  console.log("\n==== CHECK COMPLETE ====");
  if (incorrectFeedsCount > 0) {
    console.log(
      `Found ${incorrectFeedsCount} feeds with incorrect decimals. Updating ${filePath}...`
    );
    try {
      fs.writeFileSync(
        filePath,
        JSON.stringify(updatedFeedsData, null, 2) + "\n" // Add trailing newline
      );
      console.log("✅ Successfully updated price-feeds.json");
    } catch (error) {
      console.error("❌ Error writing updated price-feeds.json:", error);
    }
  } else {
    console.log(
      "✅ All feed decimals in the configuration file match the on-chain values."
    );
  }
}

// Run the main function
checkFeedDecimals().catch((error) => {
  console.error("\nFatal error during script execution:", error);
  process.exit(1);
});
