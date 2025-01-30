# Adding Spot Prices to the API

Please follow this procedure to add a spot price (ETH) for an asset. The team will review its content and approve/deny it. All of the entries need to map towards an ETH value.

## Parameters

A spot price consists of either one or multiple chained values that are multiplied together. For each new asset, the following parameters are necessary:

### Asset address

42 character string that represents the token/asset address. Must be checksummed.

### Asset chain id

The numerical chain id of this asset. Currently supported:

- 1 (Ethereum Mainnet)
- 8453 (Base)

See [Chainlist](https://chainlist.org) for reference.

### Type

The following types are currently supported:

#### uniswap_v3_twap

Uniswap v3 pool TWAP (Time-Weighted Average Price).

Example for [WBTC/ETH](https://etherscan.io/address/0xCBCdF9626bC03E24f779434178A73a0B4bad62eD):

```json
{
  "assetAddress": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  "contractAddress": "0xCBCdF9626bC03E24f779434178A73a0B4bad62eD",
  "order": 0,
  "type": "uniswap_v3_twap",
  "data": "{\"in_token\": 0, \"first_block_number\": 18700000}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

#### aerodrome

Aerodrome pool price (Base chain).

Example for EURC/WETH:

```json
{
  "assetAddress": "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42",
  "contractAddress": "0x9DFf4b5AE4fD673213502Ab8fbf6d36015efb3E1",
  "order": 0,
  "type": "aerodrome",
  "data": "{ \"token_in\": \"0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42\", \"token_in_decimals\": 6, \"token_out_decimals\": 18, \"first_block_number\": 19077902}",
  "assetChainId": 8453,
  "contractChainId": 8453
}
```

#### aerodrome_slip_stream

Aerodrome slip stream pool price (Base chain).

Example for cdxUSDC/USDC:

```json
{
  "assetAddress": "0xC0D3700000987C99b3C9009069E4f8413fD22330",
  "contractAddress": "0xBBA4BcA62DC6ac976B160F4f513e517d3326759f",
  "order": 0,
  "type": "aerodrome_slip_stream",
  "data": "{\"in_token\": 1, \"first_block_number\": 23906649}",
  "assetChainId": 8453,
  "contractChainId": 8453
}
```

#### ethena_staked_usde_exchange_rate

Ethena staked USDe exchange rate.

Example for USDe:

```json
{
  "assetAddress": "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497",
  "contractAddress": "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497",
  "order": 2,
  "type": "ethena_staked_usde_exchange_rate",
  "data": "{\"first_block_number\": 18700000}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

#### erc4626_exchange_rate

ERC4626 vault exchange rate.

Example for wsuperOETHb:

```json
{
  "assetAddress": "0x7FcD174E80f264448ebeE8c88a7C4476AAF58Ea6",
  "contractAddress": "0x7FcD174E80f264448ebeE8c88a7C4476AAF58Ea6",
  "order": 0,
  "type": "erc4626_exchange_rate",
  "data": "{\"decimals\": 18, \"first_block_number\": 17829707}",
  "assetChainId": 8453,
  "contractChainId": 8453
}
```

#### curve_pool

Curve pool exchange rate.

Example for T token:

```json
{
  "assetAddress": "0xCdF7028ceAB81fA0C6971208e83fa7872994beE5",
  "contractAddress": "0x752eBeb79963cf0732E9c0fec72a49FD1DEfAEAC",
  "order": 0,
  "type": "curve_pool",
  "data": "{\"first_block_number\": 20200000}",
  "assetChainId": 1,
  "contractChainId": 1
}
```

### Contract Address

42 character string that represents the contract address where the spot price can be queried. Must be checksummed.

### Contract chain id

The numerical chain id of the contract where the spot price can be queried. Currently supported:

- 1 (Ethereum Mainnet)
- 8453 (Base)

See [Chainlist](https://chainlist.org) for reference.

### Data

Extra data used for querying the spot price. The format varies by type:

- `uniswap_v3_twap`:

  - `in_token`: Whether the first asset is token0 (0) or token1 (1) in the Uniswap pool
  - `first_block_number`: First block number to start ingesting data from

- `aerodrome`:

  - `token_in`: Address of the input token
  - `token_in_decimals`: Decimals of the input token
  - `token_out_decimals`: (Optional) Decimals of the output token
  - `first_block_number`: First block number to start ingesting data from

- `aerodrome_slip_stream`:

  - `in_token`: Whether the first asset is token0 (0) or token1 (1)
  - `first_block_number`: First block number to start ingesting data from

- `ethena_staked_usde_exchange_rate`:

  - `first_block_number`: First block number to start ingesting data from

- `erc4626_exchange_rate`:

  - `decimals`: Number of decimals for the exchange rate
  - `first_block_number`: First block number to start ingesting data from

- `curve_pool`:
  - `first_block_number`: First block number to start ingesting data from

### Order

The 0-starting index order of the spot price entry for an asset. When multiple entries exist for the same asset, they are multiplied together in order to get the final ETH price.

## Validation Rules

1. Addresses must be checksummed
2. Chain IDs must be either 1 (Ethereum) or 8453 (Base)
3. Orders must start from 0 and be sequential for each asset
4. Data field must contain valid parameters as specified for each type
5. Type must be one of the supported types

## Adding mappings

To add mappings, simply add the entries to the [spot-prices.json](../src/schemas/asset-spot-price-mappings/spot-prices.json) file.

## Complex Example

Here are the entries required to add a spot price for `FRAX` on ETH mainnet, which requires chaining two Uniswap v3 pools:

```json
[
  {
    "assetAddress": "0x853d955aCEf822Db058eb8505911ED77F175b99e",
    "contractAddress": "0xc63B0708E2F7e69CB8A1df0e1389A98C35A76D52",
    "order": 0,
    "type": "uniswap_v3_twap",
    "data": "{\"in_token\": 0, \"first_block_number\": 18700000}",
    "assetChainId": 1,
    "contractChainId": 1
  },
  {
    "assetAddress": "0x853d955aCEf822Db058eb8505911ED77F175b99e",
    "contractAddress": "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
    "order": 1,
    "type": "uniswap_v3_twap",
    "data": "{\"in_token\": 0, \"first_block_number\": 18700000}",
    "assetChainId": 1,
    "contractChainId": 1
  }
]
```
