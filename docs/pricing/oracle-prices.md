# Adding Oracle Prices to the API

Please follow this procedure to add an oracle price (USD) for an asset. The team will review its content and approve/deny it. All of the entries need to map towards a USD value.

## Parameters

An oracle price consists of either one or multiple chained values that are multiplied together. For each new asset, the following parameters are necessary:

### Asset address

42 character string that represents the token/asset address. Must be checksummed.

### Asset chain id

The numerical chain id of this asset. Currently supported:

- 1 (Ethereum Mainnet)
- 8453 (Base)

See [Chainlist](https://chainlist.org) for reference.

### Type

The following types are currently supported:

#### chainlink_aggregator

Chainlink compatible contract that emits `AnswerUpdated` log.

Example for ETH/USD price feed:

```json
{
  "assetAddress": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  "contractAddress": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  "order": 0,
  "type": "chainlink_aggregator",
  "data": "{\"decimals\": 8}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

#### chainlink_without_logs

Chainlink compatible contract without event logs.

No example yet.

#### exchange_rate

Contract that exposes a function that returns a numerical exchange rate.

Example for wstETH/stETH rate:

```json
{
  "assetAddress": "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
  "contractAddress": "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
  "order": 0,
  "type": "exchange_rate",
  "data": "{\"abi\": \"function stEthPerToken() view returns (uint256)\", \"decimals\": 18, \"function\": \"stEthPerToken\"}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

or wUSDL/USDL rate

```json
{
  "assetAddress": "0x7751E2F4b8ae93EF6B79d86419d42FE3295A4559",
  "contractAddress": "0x7751E2F4b8ae93EF6B79d86419d42FE3295A4559",
  "order": 0,
  "type": "exchange_rate",
  "data": "{\"abi\": \"function convertToAssets(uint256) view returns (uint256)\", \"decimals\": 18, \"function\": \"convertToAssets\", \"args\": [{\"type\": \"bigint\", \"value\": \"1000000000000000000\"}], \"first_block_number\": 21078732}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

#### tri_crypto

Curve tri-crypto pool rate.

```json
{
  "assetAddress": "0xAb122ae30b3eE050F0Eb30009DEec6aCC6B06D36",
  "contractAddress": "0xf5f5B97624542D72A9E06f04804Bf81baA15e2B4",
  "order": 1,
  "type": "tri_crypto",
  "data": "{\"decimals\": 18, \"first_block_number\": 19083124}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

#### chronicle

Chronicle oracle feed.

Example:

```json
{
  "assetAddress": "0x7122985656e38BDC0302Db86685bb972b145bD3C",
  "contractAddress": "0x057f30e63A69175C69A4Af5656b8C9EE647De3D0",
  "order": 0,
  "type": "chronicle",
  "data": "{\"decimals\": 18, \"first_block_number\": 20578895}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

#### api3

API3 oracle feed.

Example:

```json
{
  "assetAddress": "0x4956b52aE2fF65D74CA2d61207523288e4528f96",
  "contractAddress": "0xAdb2c15Fde49D1A4294740aCb650de94184E66b2",
  "order": 0,
  "type": "api3",
  "data": "{\"decimals\": 8, \"first_block_number\": 21484157}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

#### pyth_network

Pyth Network oracle feed.

```json
{
  "assetAddress": "0xeFc0CED4B3D536103e76a1c4c74F0385C8F4Bdd3",
  "contractAddress": "0x9975a5C7F4FCCce40B53672F7F46B9E4a85199F7",
  "order": 0,
  "type": "pyth_network",
  "data": "{\"decimals\": 8, \"first_block_number\": 20418093}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

#### redstone_without_logs

Redstone oracle feed without event logs.

Example:

```json
{
  "assetAddress": "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee",
  "contractAddress": "0x8751F736E94F6CD167e8C5B97E245680FbD9CC36",
  "order": 0,
  "type": "redstone_without_logs",
  "data": "{\"decimals\": 8, \"first_block_number\": 18827200}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

#### hardcoded

Fixed value oracle, typically used for stablecoins.

Example:

```json
{
  "assetAddress": "0x09D4214C03D01F49544C0448DBE3A27f768F2b34",
  "contractAddress": "0x09D4214C03D01F49544C0448DBE3A27f768F2b34",
  "order": 0,
  "type": "hardcoded",
  "data": "{\"decimals\": 6, \"usd_value\": 1000000, \"first_block_number\": 20883926}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

#### pendle_asset_rate

Pendle protocol asset rate.
Here it is a bit particular.

One should provide, as a contract address, the market existing, linked to the PT asset.

E.g: PT-LBTC-27MAR2025.

`0x70B70Ac0445C3eF04E314DFdA6caafd825428221` is the [market address](https://app.pendle.finance/trade/markets/0x70b70ac0445c3ef04e314dfda6caafd825428221/swap?view=pt&chain=ethereum&tab=info) for PT-LBTC-27MAR2025 (`0xEc5a52C685CC3Ad79a6a347aBACe330d69e0b1eD`).

Internally, we are computing the `ptToAssetRate`, on this contract `0x9a9Fa8338dd5E5B2188006f1Cd2Ef26d921650C2` thanks to the market address.

```json
  {
    "assetAddress": "0xEc5a52C685CC3Ad79a6a347aBACe330d69e0b1eD",
    "contractAddress": "0x70B70Ac0445C3eF04E314DFdA6caafd825428221",
    "order": 0,
    "type": "pendle_asset_rate",
    "data": "{\"decimals\": 18, \"first_block_number\": 21163666}",
    "assetChainId": 1,
    "contractChainId": 1
  },
```

#### hash_note

Hash note oracle feed.

```json
{
  "assetAddress": "0x136471a34f6ef19fE571EFFC1CA711fdb8E49f2b",
  "contractAddress": "0x4c48bcb2160F8e0aDbf9D4F3B034f1e36d1f8b3e",
  "order": 0,
  "type": "hash_note",
  "data": "{\"decimals\": 8}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

### Order

The 0-starting index order of the oracle/exchange rate entry for an asset. When multiple entries exist for the same asset, they are multiplied together in order to get the final USD price.

### Data Field

JSON string containing configuration for the oracle:

- `decimals`: Required. Number between 0-18 representing the decimal precision
- `abi`: Optional. ABI string for function calls (required for exchange_rate type)
- `function`: Optional. Function name to call (required for exchange_rate type)
- `args`: Optional. Array of arguments for the function call
- `first_block_number`: Optional. Block number when the oracle became active
- `usd_value`: Optional. Fixed USD value for hardcoded type (in base units)

## Validation Rules

1. Addresses must be checksummed
2. Chain IDs must be either 1 (Ethereum) or 8453 (Base)
3. Orders must start from 0 and be sequential for each asset
4. Data field must contain valid decimals between 0-18
5. Type must be one of the supported types

## Adding mappings

To add mappings, simply add the entries to the [oracle-prices.json](../src/schemas/asset-price-mappings/oracle-prices.json) file.

## Complex Example

Here are the entries required to add an oracle price for `wstETH` on ETH mainnet, which requires both the wstETH/stETH rate and the stETH/USD price:

```json
[
  {
    "assetAddress": "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    "contractAddress": "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    "order": 0,
    "type": "exchange_rate",
    "data": "{\"abi\": \"function stEthPerToken() view returns (uint256)\", \"decimals\": 18, \"function\": \"stEthPerToken\"}",
    "assetChainId": 1,
    "contractChainId": 1
  },
  {
    "assetAddress": "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    "contractAddress": "0xCfE54B5cD566aB89272946F602D76Ea879CAb4a8",
    "order": 1,
    "type": "chainlink_aggregator",
    "data": "{\"decimals\": 8}",
    "assetChainId": 1,
    "contractChainId": 1
  }
]
```
