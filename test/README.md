# Specifications about Tests

1. [Morpho Vault listing](#1-morpho-vault-listing)
2. [Markets blacklisting](#2-market-blacklisting)
3. [Price feed listing](#3-price-feed-listing)
4. [Price mappings](#4-price-mappings)
5. [Tokens listing](#5-tokens-listing)
6. [Exchange rate](#6-exchange-rate)
7. [Custom warnings](#7-custom-warnings)

## 1. Morpho Vault listing

[vault-list](./json/validation/vaults-list.test.ts)

### Test Specifications:

1. **Address Checksum Validation**

   - Ensures each vault address follows the EIP-55 checksum format
   - Uses viem's `getAddress` for validation
   - Fails if any address is not properly checksummed

2. **Unique Address per Chain**

   - Verifies that vault addresses are unique per chain ID
   - Prevents duplicate vault listings on the same chain
   - Reports detailed error with all duplicate address-chainId combinations

3. **Required Fields Validation**
   - Validates presence and type of required vault fields:
     - address (string)
     - chainId (number)
     - image (string)
     - description (string)
     - forumLink (string)
     - curators (array)
   - Validates curator entries with required fields:
     - name (string)
     - image (string)
     - url (string)
     - verified (boolean)
   - Collects and reports all validation errors in a single test run

## 2. Markets blacklisting

No test for this one

## 3. Price feed listing

[price-feeds](./json/validation/price-feeds.test.ts)

### Test Specifications:

1. **Address Checksum Validation**

   - Validates EIP-55 checksum format for:
     - Main price feed address
     - TokenIn address (if present)
     - TokenOut address (if present)
   - Uses viem's `getAddress` for validation
   - Reports detailed errors for each invalid address

2. **Chain ID Validation**

   - Ensures all chain IDs are either 1 (Ethereum), 8453 (Base), 10 (OP Mainnet), 130 (Unichain), 137 (PolygonPOS), 999 (HyperEVM), 747474 (Katana), Arbitrum (42161), Monad (143) and Stable (988).
   - Validates chain IDs for:
     - Main price feed
     - TokenIn configuration
     - TokenOut configuration
   - Collects and reports all invalid chain ID occurrences

3. **String Fields Type Validation**

   - Validates presence and non-empty status of required string fields:
     - vendor
     - description
     - pair (array of non-empty strings)
   - Ensures pair array exists and contains valid string elements
   - Reports detailed context for any validation failures

4. **Chain ID Consistency**
   - Verifies that tokenIn and tokenOut chain IDs match the main price feed's chain ID
   - Prevents cross-chain price feed configurations
   - Reports detailed error messages for any inconsistencies

## 4. Price mappings (oracle price & spot price)

[oracle-prices](./json/validation/oracle-prices.test.ts)

### Oracle Price Test Specifications:

1. **Address Checksum Validation**

   - Validates EIP-55 checksum format for:
     - Asset address
     - Contract address
   - Uses viem's `getAddress` for validation
   - Reports detailed errors for invalid addresses

2. **Chain ID Validation**

   - Ensures all chain IDs are either 1 (Ethereum), 8453 (Base), 10 (OP Mainnet), 130 (Unichain), 137 (PolygonPOS), 999 (HyperEVM), 747474 (Katana), Arbitrum (42161), Monad (143) and Stable (988).
   - Validates both:
     - Asset chain ID
     - Contract chain ID
   - Reports any invalid chain ID occurrences

3. **Data Field Validation**

   - Validates JSON structure of the data field
   - Ensures decimals field:
     - Is present and is a number
     - Falls within valid range (0-18)
   - Reports parsing errors and invalid decimal values

4. **Pricing Chain Validation**

   - Validates order sequence for each asset on each chain:
     - Orders must start from 0
     - Orders must be sequential
     - Orders must be unique
   - Groups validation by asset address and chain ID
   - Reports sequence errors and duplicate orders

5. **Type Field Validation**
   - Ensures price type is one of the allowed values:
     - chainlink_aggregator
     - chainlink_without_logs
     - exchange_rate
     - tri_crypto
     - chronicle
     - api3
     - pyth_network
     - redstone_without_logs
     - hardcoded
     - pendle_asset_rate
     - hash_note
   - Reports any invalid type values

[spot-prices](./json/validation/spot-prices.test.ts)

### Spot Price Test Specifications:

1. **Address Checksum Validation**

   - Validates EIP-55 checksum format for:
     - Asset address
     - Contract address
   - Uses viem's `getAddress` for validation
   - Reports detailed errors for invalid addresses

2. **Chain ID Validation**

   - Ensures all chain IDs are either 1 (Ethereum), 8453 (Base), 10 (OP Mainnet), 130 (Unichain), 137 (PolygonPOS), 999 (HyperEVM), 747474 (Katana), Arbitrum (42161), Monad (143) and Stable (988).
   - Validates both:
     - Asset chain ID
     - Contract chain ID
   - Reports any invalid chain ID occurrences

3. **Data Structure Validation**

   - Validates JSON structure of the data field
   - Ensures required fields:
     - first_block_number (must be a positive number)
     - in_token (optional, must be a number if present)
   - Reports parsing errors and invalid field values

4. **Pricing Chain Validation**

   - Validates order sequence for each asset on each chain:
     - Orders must start from 0
     - Orders must be sequential
     - Orders must be unique
   - Groups validation by asset address and chain ID
   - Reports sequence errors and duplicate orders

5. **Type Field Validation**
   - Ensures price type is one of the allowed values:
     - uniswap_v3_twap
     - aerodrome
     - aerodrome_slip_stream
     - ethena_staked_usde_exchange_rate
     - erc4626_exchange_rate
     - curve_pool
   - Reports any invalid type values

## 5. Tokens listing

[tokens](./json/validation/tokens.test.ts)

### Test Specifications:

1. **Address Checksum Validation**

   - Ensures each token address follows the EIP-55 checksum format
   - Uses viem's `getAddress` for validation
   - Reports detailed error for any invalid address format

2. **Unique Address per Chain**

   - Verifies that token addresses are unique per chain ID
   - Prevents duplicate token listings on the same chain
   - Reports detailed error with all duplicate address-chainId combinations

3. **Required Fields Validation**
   - Validates presence and correct types of required token fields:
     - chainId (number)
     - address (string)
     - name (string)
     - symbol (string)
     - decimals (number, range 0-18)
     - islisted (boolean)
   - Validates metadata structure:
     - metadata.logoURI (optional string)
   - Collects and reports all validation errors in a single test run
   - Provides warnings for missing or empty logoURI fields

## 6. Exchange rate

[exchange-rates](./json/validation/exchange-rates.test.ts)

### Test Specifications:

1. **Address Checksum Validation**

   - Validates EIP-55 checksum format for:
     - Asset address
     - Contract address
   - Uses viem's `getAddress` for validation
   - Reports detailed errors for invalid addresses

2. **Chain ID Validation**

   - Ensures all chain IDs are either 1 (Ethereum), 8453 (Base), 10 (OP Mainnet), 130 (Unichain), 137 (PolygonPOS), 999 (HyperEVM), 747474 (Katana), Arbitrum (42161), Monad (143) and Stable (988).
   - Validates both:
     - Asset chain ID
     - Contract chain ID
   - Reports any invalid chain ID occurrences

3. **Data Structure Validation**

   - Validates JSON structure and content of the data field:
     - Function name must be "convertToAssets"
     - Decimals must be a number between 0 and 18
     - ABI string must match "function convertToAssets(uint256) view returns (uint256)"
   - Validates args array:
     - Must contain exactly one argument
     - Argument type must be "bigint"
     - Value must match 1e{decimals} format
   - Reports detailed validation errors for any issues

4. **Unique Address Pairs**
   - Verifies that asset-contract address pairs are unique per chain ID combination
   - Prevents duplicate exchange rate configurations
   - Reports detailed errors with all duplicate combinations

## 7. Custom warnings

No test for this one
