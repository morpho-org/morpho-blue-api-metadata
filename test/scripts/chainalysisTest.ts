import fs from "fs";
import path from "path";
import "dotenv/config";

interface CuratorAddresses {
  [chainId: string]: string[];
}

interface Curator {
  image?: string;
  name: string;
  url?: string;
  verified: boolean;
  addresses: CuratorAddresses;
  ownerOnly?: boolean;
}

interface ChainalysisResponse {
  risk: string;
  riskReason: string | null;
  status: string;
}

// Helper function to add delay between API calls
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkAddressRisk(
  address: string,
  apiToken: string
): Promise<ChainalysisResponse> {
  console.log(`Checking address: ${address}`);
  const response = await fetch(
    `https://api.chainalysis.com/api/risk/v2/entities/${address}`,
    {
      headers: {
        Token: apiToken,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function main() {
  // Get API token from env or use default
  const CHAINALYSIS_API_TOKEN = process.env.CHAINALYSIS_API_TOKEN;
  if (!CHAINALYSIS_API_TOKEN) {
    console.error(
      "Error: CHAINALYSIS_API_TOKEN environment variable is required"
    );
    process.exit(1);
  }

  // Load curators whitelist
  const filePath = path.join(__dirname, "../data/curators-whitelist.json");
  const curators = JSON.parse(fs.readFileSync(filePath, "utf8")) as Curator[];

  console.log(`Loaded ${curators.length} curators from whitelist`);

  const riskyAddresses: {
    address: string;
    curator: string;
    chainId: string;
    risk: string;
    riskReason?: string;
  }[] = [];

  const errors: string[] = [];
  let totalAddressesChecked = 0;

  // Process each curator and their addresses
  for (const curator of curators) {
    console.log(`\nProcessing curator: ${curator.name}`);

    for (const [chainId, addresses] of Object.entries(curator.addresses)) {
      for (const address of addresses) {
        try {
          totalAddressesChecked++;

          // Check address risk
          const data = await checkAddressRisk(address, CHAINALYSIS_API_TOKEN);

          if (data.status !== "COMPLETE") {
            console.log(`⚠️ Incomplete check for address ${address}`);
            errors.push(
              `Chainalysis check incomplete for address ${address} (curator: ${curator.name}, chain: ${chainId})`
            );
            continue;
          }

          if (data.risk.toLowerCase() !== "low") {
            console.log(
              `🚨 Found risky address: ${address} - Risk: ${data.risk}`
            );
            riskyAddresses.push({
              address,
              curator: curator.name,
              chainId,
              risk: data.risk,
              riskReason: data.riskReason || undefined,
            });
          } else {
            console.log(`✅ Address ${address} has LOW risk`);
          }

          // Only wait if the address is risky
          if (data.risk.toLowerCase() !== "low") {
            console.log("Waiting 10 seconds before next API call...");
            await delay(1);
          }
        } catch (error) {
          const errorMessage = `Failed to check address ${address} (curator: ${
            curator.name
          }, chain: ${chainId}): ${
            error instanceof Error ? error.message : String(error)
          }`;
          console.error(`❌ ${errorMessage}`);
          errors.push(errorMessage);

          // Wait after an error
          console.log("Waiting 10 seconds before next API call...");
          await delay(1);
        }
      }
    }
  }

  // Print summary results
  console.log("\n==== SUMMARY RESULTS ====");
  console.log(`Total addresses checked: ${totalAddressesChecked}`);

  if (riskyAddresses.length > 0) {
    console.log(
      `\n🚨 Found ${riskyAddresses.length} addresses with risk level other than LOW:`
    );
    riskyAddresses.forEach(
      ({ address, curator, chainId, risk, riskReason }) => {
        console.log(`\nAddress: ${address}`);
        console.log(`Curator: ${curator}`);
        console.log(`Chain ID: ${chainId}`);
        console.log(`Risk Level: ${risk}`);
        if (riskReason) console.log(`Risk Reason: ${riskReason}`);
      }
    );
  } else {
    console.log("\n✅ All addresses have LOW risk level!");
  }

  if (errors.length > 0) {
    console.log(`\n⚠️ Encountered ${errors.length} errors during checks:`);
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
}

// Helper function to count total addresses to check
function countTotalAddresses(curators: Curator[]): number {
  return curators.reduce((total, curator) => {
    return total + Object.values(curator.addresses).flat().length;
  }, 0);
}

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
