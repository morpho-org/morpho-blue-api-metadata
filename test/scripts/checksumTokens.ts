import { getAddress } from "viem";
import { readFileSync } from "fs";

interface TokenMetadata {
  logoURI: string;
}

interface Token {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  metadata: TokenMetadata;
  isWhitelisted: boolean;
  isListed: boolean;
}

function checkAddresses() {
  // Read the tokens.json file
  const rawData = readFileSync("../data/tokens.json", "utf8");
  const tokens = JSON.parse(rawData) as Token[];
  let hasNonChecksummed = false;

  tokens.forEach((token) => {
    try {
      const checksummedAddress = getAddress(token.address);
      if (checksummedAddress !== token.address) {
        hasNonChecksummed = true;
        console.log(`
Token: ${token.symbol} (${token.name})
Chain ID: ${token.chainId}
Current:  ${token.address}
Checksum: ${checksummedAddress}
-------------------`);
      }
    } catch (error) {
      console.error(`Invalid address format: ${token.address}`);
    }
  });

  if (!hasNonChecksummed) {
    console.log("All addresses are properly checksummed! 🎉");
  }
}

checkAddresses();
