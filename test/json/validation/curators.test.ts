import { describe, expect, test } from "@jest/globals";
import { loadJsonFile } from "../../utils/jsonValidators";
import { getAddress } from "viem";

interface CuratorAddresses {
  [chainId: string]: string[];
}

interface Curator {
  image: string;
  name: string;
  url: string;
  verified: boolean;
  addresses: CuratorAddresses;
  hidden?: boolean;
}

describe("curators-whitelist.json validation", () => {
  const curators = loadJsonFile("curators-whitelist.json") as Curator[];

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

  test("image URLs are valid", () => {
    const errors: string[] = [];
    const baseUrl = "https://cdn.morpho.org/v2/assets/images";

    curators.forEach((curator) => {
      if (curator.hidden) {
        if (curator.image !== "" || curator.url !== "") {
          errors.push(
            `Hidden curator ${curator.name} must have empty image and URL`
          );
        }
        return;
      }

      if (!curator.image || curator.image === "") {
        errors.push(`Empty image URL for curator: ${curator.name}`);
      } else if (!curator.image.startsWith(baseUrl)) {
        errors.push(
          `Invalid image URL for curator ${curator.name}: ${curator.image}. Must start with ${baseUrl}`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(`Found image URL errors:\n${errors.join("\n")}`);
    }
  });

  test("URLs are valid", () => {
    const errors: string[] = [];

    curators.forEach((curator) => {
      if (curator.hidden) {
        if (curator.url !== "") {
          errors.push(`Hidden curator ${curator.name} must have empty URL`);
        }
        return;
      }

      if (!curator.url || curator.url === "") {
        errors.push(`Empty URL for curator: ${curator.name}`);
      }
    });

    if (errors.length > 0) {
      throw new Error(`Found URL errors:\n${errors.join("\n")}`);
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

  test("chain IDs are valid (1 or 8453)", () => {
    const validChainIds = ["1", "8453"];
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
});
