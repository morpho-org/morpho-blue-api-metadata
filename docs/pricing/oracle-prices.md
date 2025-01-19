# Adding Oracle Prices to the API

Please follow this procedure to add an oracle price (USD) for an asset. The team will review its content and approve/deny it. All of the entries need to map towards a USD value.

## Parameters

An oracle price consist of either one of multiple chained values that are multiplied together. For each new asset, the following parameters are necessary:

### Asset address

42 character string that represent the token/asset address.

### Asset chain id

The numerical chain id of this asset, see [Chainlist](https://chainlist.org) for reference.

### Type

The following types are currently supported:

#### chainlink_aggregator

Chainlink compatible contract that emits `AnswerUpdated` log.

#### exchange_rate

Contract that exposes a function that returns a numerical exchange rate.

#### redstone_without_logs

Example to price the USDe thanks to its Redstone feed.

```json

...
  {
    "assetAddress": "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3",
    "contractAddress": "0xbc5fbcf58ceaea19d523abc76515b9aefb5cfd58",
    "order": 0,
    "type": "redstone_without_logs",
    "data": "{\"decimals\": 8, \"first_block_number\": 19282020}",
    "assetChainId": 1,
    "contractChainId": 1
  },
...
```

#### tri_crypto

PS: this is very specific to this protocol.

#### pyth_network

Example to price the PYTH token thanks to its Pyth feed.

```json

...
  {
    "assetAddress": "0xeFc0CED4B3D536103e76a1c4c74F0385C8F4Bdd3",
    "contractAddress": "0x9975a5C7F4FCCce40B53672F7F46B9E4a85199F7",
    "order": 0,
    "type": "pyth_network",
    "data": "{\"decimals\": 8, \"first_block_number\": 20418093}",
    "assetChainId": 1,
    "contractChainId": 1
  },
...
```

#### hash_note

Example to price the USYC token thanks to its Hashnote feed.

```json

...
  {
    "assetAddress": "0x136471a34f6ef19fE571EFFC1CA711fdb8E49f2b",
    "contractAddress": "0x4c48bcb2160F8e0aDbf9D4F3B034f1e36d1f8b3e",
    "order": 0,
    "type": "hash_note",
    "data": "{\"decimals\": 8}",
    "assetChainId": 1,
    "contractChainId": 1
  },
...
```

#### chronicle

Example to price the hyUSD token thanks to its Chronicle feed.

```json

...
  {
    "assetAddress": "0xCc7FF230365bD730eE4B352cC2492CEdAC49383e",
    "contractAddress": "0x834c4f996B8a6411AEC0f8a0cF6fAfd4423dBEe2",
    "order": 0,
    "type": "chronicle",
    "data": "{\"decimals\": 18, \"first_block_number\": 16414048}",
    "assetChainId": 8453,
    "contractChainId": 8453
  },
...
```

### Contract Address

42 character string that represent the contract address where the numerical oracle or exchange rate can be queried.

### Contract chain id

The numerical chain id of the contract where the numerical oracle or exchange rate can be queried, see [Chainlist](https://chainlist.org) for reference.

### Data

Extra data used for querying the oracle price, here is the format for the supported types:

#### chainlink_aggregator

Answer decimals:

`{"decimals": 8}`

#### exchange_rate

Answer decimals, contract function ABI, contract function name:

`{"abi": "function stEthPerToken() view returns (uint256)", "function": "stEthPerToken",  "decimals": 18}`

#### redstone_without_logs

Check examples.

#### tri_crypto

Check examples.

#### pyth_network

Check examples.

#### hash_note

Check examples.

#### chronicle

Check examples.

### Order

The 0 starting index order of the oracle/exchange rate entry for an asset.

## Adding mappings

To add mappings, simply add the entries to the [oracle-prices.json](../src/schemas/asset-price-mappings/oracle-prices.json) file.

## Example

Here are the entries that would be required to add an oracle price for `wstETH` on ETH mainnnet:

```json
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
    "contractAddress": "0xda31bc2b08f22ae24aed5f6eb1e71e96867ba196",
    "order": 1,
    "type": "chainlink_aggregator",
    "data": "{\"decimals\": 8}",
    "assetChainId": 1,
    "contractChainId": 1
},
```
