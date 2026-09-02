"""Static honesty: arrivals Pages board docs stay TestNet-shaped and offline-checkable."""

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SNAPSHOT = json.loads((DOCS / "snapshot.json").read_text())
NAMES = json.loads((DOCS / "names.json").read_text())
README = (ROOT / "README.md").read_text()
REFRESH = (ROOT / "scripts" / "refresh_snapshot.py").read_text()
APP_JS = (DOCS / "app.js").read_text()

UPKEEP_KEYS = {
    "id",
    "box_name",
    "creator",
    "target_app",
    "interval_rounds",
    "next_execution_round",
    "fee_per_execution",
    "balance",
    "times_executed",
    "policy",
    "fee_cap",
    "last_serviced_round",
    "fee_asset",
    "asset_fee",
    "asset_balance",
}
RAIN_KEYS = {
    "id",
    "name",
    "prize_asset",
    "drip",
    "interval_rounds",
    "last_rain_round",
    "pot",
    "tickets",
    "draw_id",
    "mode",
    "wave_cap",
    "commit_round",
    "prize_locked",
}


def test_docs_board_files_exist() -> None:
    assert (DOCS / "index.html").is_file()
    assert (DOCS / "app.js").is_file()
    assert (DOCS / "style.css").is_file()
    assert (DOCS / "snapshot.json").is_file()
    assert (DOCS / "names.json").is_file()
    assert (ROOT / "scripts" / "refresh_snapshot.py").is_file()
    assert (ROOT / "LICENSE").is_file()


def test_snapshot_has_expected_top_keys() -> None:
    for key in (
        "generated_at",
        "network",
        "keeper_app",
        "last_round",
        "indexer",
        "algod",
        "upkeeps",
    ):
        assert key in SNAPSHOT
    assert SNAPSHOT["network"] == "testnet"
    assert int(SNAPSHOT["last_round"]) > 0
    assert int(SNAPSHOT["keeper_app"]) == 769891898
    assert "testnet" in str(SNAPSHOT["indexer"]).lower()
    assert "testnet" in str(SNAPSHOT["algod"]).lower()
    assert "mainnet" not in str(SNAPSHOT["indexer"]).lower()
    assert "mainnet" not in str(SNAPSHOT["algod"]).lower()


def test_upkeeps_shape_as_present() -> None:
    upkeeps = SNAPSHOT["upkeeps"]
    assert isinstance(upkeeps, list)
    assert len(upkeeps) > 0
    seen = set()
    for u in upkeeps:
        assert UPKEEP_KEYS.issubset(u.keys())
        uid = int(u["id"])
        assert uid > 0
        assert uid not in seen
        seen.add(uid)
        assert int(u["target_app"]) > 0
        assert int(u["interval_rounds"]) > 0
        assert int(u["fee_per_execution"]) >= 0
        assert int(u["balance"]) >= 0


def test_rain_shape_as_present() -> None:
    rain = SNAPSHOT.get("rain")
    assert rain is not None
    assert isinstance(rain, dict)
    hub = rain.get("hub") or {}
    rains = rain.get("rains") or []
    assert isinstance(rains, list)
    assert "next_rain_id" in hub
    assert int(hub.get("next_rain_id") or 0) >= 0
    for r in rains:
        assert RAIN_KEYS.issubset(r.keys())
        assert int(r["id"]) > 0
        assert isinstance(r["name"], str)


def test_names_json_loads_public_overlay_only() -> None:
    apps = NAMES.get("apps") or {}
    assert apps.get("769891898") == "keeper"
    assert apps.get("769891902") == "pulse"
    assert apps.get("770130162") == "rain"
    # Overlay is display sugar only — never invent private roster ids here.
    assert set(apps.keys()) == {"769891898", "769891902", "770130162"}


def test_refresh_script_is_unsigned_testnet_read_only() -> None:
    assert "KEEPER = 769891898" in REFRESH
    assert '"network": "testnet"' in REFRESH
    assert "testnet-idx.algonode.cloud" in REFRESH
    assert "testnet-api.algonode.cloud" in REFRESH
    assert "mainnet" not in REFRESH.lower()
    assert "mnemonic" not in REFRESH.lower()
    assert "No secrets" in REFRESH or "no secrets" in REFRESH.lower()
    assert "OUT.write_text" in REFRESH
    assert "snapshot.json" in REFRESH
    assert "txid" not in REFRESH.lower()
    # Unsigned reads only — no execute / fund / poke paths.
    assert "ApplicationCall" not in REFRESH
    assert "sign" not in REFRESH.lower() or "unsigned" in REFRESH.lower()


def test_no_deploy_json_invented() -> None:
    # Arrivals is a live board with a real keeper; do not invent a deploy.json
    # appId-0 story or copy LocalNet ids into Pages.
    assert not (DOCS / "deploy.json").exists()
    assert not (DOCS / "localnet.json").exists()
    assert "localhost:4001" not in APP_JS
    assert "localnet" not in APP_JS.lower()


def test_pages_app_js_is_board_not_wallet() -> None:
    assert "769891898" in APP_JS
    assert "snapshot.json" in APP_JS
    assert "names.json" in APP_JS
    assert "INDEXER" in APP_JS
    lowered = APP_JS.lower()
    assert "mnemonic" not in lowered
    assert "mainnet" not in lowered
    assert "No wallet" in APP_JS or "no wallet" in lowered


def test_readme_bounds_testnet_only() -> None:
    assert "TestNet only" in README or "testnet only" in README.lower()
    assert "No MainNet" in README or "no mainnet" in README.lower()
    assert "corvid-agent.github.io/arrivals" in README
    assert "769891898" in README
    assert "docs/snapshot.json" in README
    assert "No mnemonics" in README or "no mnemonics" in README.lower()
