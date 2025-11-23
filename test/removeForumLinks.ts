import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Script to remove "forumLink" properties from all vault entries in vault listing files
 */

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

interface VaultEntry {
  address: string;
  chainId: number;
  image?: string;
  description: string;
  forumLink?: string; // Making this optional since we'll remove it
  curators: Curator[];
  history: HistoryEntry[];
  [key: string]: any; // Allow other properties
}

function removeForumLinksFromFile(filePath: string): void {
  try {
    // Check if file exists
    if (!existsSync(filePath)) {
      console.log(`File does not exist: ${filePath}`);
      return;
    }

    // Read the file
    const fileContent = readFileSync(filePath, "utf8");
    
    // Parse JSON
    const vaults: VaultEntry[] = JSON.parse(fileContent);
    
    if (!Array.isArray(vaults)) {
      console.log(`File ${filePath} does not contain an array`);
      return;
    }

    // Track changes
    let removedCount = 0;
    
    // Remove forumLink from each vault
    const updatedVaults = vaults.map(vault => {
      if (vault.hasOwnProperty("forumLink")) {
        const { forumLink, ...vaultWithoutForumLink } = vault;
        removedCount++;
        console.log(`Removed forumLink from vault ${vault.address}: ${forumLink}`);
        return vaultWithoutForumLink;
      }
      return vault;
    });

    if (removedCount > 0) {
      // Write back to file with proper formatting (2-space indentation)
      const updatedContent = JSON.stringify(updatedVaults, null, 2);
      writeFileSync(filePath, updatedContent + "\n", "utf8");
      console.log(`✅ Updated ${filePath}: Removed ${removedCount} forumLink entries`);
    } else {
      console.log(`📋 No forumLink entries found in ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
}

function main(): void {
  const dataDir = "../data";
  
  // List of vault files to process
  const vaultFiles = [
    "vaults-listing.json",
    "vaults-v2-listing.json"
  ];

  console.log("🚀 Starting forumLink removal process...\n");

  for (const fileName of vaultFiles) {
    const filePath = join(dataDir, fileName);
    console.log(`Processing: ${fileName}`);
    removeForumLinksFromFile(filePath);
    console.log(""); // Empty line for readability
  }

  console.log("✨ Process completed!");
}

// Run the script
main();
