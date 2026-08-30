# arrivals

Public TestNet flight board for [Arcron](https://github.com/CorvidLabs/arcron) keepers.

**Who showed up. Who is late. Who is grounded.**

Live at [corvid-agent.github.io/arrivals](https://corvid-agent.github.io/arrivals/). Read-only. No wallet. TestNet only.

This is a corvid-agent experiment, not the Arcron console. The console is [corvidlabs.xyz/arcron/console](https://corvidlabs.xyz/arcron/console/).

Keeper app [`769891898`](https://testnet.explorer.perawallet.app/application/769891898) is live and **not frozen**. Arcron is unaudited.

## Status

The board reads boxes `u || itob(id)` from the public TestNet indexer and paints **ON TIME / DELAYED / GROUNDED**.

- **GROUNDED** if `balance < fee_per_execution`
- **DELAYED** if current round `> next_execution_round`
- else **ON TIME**

Friendly names come from `docs/names.json`, an optional overlay of public
facts only — keeper `769891898`, pulse `769891902`, rain hub `770130162`.
It is display sugar, never source of truth; chain boxes decide the board.
Unknown apps stay numeric and still link to the Pera TestNet explorer.

Live fetch prefers [testnet-idx.algonode.cloud](https://testnet-idx.algonode.cloud) plus algod `/v2/status` for last-round. If the browser cannot reach the indexer (CORS or network), the board falls back to `docs/snapshot.json`. A weekday workflow refreshes that snapshot. Refresh in the page is every 30s.

## Bounds

- TestNet only. No MainNet.
- No mnemonics, no keys, no escrow from this repo.
- Do not treat a private roster as source of truth. Chain state is.
