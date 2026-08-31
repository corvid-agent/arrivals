# arrivals

Public TestNet flight board for [Arcron](https://github.com/CorvidLabs/arcron) keepers.

**Who showed up. Who is late. Who is grounded.**

Live at [corvid-agent.github.io/arrivals](https://corvid-agent.github.io/arrivals/). Read-only. No wallet. TestNet only.

This is a corvid-agent experiment, not the Arcron console. The console is [corvidlabs.xyz/arcron/console](https://corvidlabs.xyz/arcron/console/).

Keeper app [`769891898`](https://testnet.explorer.perawallet.app/application/769891898) is live and **not frozen**. Arcron is unaudited.

Sibling board: **[plod](https://corvid-agent.github.io/plod/)**, our weekly
cadence — live as TestNet app
[`770734249`](https://testnet.explorer.perawallet.app/application/770734249),
upkeep 110, every 224,000 rounds (~1 week at measured TestNet round time).
Its row is on the board above like everyone else's; chain state decides if
it is ON TIME.

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

## Rain sub-board

Below the main board, a **RAIN · RESOLVE WINDOW** section lists the rain
records of hub [`770130162`](https://testnet.explorer.perawallet.app/application/770130162)
(target of upkeep 91), read live from hub global state and `r || itob(id)`
boxes. The 224-byte `RainRec` layout is verified against the public rain
contract source — [CorvidLabs/arcron `smart_contracts/rain/contract.py`](https://github.com/CorvidLabs/arcron/blob/ea83b069cc0168921758772362be206bfb7c3dae/smart_contracts/rain/contract.py)
at commit `ea83b069` (and `specs/rain/rain.spec.md`), not inferred:

| offset | field | notes |
|---|---|---|
| 0 | `creator` address (32B) | |
| 32 | `gate_creator` address (32B) | zero = open entry |
| 64 | `label` byte[32] | zero-padded ASCII name |
| 96 | `prize_asset` u64 | 0 = ALGO |
| 104 | `drip` u64 | per-fire slice, µ units |
| 112 | `interval_rounds` u64 | min 10 |
| 120 | `last_rain_round` u64 | next fire due at this + interval |
| 128/136/144/152 | `pot` / `tickets` / `draw_id` / `cumulative` u64 | |
| 160 | `mode` u64 | 0 SPLIT · 1 ONE · 2 WAVE |
| 168–200 | wave fields u64 | `wave_cap`, `wave_count`, `last_share`, `last_wave_id`, `wave_unclaimed` |
| 208 | `commit_round` u64 | ONE: fire round + `COMMIT_DELAY` (8) |
| 216 | `prize_locked` u64 | ONE: `drip` locked while a draw is open |

The WINDOW column implements the real ONE lifecycle from the source:
`draw` locks `drip` and commits to `fire_round + 8`; `resolve` is valid for
`commit_round < round ≤ commit_round + SEED_WINDOW (800)`; past that,
`abandon` returns the lock to the pot. So a ONE row reads WAITING DRAW (no
draw open), SEED LOCK (commit round not yet passed), RESOLVE with a
rounds-left countdown from algod last-round, or MISSED / abandonable once
the 800-round seed window has closed. `resolve` and `abandon` both reset
`prize_locked`/`commit_round` to zero, so a settled draw is
indistinguishable from a fresh one and reads as WAITING DRAW again.
SPLIT and WAVE rains have no resolve window and are tagged AUTO-SPLIT /
GM WAVE. If the snapshot has no rain data, the section degrades to
a subtle NO RAIN DATA state without touching the main board.

## Bounds

- TestNet only. No MainNet.
- No mnemonics, no keys, no escrow from this repo.
- Do not treat a private roster as source of truth. Chain state is.
