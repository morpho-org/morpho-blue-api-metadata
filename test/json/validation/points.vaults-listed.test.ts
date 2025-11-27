import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

type Point = {
  title?: string;
  label?: string;
  value?: string;
  link?: string;
  noHoverCard?: boolean;
};

type AddressPointsMapping = Record<string, Point[]>;
type ChainIdAddressPointsMapping = Record<string, AddressPointsMapping>;

type PointsMapping = {
  vaultsWithPoints: ChainIdAddressPointsMapping;
  vaultsWithPointsOnMarket: ChainIdAddressPointsMapping;
  vaultsWithPointsOnMarketCollateralToken: ChainIdAddressPointsMapping;
  marketsWithPoints: ChainIdAddressPointsMapping;
  marketsWithPointsOnCollateralToken: ChainIdAddressPointsMapping;
};

type ListedVault = {
  address: string;
  chainId: number;
  // other fields exist but we don't need them here
};

const root = path.join(__dirname, "..");

// --- Load JSON files ---

const points: PointsMapping = JSON.parse(
  fs.readFileSync(path.join(root, "data", "points.json"), "utf-8"),
);

const vaultsV1: ListedVault[] = JSON.parse(
  fs.readFileSync(path.join(root, "data", "vaults-listing.json"), "utf-8"),
);

const vaultsV2: ListedVault[] = JSON.parse(
  fs.readFileSync(path.join(root, "data", "vaults-v2-listing.json"), "utf-8"),
);

// --- Build a lookup set of all listed vaults (V1 + V2) ---

const listedVaultKeys = new Set<string>();

for (const vault of [...vaultsV1, ...vaultsV2]) {
  listedVaultKeys.add(`${vault.chainId}:${vault.address}`);
}

describe("points.json – vaultsWithPoints only references listed vaults", () => {
  for (const [chainIdStr, vaultMap] of Object.entries(points.vaultsWithPoints)) {
    const chainId = Number(chainIdStr);

    for (const vaultAddress of Object.keys(vaultMap)) {
      it(`vault ${vaultAddress} on chain ${chainId} is present in vaults-listing or vaults-v2-listing`, () => {
        const key = `${chainId}:${vaultAddress}`;
        expect(
          listedVaultKeys.has(key),
          `Vault ${vaultAddress} on chainId=${chainId} is not in vaults-listing.json or vaults-v2-listing.json`,
        ).toBe(true);
      });
    }
  }
});
