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
  image?: string;
  description: string;
  forumLink: string;
  curators?: Curator[]; // Making this optional since we'll remove it
  history: HistoryEntry[];
}

function removeVaultCurators() {
  // Read the vaults-whitelist.json file
  const rawData = readFileSync("../data/vaults-whitelist.json", "utf8");
  const vaults = JSON.parse(rawData) as Vault[];

  // Process each vault to remove the curators property
  const processedVaults = vaults.map(({ curators, ...vault }) => vault);

  // Write back to the file with proper formatting
  writeFileSync(
    "../data/vaults-whitelist-no-curators.json",
    JSON.stringify(processedVaults, null, 2)
  );

  console.log(
    "Successfully removed vault curators! 🎉"
  );
}

removeVaultCurators();
