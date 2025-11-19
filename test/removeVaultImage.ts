import { readFileSync, writeFileSync } from "fs";

interface Curator {
  name: string;
  image: string;
  url: string;
  verified: boolean;
}

interface HistoryEntry {
  action: string;
  timestamp: number;
}

interface Vault {
  address: string;
  chainId: number;
  image?: string; // Making this optional since we'll remove it
  description: string;
  forumLink: string;
  curators: Curator[];
  history: HistoryEntry[];
}

function removeVaultImage() {
  // Read the vaults-listing.json file
  const rawData = readFileSync("../data/vaults-listing.json", "utf8");
  const vaults = JSON.parse(rawData) as Vault[];

  // Process each vault to remove the image property
  const processedVaults = vaults.map(({ image, ...vault }) => vault);

  // Write back to the file with proper formatting
  writeFileSync(
    "../data/vaults-whitelist-no-image.json",
    JSON.stringify(processedVaults, null, 2)
  );

  console.log(
    "Successfully removed vault images while preserving curator images! 🎉"
  );
}

removeVaultImage();
