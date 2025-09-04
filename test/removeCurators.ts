import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Script to remove "curators" properties from all vault entries in vault-whitelist.json ONLY
 * This script specifically targets only the vault-whitelist.json file and preserves all other data
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
  curators?: Curator[]; // Making this optional since we'll remove it
  history: HistoryEntry[];
  [key: string]: any; // Allow other properties
}

function removeCuratorsFromFile(filePath: string): void {
  try {
    // Check if file exists
    if (!existsSync(filePath)) {
      console.log(`❌ File does not exist: ${filePath}`);
      return;
    }

    console.log(`🔍 Reading file: ${filePath}`);
    
    // Read the file
    const fileContent = readFileSync(filePath, "utf8");
    
    // Parse JSON
    const vaults: VaultEntry[] = JSON.parse(fileContent);
    
    if (!Array.isArray(vaults)) {
      console.log(`❌ File ${filePath} does not contain an array`);
      return;
    }

    console.log(`📊 Found ${vaults.length} vault entries`);

    // Track changes
    let removedCount = 0;
    let totalCuratorsRemoved = 0;
    
    // Remove curators from each vault
    const updatedVaults = vaults.map((vault, index) => {
      if (vault.hasOwnProperty("curators")) {
        const { curators, ...vaultWithoutCurators } = vault;
        const curatorCount = Array.isArray(curators) ? curators.length : 0;
        removedCount++;
        totalCuratorsRemoved += curatorCount;
        
        console.log(`🗑️  Vault ${index + 1} (${vault.address}): Removed ${curatorCount} curators`);
        return vaultWithoutCurators;
      } else {
        console.log(`ℹ️  Vault ${index + 1} (${vault.address}): No curators field found`);
        return vault;
      }
    });

    if (removedCount > 0) {
      console.log(`\n💾 Writing updated data back to file...`);
      
      // Write back to file with proper formatting (2-space indentation)
      const updatedContent = JSON.stringify(updatedVaults, null, 2);
      writeFileSync(filePath, updatedContent + "\n", "utf8");
      
      console.log(`✅ SUCCESS: Updated ${filePath}`);
      console.log(`📈 Summary: Removed curators from ${removedCount} vault entries`);
      console.log(`👥 Total curators removed: ${totalCuratorsRemoved}`);
    } else {
      console.log(`📋 No curators entries found in ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ ERROR processing ${filePath}:`, error);
    throw error; // Re-throw to stop execution on error
  }
}

function main(): void {
  const dataDir = "../data";
  
  // ONLY target vault-whitelist.json as requested
  const targetFile = "vaults-whitelist.json";
  const filePath = join(dataDir, targetFile);

  console.log("🚀 Starting curators removal process...");
  console.log(`🎯 Target file: ${targetFile} ONLY\n`);

  console.log(`Processing: ${targetFile}`);
  removeCuratorsFromFile(filePath);

  console.log("\n✨ Process completed!");
}

// Run the script
main();
