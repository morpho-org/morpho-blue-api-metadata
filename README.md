# Morpho blue api metadata

This repository contains the metadata for the Morpho blue api that need to be managed manually.
It includes:

1. [Morpho Vault whitelisting](#1-morpho-vault-whitelisting)
2. [Markets blacklisting](#2-market-blacklisting)
3. [Price feed whitelisting](#3-price-feed-whitelisting)
4. [Price mappings](#4-price-mappings)
5. [Tokens whitelisting](#5-tokens-whitelisting)
6. [Exchange rate](#6-exchange-rate)
7. [Custom warnings](#7-custom-warnings)
8. [Curator whitelisting](#8-curator-whitelisting)

> The format of the data folder SHOULD NOT be modified, in order to let the api read the data.

# Whitelisting & warnings

## 1. Morpho Vault whitelisting

Controls the whitelisted Morpho Vaults and their metadata.

> Markets are **whitelisted** as soon as a whitelisted Morpho Vault has the market in its withdraw queue.

### Required Fields

Each vault entry must include the following fields:

- `address`: Checksummed address of the vault contract
- `chainId`: Chain ID where the vault is deployed (e.g., 1 for Ethereum Mainnet, 8453 for Base)
- `image`: URL to the vault's logo/image
- `description`: Detailed description of the vault's strategy and purpose
- `forumLink`: Link to the curator's discussion forum
- `curators`: Array of curator objects, each containing:
  - `name`: Name of the curator organization
  - `image`: URL to the curator's logo
  - `url`: Website URL of the curator
  - `verified`: Boolean indicating curator verification status
- `history`: Array of historical events, each containing:
  - `action`: Type of action (e.g., "added", or "removed")
  - `timestamp`: Unix timestamp of the action

### Validation Rules

1. Vault addresses must be unique per chain ID
2. Addresses must be in checksum format
3. All required fields must be present and of the correct type

### Example Entry

```json
{
  "address": "0x38989BBA00BDF8181F4082995b3DEAe96163aC5D",
  "chainId": 1,
  "image": "https://cdn.morpho.org/assets/logos/eth.svg",
  "description": "The Flagship ETH Morpho vault curated by B.Protocol and Block Analitica is intended to optimize risk-adjusted interest earned from blue-chip LST and stablecoin collateral markets. The Flagship ETH vault also serves as a pre-deposit vault for Relend Network. Users who supply ETH will collect RELEND units and have the option to access Relend Network once live.",
  "forumLink": "https://forum.morpho.org/c/metamorpho/blockanalitica-b-protocol/20",
  "curators": [
    {
      "name": "Block Analitica",
      "image": "https://cdn.morpho.org/v2/assets/images/block-analitica.png",
      "url": "https://morpho.blockanalitica.com/",
      "verified": true
    },
    {
      "name": "B.Protocol",
      "image": "https://cdn.morpho.org/v2/assets/images/bprotocol.png",
      "url": "https://www.bprotocol.org/",
      "verified": true
    }
  ],
  "history": [
    {
      "action": "added",
      "timestamp": 1704292895
    }
  ]
}
```

### Files

[vaults-whitelist.json](./data/vaults-whitelist.json)

## 2. Market blacklisting

Controls blacklisted markets by countries. As a reminder, markets are automatically whitelisted when a whitelisted Morpho Vault is allocating to it.

### Required Fields

Each blacklist entry must include:

- `id`: Market ID (32-byte hex string)
- `chainId`: Chain ID where the market is deployed (e.g., 1 for Ethereum Mainnet, 8453 for Base)
- `countryCodes`: Array of two-letter ISO country codes where the market is blacklisted

> You can use the country code "\*" to blacklist markets from all countries.

### Example Entry

```json
{
  "id": "0x495130878b7d2f1391e21589a8bcaef22cbc7e1fbbd6866127193b3cc239d8b1",
  "chainId": 1,
  "countryCodes": ["US", "GB"]
}
```

### Files

[markets-blacklist.json](./data/markets-blacklist.json)

## 3. Price Feed whitelisting

Controls the whitelisted price feeds used by the protocol. Each price feed entry represents a specific price oracle implementation.

### Required Fields

Each price feed entry must include:

- `chainId`: Chain ID where the price feed is deployed (currently supports 1 for Ethereum, 8453 for Base)
- `address`: Checksummed contract address of the price feed
- `vendor`: Name of the price feed provider (e.g., "Chainlink", "Pyth Network", "Oval")
- `description`: Human-readable description of what the price feed measures
- `pair`: Array of two strings representing the input/output token symbols (e.g., ["USDC", "USD"])

### Optional Fields

- `tokenIn`: Object containing the input token details (if applicable):
  - `address`: Checksummed contract address of the input token
  - `chainId`: Chain ID where the input token is deployed
- `tokenOut`: Object containing the output token details (if applicable):
  - `address`: Checksummed contract address of the output token
  - `chainId`: Chain ID where the output token is deployed
- `decimals`: Number of decimals for the price feed output (if applicable)

### Example Entry

```json
{
  "chainId": 8453,
  "address": "0x07DA0E54543a844a80ABE69c8A12F22B3aA59f9D",
  "vendor": "Chainlink",
  "description": "cbBTC / USD (0.5%)",
  "pair": ["CBBTC", "USD"],
  "tokenIn": {
    "address": "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    "chainId": 8453
  },
  "tokenOut": {
    "address": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "chainId": 8453
  },
  "decimals": 8
}
```

### Validation Rules

1. All addresses must be properly checksummed
2. Chain IDs must be either 1 (Ethereum) or 8453 (Base)
3. If `tokenIn` or `tokenOut` is provided, their chain IDs must match the main price feed's chain ID
4. Required string fields (`vendor`, `description`) cannot be empty
5. `pair` must be an array of non-empty strings

### Files

[price-feeds.json](./data/price-feeds.json)

## 4. Price mappings

### 4.1 Oracle prices ( xxx -> USD)

[Oracle prices](./docs/pricing/oracle-prices.md)

Oracle prices are used to calculate the price of an asset to USD.

Eg. WETH -> USD

### 4.2 Spot prices ( xxx -> ETH )

[Spot prices](./docs/pricing/spot-prices.md)

Spot prices are used to calculate the price of an asset to ETH.

Eg. wstETH -> ETH

## 5. Tokens whitelisting

Controls the whitelisted tokens recognized by the protocol. Each token entry represents an ERC-20 token deployed on a supported chain (Ethereum, Base, Optimism, Polygon, Arbitrum, or Avalanche).

### Required Fields

Each token entry must include:

- `chainId`: Chain ID where the token is deployed (supports 1, 8453, 10, 137, 42161, 43114)
- `address`: Checksummed contract address of the token
- `name`: Name of the token (ERC-20)
- `symbol`: Symbol of the token (ERC-20)
- `decimals`: Number of decimals for the token (0-18)
- `isWhitelisted`: Boolean flag indicating if the token is whitelisted
- `metadata`: Object containing additional token information:

  - `logoURI`: URL to the token's logo image.
  - `tags`: Array of descriptive tags.

    &

  - (Optional) `alternativeOracles`: List of other token symbols considered perfectly matching the token (e.g: WETH -> ETH).
  - (Optional) `alternativeHardcodedOracles`: List of other token symbols considered as hardcoded oracles for the token (e.g: msETH -> ETH, containing the information that pricing msETH 1:1 with ETH will be considered as a hardcoded oracle).

### Validation Rules

1. All addresses must be properly checksummed
2. Chain IDs must be one of the supported networks
3. Token addresses must be unique per chain ID
4. Decimal values must be between 0 and 18
5. Required fields must have correct types:
   - Numbers: chainId, decimals
   - Strings: address, name, symbol
   - Boolean: isWhitelisted
   - Object: metadata with logoURI and tags

### Example Entry

```json
{
  "chainId": 1,
  "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "symbol": "USDC",
  "decimals": 6,
  "name": "USDCoin",
  "metadata": {
    "logoURI": "https://cdn.morpho.org/assets/logos/usdc.svg",
    "tags": ["stablecoin", "simple-permit"],
    "alternativeHardcodedOracles": ["USD"]
  },
  "isWhitelisted": true
}
```

### Files

[tokens.json](./data/tokens.json)

#### Example #1: Token with alternative oracle

WETH token is generally considered safe to use with ETH denominated oracles.
Therefore, "ETH" symbols is added as an alternative oracle to "WETH" token, and no oracle warnings will be triggered.

```json
  {
    "name": "Wrapped Ether",
    "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "symbol": "WETH",
    "decimals": 18,
    "chainId": 1,
    "metadata": {
      "logoURI": "https://cdn.morpho.org/assets/logos/weth.svg",
      "alternativeOracles": ["ETH"],
      "tags": ["eth"]
    },
    "isWhitelisted": true
  },
```

#### Example #2: Token with hardcoded oracle (stablecoin)

USDe token may be paired in a market with DAI without any oracle to avoid liquidations. In this case,

```json
{
  "chainId": 1,
  "address": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  "symbol": "DAI",
  "decimals": 18,
  "name": "Dai Stablecoin",
  "metadata": {
    "logoURI": "https://cdn.morpho.org/assets/logos/dai.svg",
    "tags": ["stablecoin", "usd-pegged", "dai-specific-permit"],
    "alternativeHardcodedOracles": ["USDS"]
  },
  "isWhitelisted": true
}
```

#### Example #3: Token with hardcoded oracle (null feeds)

There are special cases where there oracles might be intendedly left null for legitimate reasons (i.e avoid liquidations). For example, USDe token may be paired in a market with DAI with a completely null oracle. In this case, "DAI" is added as an alternative oracle to "USDe".

```json
{
  "chainId": 1,
  "address": "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3",
  "name": "USDe",
  "symbol": "USDe",
  "decimals": 18,
  "metadata": {
    "logoURI": "https://cdn.morpho.org/assets/logos/usde.svg",
    "alternativeHardcodedOracles": ["DAI", "USDC"],
    "tags": ["stablecoin", "usd-pegged", "rwa"]
  },
  "isWhitelisted": true
}
```

#### Example #4: Token with hardcoded token (LST)

stETH token may sometimes be considered 1:1 with ETH.
Therefore, "ETH" symbol is added as an alternative "hardcoded" oracle to "stETH" token, and "hardcoded_oracle" warning (minor) will be triggered when a stETH feed is paired with a ETH feed.

```json
{
  "chainId": 1,
  "address": "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
  "name": "stETH",
  "symbol": "stETH",
  "decimals": 18,
  "metadata": {
    "logoURI": "https://cdn.morpho.org/assets/logos/steth.svg",
    "alternativeHardcodedOracles": ["ETH", "WETH"],
    "tags": ["yield", "lst", "eth"]
  },
  "isWhitelisted": true
}
```

## 6. Exchange Rate

Controls the exchange rate configurations for assets that require rate conversion (e.g., liquid staking tokens). Each entry defines how to fetch the conversion rate between a token and its underlying asset.

### Required Fields

Each exchange rate entry must include:

- `assetAddress`: Checksummed address of the asset contract
- `assetChainId`: Chain ID of the asset contract
- `contractAddress`: Checksummed address of the contract that provides the conversion rate
- `contractChainId`: Chain ID of the contract that provides the conversion rate
- `data`: JSON string containing the conversion configuration:
  - `function`: Name of the conversion function (see [the abi](#abi))
  - `abi`: The ABI string for the conversion function see ([the abi](#abi))
  - `decimals`: Number of decimals for the input amount (0-18)
  - `args`: Array containing the input argument configuration, if needed:
    - `type`: Type of the argument (must be "bigint")
    - `value`: String representation of one unit in the asset's decimals

#### Abi

The abi should describe the contract function to call to fetch the exchange rate.
It should return the corresponding amount of **underlying asset**, given an specific amount.

The expected abi should match:

```sol
function _myFunction_(uint256) view returns (uint256)
```

> [!Note]  
> If the asset is an erc4626, the function will always be `convertToAssets`

> [!Warning]  
> In the future, it could happen that we have a contract that doesn't fit this scheme.
> We should then loosen up the requirements to add flexibility.  
> _E.g the function that should be used for stEth is `stEthPerToken` which doesn't allow to input a specific amount but still gives the expected info._

### Validation Rules

1. All addresses must be properly checksummed
2. Chain IDs must be supported
3. Address pairs must be unique per chain ID combination
4. The data field must follow the specified structure
5. The conversion function must have the correct abi
6. The input value must represent one unit in the asset's decimals

### Example Entry

```json
{
  "assetAddress": "0x83F20F44975D03b1b09e64809B757c47f942BEeA",
  "contractAddress": "0x83F20F44975D03b1b09e64809B757c47f942BEeA",
  "data": "{\"abi\": \"function convertToAssets(uint256) view returns (uint256)\", \"decimals\": 18, \"function\": \"convertToAssets\", \"args\": [{\"type\": \"bigint\", \"value\": \"1000000000000000000\"}]}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

### Files

[exchange-rates.json](./data/exchange-rates.json)

## 7. Custom warnings

In case of emergency, or particular situation, Morpho Labs team is able to add custom warnings to some vaults or markets displayed on the Morpho Interface.

[custom-warnings.json](./data/custom-warnings.json)

## 8. Curator whitelisting

Controls the known curators and the addresses they manage.

> [!Note]
> Any vault that have an `owner` or a `curator` address referenced as managed by a curator will automatically be flagged as curated by this curator, unless the `owner` is unknown [*].

_[*] This is to prevent anyone from having their vault flagged as "curated by X" just by setting any whitelisted address as `curator`_

### Required Fields

Each curator entry must include the following fields:

- `name`: Name of the curator organization
- `image`: URL to the curator's logo/image (optional)
- `url`: Website URL of the curator (optional)
- `verified`: Boolean indicating curator verification status
- `addresses`: List of addresses managed by this curator, on each chain (optional)
- `ownerOnly`: Optional boolean indicating if the blockchain `owner` address should be attach to a specific curator in the UI (their verification will still be active)

> [!Note]
>
> - All curators must be verified (`verified: true`) to be included in the whitelist
> - Pure owners (`ownerOnly: true`) must have empty `image` and `url` fields as they won't be displayed in the UI
> - An address can be managed by different curators

### Validation Rules

1. Addresses must be in checksum format
2. All required fields must be present and of the correct type
3. Curator names must be unique
4. Image URLs must start with "https://cdn.morpho.org/v2/assets/images"
5. Pure owner addresses must have empty image and URL fields

### Example Entry

```json
  {
    "image": "https://cdn.morpho.org/v2/assets/images/gauntlet.svg",
    "name": "Gauntlet",
    "url": "https://www.gauntlet.xyz/",
    "verified": true,
    "addresses": {
      "1": [
        "0x123",
      ],
      "8453": [
        "0x456",
      ]
    }
  },
```

### Files

[curators-whitelist.json](./data/curators-whitelist.json)
