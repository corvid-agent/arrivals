#!/usr/bin/env python3
"""Pull TestNet keeper boxes and rewrite docs/snapshot.json. No secrets."""
from __future__ import annotations

import base64
import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

KEEPER = 769891898
INDEXER = "https://testnet-idx.algonode.cloud"
ALGOD = "https://testnet-api.algonode.cloud"
UA = {"User-Agent": "corvid-agent-arrivals-snapshot/1.0"}
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "snapshot.json"


def get(url: str) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def encode_address(pk: bytes) -> str:
    checksum = hashlib.new("sha512_256", pk).digest()[-4:]
    return base64.b32encode(pk + checksum).decode("ascii").rstrip("=")


def u64(raw: bytes, off: int) -> int:
    return int.from_bytes(raw[off : off + 8], "big")


def decode_id(b64name: str) -> int | None:
    raw = base64.b64decode(b64name)
    if len(raw) < 9 or raw[0:1] != b"u":
        return None
    return int.from_bytes(raw[1:9], "big")


def decode_upkeep(uid: int, raw: bytes) -> dict:
    if len(raw) < 130:
        raise ValueError(f"short upkeep {uid} len={len(raw)}")
    return {
        "id": uid,
        "box_name": base64.b64encode(b"u" + uid.to_bytes(8, "big")).decode("ascii"),
        "creator": encode_address(raw[0:32]),
        "target_app": u64(raw, 32),
        "interval_rounds": u64(raw, 42),
        "next_execution_round": u64(raw, 50),
        "fee_per_execution": u64(raw, 58),
        "balance": u64(raw, 66),
        "times_executed": u64(raw, 74),
        "policy": u64(raw, 82),
        "fee_cap": u64(raw, 90),
        "last_serviced_round": u64(raw, 98),
        "fee_asset": u64(raw, 106),
        "asset_fee": u64(raw, 114),
        "asset_balance": u64(raw, 122),
    }


def list_box_names() -> list[str]:
    names: list[str] = []
    url = f"{INDEXER}/v2/applications/{KEEPER}/boxes"
    for _ in range(20):
        page = get(url)
        for box in page.get("boxes") or []:
            names.append(box["name"])
        token = page.get("next-token")
        if not token:
            break
        url = f"{INDEXER}/v2/applications/{KEEPER}/boxes?next={token}"
    return names


def main() -> None:
    status = get(f"{ALGOD}/v2/status")
    last_round = status["last-round"]
    names = list_box_names()
    upkeeps = []
    for name in names:
        uid = decode_id(name)
        if uid is None:
            continue
        box = get(f"{INDEXER}/v2/applications/{KEEPER}/box?name=b64:{name}")
        raw = base64.b64decode(box["value"])
        upkeeps.append(decode_upkeep(uid, raw))
    upkeeps.sort(key=lambda u: u["id"])
    snapshot = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "network": "testnet",
        "keeper_app": KEEPER,
        "last_round": last_round,
        "indexer": INDEXER,
        "algod": ALGOD,
        "upkeeps": upkeeps,
    }
    OUT.write_text(json.dumps(snapshot, indent=2) + "\n")
    print(f"wrote {OUT} upkeeps={len(upkeeps)} last_round={last_round}")


if __name__ == "__main__":
    main()
