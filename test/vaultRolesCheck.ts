import fs from "fs";
import path from "path";
import "dotenv/config";
import { createPublicClient, http, Address, getAddress } from "viem";
import { mainnet, base } from "viem/chains";

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

interface VaultCurator {
  name: string;
  image?: string;
  url?: string;
  verified: boolean;
}

interface VaultData {
  address: string;
  chainId: number;
  image?: string;
  description?: string;
  forumLink?: string;
  curators: VaultCurator[];
  history: { action: string; timestamp: number }[];
}

interface ChainalysisResponse {
  risk: string;
  riskReason: string | null;
  status: string;
}

// Simplified ABI with only the functions we need
const vaultAbi = [
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "curator",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isAllocator",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Helper function to add delay between API calls
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Create clients for different chains
const clients = {
  1: createPublicClient({
    chain: mainnet,
    transport: http(),
  }),
  8453: createPublicClient({
    chain: base,
    transport: http(),
  }),
  130: createPublicClient({
    chain: unichain,
    transport: http(),
  }),
  137: createPublicClient({
    chain: polygon,
    transport: http(),
  }),
    747474: createPublicClient({
      chain: katana,
      transport: http(),
  }),
    42161: createPublicClient({
      chain: arbitrum,
      transport: http(),
    }),
    999: createPublicClient({
      chain: hyperevm,
      transport: http(),
    }),
};

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

async function getVaultRoles(
  vaultAddress: Address,
  chainId: number
): Promise<{ owner: Address; curator: Address; allocators: Address[] }> {
  try {
    const client = clients[chainId as keyof typeof clients];
    if (!client) {
      throw new Error(`No client available for chain ID ${chainId}`);
    }

    // Create contract instance
    const vault = {
      address: vaultAddress,
      abi: vaultAbi,
    };

    // Get owner and curator
    const owner = await client.readContract({
      ...vault,
      functionName: "owner",
    });

    const curator = await client.readContract({
      ...vault,
      functionName: "curator",
    });

    // We'll check a few common addresses to see if they're allocators
    // In a real implementation, you might want to check all addresses from the whitelist
    const potentialAllocators = [
      owner,
      curator,
      // Add other potential allocators here if known
    ];

    const allocators: Address[] = [];
    for (const address of potentialAllocators) {
      try {
        const isAllocator = await client.readContract({
          ...vault,
          functionName: "isAllocator",
          args: [address],
        });

        if (isAllocator) {
          allocators.push(address);
        }
      } catch (error) {
        console.error(`Error checking if ${address} is allocator:`, error);
      }
    }

    return { owner, curator, allocators };
  } catch (error) {
    console.error(
      `Error getting roles for vault ${vaultAddress} on chain ${chainId}:`,
      error
    );
    return {
      owner: "0x0000000000000000000000000000000000000000" as Address,
      curator: "0x0000000000000000000000000000000000000000" as Address,
      allocators: [],
    };
  }
}

async function main() {
  // Get API token from env
  const CHAINALYSIS_API_TOKEN = process.env.CHAINALYSIS_API_TOKEN;
  if (!CHAINALYSIS_API_TOKEN) {
    console.error(
      "Error: CHAINALYSIS_API_TOKEN environment variable is required"
    );
    process.exit(1);
  }

  // Load vaults whitelist
  const filePath = path.join(__dirname, "../data/vaults-whitelist.json");
  const vaults = JSON.parse(fs.readFileSync(filePath, "utf8")) as VaultData[];

  console.log(`Loaded ${vaults.length} vaults from whitelist`);

  // Set to store unique addresses
  const uniqueAddresses = new Set<string>();

  // Map to store address to role mapping for reporting
  const addressRoles = new Map<string, { roles: string[]; vaults: string[] }>();

  // Process each vault to collect addresses
  console.log("\nCollecting addresses from vaults...");
  for (const vault of vaults) {
    try {
      console.log(
        `\nProcessing vault: ${vault.address} (Chain ID: ${vault.chainId})`
      );

      // Add vault address itself
      const checksummedVaultAddress = getAddress(vault.address);
      uniqueAddresses.add(checksummedVaultAddress);

      // Get on-chain roles
      const { owner, curator, allocators } = await getVaultRoles(
        checksummedVaultAddress as Address,
        vault.chainId
      );

      // Add owner
      uniqueAddresses.add(owner);
      if (!addressRoles.has(owner)) {
        addressRoles.set(owner, { roles: [], vaults: [] });
      }
      if (!addressRoles.get(owner)?.roles.includes("owner")) {
        addressRoles.get(owner)?.roles.push("owner");
      }
      addressRoles.get(owner)?.vaults.push(checksummedVaultAddress);

      // Add curator
      uniqueAddresses.add(curator);
      if (!addressRoles.has(curator)) {
        addressRoles.set(curator, { roles: [], vaults: [] });
      }
      if (!addressRoles.get(curator)?.roles.includes("curator")) {
        addressRoles.get(curator)?.roles.push("curator");
      }
      addressRoles.get(curator)?.vaults.push(checksummedVaultAddress);

      // Add allocators
      for (const allocator of allocators) {
        uniqueAddresses.add(allocator);
        if (!addressRoles.has(allocator)) {
          addressRoles.set(allocator, { roles: [], vaults: [] });
        }
        if (!addressRoles.get(allocator)?.roles.includes("allocator")) {
          addressRoles.get(allocator)?.roles.push("allocator");
        }
        addressRoles.get(allocator)?.vaults.push(checksummedVaultAddress);
      }

      // Wait a bit between vaults to avoid rate limiting
      await delay(500);
    } catch (error) {
      console.error(`Error processing vault ${vault.address}:`, error);
    }
  }

  console.log(`\nCollected ${uniqueAddresses.size} unique addresses to check`);

  const riskyAddresses: {
    address: string;
    roles: string[];
    vaults: string[];
    risk: string;
    riskReason?: string;
  }[] = [];

  const errors: string[] = [];
  let totalAddressesChecked = 0;

  // Process each unique address
  for (const address of uniqueAddresses) {
    try {
      totalAddressesChecked++;

      // Check address risk
      const data = await checkAddressRisk(address, CHAINALYSIS_API_TOKEN);

      if (data.status !== "COMPLETE") {
        console.log(`⚠️ Incomplete check for address ${address}`);
        errors.push(`Chainalysis check incomplete for address ${address}`);
        continue;
      }

      const roles = addressRoles.get(address)?.roles || [];
      const vaults = addressRoles.get(address)?.vaults || [];

      if (data.risk.toLowerCase() !== "low") {
        console.log(
          `🚨 Found risky address: ${address} - Risk: ${
            data.risk
          } - Roles: ${roles.join(", ")}`
        );
        riskyAddresses.push({
          address,
          roles,
          vaults,
          risk: data.risk,
          riskReason: data.riskReason || undefined,
        });
      } else {
        console.log(
          `✅ Address ${address} has LOW risk - Roles: ${roles.join(", ")}`
        );
      }

      // Add delay between API calls to avoid rate limiting
      // Only wait if we're not on the last address
      if (totalAddressesChecked < uniqueAddresses.size) {
        console.log("Waiting 1 second before next API call...");
        await delay(1000);
      }
    } catch (error) {
      const errorMessage = `Failed to check address ${address}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.error(`❌ ${errorMessage}`);
      errors.push(errorMessage);

      // Wait after an error
      console.log("Waiting 1 second before next API call...");
      await delay(1000);
    }
  }

  // Print summary results
  console.log("\n==== SUMMARY RESULTS ====");
  console.log(`Total addresses checked: ${totalAddressesChecked}`);

  if (riskyAddresses.length > 0) {
    console.log(
      `\n🚨 Found ${riskyAddresses.length} addresses with risk level other than LOW:`
    );
    riskyAddresses.forEach(({ address, roles, vaults, risk, riskReason }) => {
      console.log(`\nAddress: ${address}`);
      console.log(`Roles: ${roles.join(", ")}`);
      console.log(`Associated with vaults: ${vaults.join(", ")}`);
      console.log(`Risk Level: ${risk}`);
      if (riskReason) console.log(`Risk Reason: ${riskReason}`);
    });
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

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
