import fs from "fs";
import path from "path";

interface FeedInput {
  compareOffchain: string;
  contractAddress: string;
  contractType: string;
  contractVersion: number;
  decimalPlaces: number | null;
  ens: string;
  formatDecimalPlaces: number | null;
  healthPrice: string;
  heartbeat: number;
  history: any;
  multiply: string;
  name: string;
  pair: string[];
  path: string;
  proxyAddress: string;
  threshold: number;
  valuePrefix: string;
  assetName: string;
  feedCategory: string;
  feedType: string;
  docs: {
    assetClass: string;
    assetSubClass?: string;
    baseAsset: string;
    baseAssetClic: string;
    blockchainName: string;
    clicProductName: string;
    deliveryChannelCode: string;
    marketHours: string;
    productSubType: string;
    productType: string;
    productTypeCode: string;
    quoteAsset: string;
    quoteAssetClic: string;
    underlyingAsset?: string;
    underlyingAssetClic?: string;
  };
  decimals: number;
}

interface FeedOutput {
  chainId: number;
  address: string;
  vendor: string;
  description: string;
  pair: string[];
  decimals: number;
}

async function fetchFeedsData(): Promise<FeedInput[]> {
  try {
    console.log("Fetching data from endpoint...");
    const response = await fetch(
      "https://reference-data-directory.vercel.app/feeds-matic-mainnet.json"
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Successfully fetched data with ${data.length} entries`);
    return data;
  } catch (error) {
    console.error(
      "Error fetching data:",
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
}

function transformData(inputData: FeedInput[]): FeedOutput[] {
  console.log("Transforming data...");

  return inputData.map((feed) => {
    // Extract pair from name (e.g., "SGD / USD" -> ["SGD", "USD"])
    const nameParts = feed.name.split("/").map((part) => part.trim());
    const pair = [nameParts[0], nameParts[1] || ""];

    return {
      chainId: 137, // Polygon/Matic mainnet
      address: feed.proxyAddress,
      vendor: "Chainlink",
      description: feed.name,
      pair: pair,
      decimals: feed.decimals,
    };
  });
}

async function main() {
  try {
    // Fetch data from the endpoint
    const feedsData = await fetchFeedsData();

    if (feedsData.length === 0) {
      console.log("No data to process. Exiting.");
      return;
    }

    // Transform the data to the desired format
    const transformedData = transformData(feedsData);

    // Save the transformed data to a JSON file
    const outputPath = path.join(process.cwd(), "chainlink-feeds-matic.json");
    fs.writeFileSync(
      outputPath,
      JSON.stringify(transformedData, null, 2),
      "utf8"
    );

    console.log(`Successfully processed ${transformedData.length} feeds`);
    console.log(`Output saved to: ${outputPath}`);
  } catch (error) {
    console.error(
      "Error in main process:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Execute the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
