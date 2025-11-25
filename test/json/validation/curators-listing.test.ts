import { describe, test } from "@jest/globals";
import { getAddress } from "viem";
import { fetchWithRetry, loadJsonFile, VALID_CHAIN_IDS_STRING } from "../../utils/jsonValidators";
import "dotenv/config";

interface CuratorAddresses {
  [chainId: string]: string[];
}

const SOCIALS_TYPES = ["url", "twitter", "forum"];

interface Curator {
  image?: string;
  name: string;
  id: string;
  verified: boolean;
  addresses: CuratorAddresses;
  ownerOnly?: boolean;
  socials?: Record<string, string>;
}

interface ChainalysisResponse {
  risk: string;
  riskReason: string | null;
  status: string;
}

describe("curators-listing.json validation", () => {
  const curators = loadJsonFile("curators-listing.json") as Curator[];

  test("curator names are unique", () => {
    const names = new Set<string>();
    const duplicates: string[] = [];

    curators.forEach((curator) => {
      if (names.has(curator.name)) {
        duplicates.push(curator.name);
      }
      names.add(curator.name);
    });

    if (duplicates.length > 0) {
      throw new Error(
        `Found duplicate curator names: ${duplicates.join(", ")}`
      );
    }
  });

  test("curator ids are valid and unique", () => {
    const ids = new Set<string>();
    const duplicates: string[] = [];
    const invalids: string[] = [];

    curators.forEach((curator) => {
      if (ids.has(curator.id)) duplicates.push(curator.id);
      if (!/^[a-z0-9-]+$/.test(curator.id)) invalids.push(curator.id);
      ids.add(curator.id);
    });

    if (duplicates.length > 0)
      throw new Error(`Found duplicate curator ids: ${duplicates.join(", ")}`);
    if (invalids.length > 0)
      throw new Error(`Found invalid curator ids: ${invalids.join(", ")}`);
  });

  test("image URLs are valid", () => {
    const errors: string[] = [];
    const baseUrl = "https://cdn.morpho.org/v2/assets/images";

    curators.forEach((curator) => {
      if (!curator.ownerOnly && !curator.image) {
        errors.push(`Empty image URL for curator: ${curator.name}`);
      } else if (curator.image && !curator.image.startsWith(baseUrl)) {
        errors.push(
          `Invalid image URL for curator ${curator.name}: ${curator.image}. Must start with ${baseUrl}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(`Found image URL errors:\n${errors.join("\n")}`);
    }
  });

  test("socials are valid", () => {
    const errors: string[] = [];

    curators.forEach((curator) => {
      if (!curator.ownerOnly && !curator.socials?.url) {
        errors.push(`Missing url for curator: ${curator.name}`);
      }

      const invalidSocials = Object.keys(curator.socials ?? {}).filter(
        (k) => !SOCIALS_TYPES.includes(k)
      );

      errors.push(
        ...invalidSocials.map(
          (key) =>
            `Invalid socials entry (${key}) found for curator ${curator.id}`
        )
      );
    });

    if (errors.length > 0) {
      throw new Error(`Found socials errors:\n${errors.join("\n")}`);
    }
  });

  test("verified field is true", () => {
    const errors: string[] = [];

    curators.forEach((curator) => {
      if (curator.verified !== true) {
        errors.push(`Curator ${curator.name} must have verified: true`);
      }
    });

    if (errors.length > 0) {
      throw new Error(`Found verification errors:\n${errors.join("\n")}`);
    }
  });

  test("chain IDs are valid", () => {
    const validChainIds = VALID_CHAIN_IDS_STRING;
    const errors: string[] = [];

    curators.forEach((curator) => {
      Object.keys(curator.addresses).forEach((chainId) => {
        if (!validChainIds.includes(chainId)) {
          errors.push(
            `Invalid chain ID ${chainId} for curator ${curator.name}`
          );
        }
      });
    });

    if (errors.length > 0) {
      throw new Error(
        `Found chain ID validation errors:\n${errors.join("\n")}`
      );
    }
  });

  test("addresses are checksummed", () => {
    const errors: string[] = [];

    curators.forEach((curator) => {
      Object.entries(curator.addresses).forEach(([chainId, addresses]) => {
        addresses.forEach((address) => {
          try {
            const checksummedAddress = getAddress(address);
            if (address !== checksummedAddress) {
              errors.push(
                `Invalid checksum for address ${address} (curator: ${curator.name}, chain: ${chainId}). Should be ${checksummedAddress}`
              );
            }
          } catch (error) {
            errors.push(
              `Invalid address format: ${address} (curator: ${curator.name}, chain: ${chainId})`
            );
          }
        });
      });
    });

    if (errors.length > 0) {
      throw new Error(`Found address validation errors:\n${errors.join("\n")}`);
    }
  });

  test("addresses have low risk according to Chainalysis", async () => {
    // Increase timeout to 120 seconds since we're making multiple API calls with rate limiting
    jest.setTimeout(120000);

    const CHAINALYSIS_API_TOKEN = process.env.CHAINALYSIS_API_TOKEN;
    if (!CHAINALYSIS_API_TOKEN) {
      console.warn("Skipping external risk check - missing configuration");
      return;
    }

    const riskyAddresses: {
      address: string;
      curator: string;
      chainId: string;
      risk: string;
      riskReason?: string;
    }[] = [];

    const errors: string[] = [];
    let totalAddressesChecked = 0;

    // Flatten all addresses into a single array for batch processing
    const allAddressChecks: {
      address: string;
      curatorName: string;
      chainId: string;
    }[] = [];

    curators.forEach((curator) => {
      Object.entries(curator.addresses).forEach(([chainId, addresses]) => {
        (addresses as string[]).forEach((address) => {
          allAddressChecks.push({
            address,
            curatorName: curator.name,
            chainId,
          });
        });
      });
    });

    // Process in batches of 20 to avoid rate limiting
    const BATCH_SIZE = 20;
    const BATCH_DELAY_MS = 1000; // 1 second between batches

    for (let i = 0; i < allAddressChecks.length; i += BATCH_SIZE) {
      const batch = allAddressChecks.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async ({ address, curatorName, chainId }) => {
          try {
            totalAddressesChecked++;

            // Throws error on failure
            const response = await fetchWithRetry(
              {
                input: `https://api.chainalysis.com/api/risk/v2/entities/${address}`,
                init: {
                  headers: {
                    Token: CHAINALYSIS_API_TOKEN,
                    "Content-Type": "application/json",
                  },
                },
              }
            );

            const data = (await response.json()) as ChainalysisResponse;

            if (data.status !== "COMPLETE") {
              errors.push(
                `Risk check incomplete for address ${address} (curator: ${curatorName}, chain: ${chainId})`
              );
              return;
            }

            if (data.risk.toLowerCase() !== "low") {
              riskyAddresses.push({
                address,
                curator: curatorName,
                chainId,
                risk: data.risk,
                riskReason: data.riskReason || undefined,
              });
            }
          } catch (error) {
            errors.push(
              `Failed to check address ${address} (curator: ${curatorName}, chain: ${chainId})`
            );
          }
        })
      );

      // Add delay between batches to respect rate limits (except for last batch)
      if (i + BATCH_SIZE < allAddressChecks.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
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
      throw new Error(
        `Found ${riskyAddresses.length} addresses with risk level other than LOW`
      );
    } else {
      console.log("\n✅ All addresses have LOW risk level!");
    }

    if (errors.length > 0) {
      console.log(`\n⚠️ Encountered ${errors.length} errors during checks:`);
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
      throw new Error(
        `Encountered ${errors.length} errors during Chainalysis checks`
      );
    }
  }, 120000); // Increased timeout for batched API calls
});
