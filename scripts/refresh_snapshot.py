#!/usr/bin/env python3
"""Pull TestNet keeper boxes and rewrite docs/snapshot.json. No secrets."""
from __future__ import annotations

import base64
import hashlib
import json
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

KEEPER = 769891898
RAIN_HUB = 770130162
INDEXER = "https://testnet-idx.algonode.cloud"
ALGOD = "https://testnet-api.algonode.cloud"
UA = {"User-Agent": "corvid-agent-arrivals-snapshot/1.0"}
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "snapshot.json"
HEAD = 130
# Public overlay only. Never invent names. Never label 81 Vigil.
PUBLIC_APPS = {769891898: "keeper", 769891902: "pulse", 770130162: "rain"}


def get(url: str) -> dict:
    req = urllib.request.Request(url, headers=UA)
    last = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except Exception as exc:
            last = exc
            time.sleep(0.4 * (attempt + 1))
    raise last


def encode_address(pk: bytes) -> str:
    checksum = hashlib.new("sha512_256", pk).digest()[-4:]
    return base64.b32encode(pk + checksum).decode("ascii").rstrip("=")


def u64(raw: bytes, off: int) -> int:
    return int.from_bytes(raw[off : off + 8], "big")


def u16(raw: bytes, off: int) -> int:
    return int.from_bytes(raw[off : off + 2], "big")


def decode_id(b64name: str) -> int | None:
    raw = base64.b64decode(b64name)
    if len(raw) < 9 or raw[0:1] != b"u":
        return None
    return int.from_bytes(raw[1:9], "big")


def rain_id(b64name: str) -> int | None:
    raw = base64.b64decode(b64name)
    if len(raw) != 9 or raw[0:1] != b"r":
        return None
    return int.from_bytes(raw[1:9], "big")


def decode_upkeep(uid: int, raw: bytes) -> dict:
    if len(raw) < HEAD:
        raise ValueError(f"short upkeep {uid} len={len(raw)}")
    tail = u16(raw, 40)
    if tail != HEAD:
        raise ValueError(f"upkeep {uid} raw[40:42]={tail} != {HEAD}")
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


def rain_label(raw: bytes) -> str:
    chunk = raw[64:96]
    end = chunk.find(b"\x00")
    if end == -1:
        end = len(chunk)
    return chunk[:end].decode("ascii", "replace").strip()


def decode_rain(rid: int, raw: bytes) -> dict:
    if len(raw) < 224:
        raise ValueError(f"short rain {rid} len={len(raw)}")
    name = rain_label(raw) or f"rain {rid}"
    return {
        "id": rid,
        "name": name,
        "prize_asset": u64(raw, 96),
        "drip": u64(raw, 104),
        "interval_rounds": u64(raw, 112),
        "last_rain_round": u64(raw, 120),
        "pot": u64(raw, 128),
        "tickets": u64(raw, 136),
        "draw_id": u64(raw, 144),
        "mode": u64(raw, 160),
        "wave_cap": u64(raw, 168),
        "commit_round": u64(raw, 208),
        "prize_locked": u64(raw, 216),
    }


def list_box_names(app: int) -> list[str]:
    names: list[str] = []
    url = f"{INDEXER}/v2/applications/{app}/boxes"
    for _ in range(20):
        page = get(url)
        for box in page.get("boxes") or []:
            names.append(box["name"])
        token = page.get("next-token")
        if not token:
            break
        url = f"{INDEXER}/v2/applications/{app}/boxes?next={token}"
    return names


def hub_state(app_json: dict) -> dict:
    params = (app_json.get("application") or {}).get("params") or app_json.get("params") or {}
    state = {}
    for kv in params.get("global-state") or []:
        key = base64.b64decode(kv["key"]).decode("ascii", "replace")
        val = kv.get("value") or {}
        if val.get("type") == 2:
            state[key] = val.get("uint", 0)
    return state


def main() -> None:
    status = get(f"{ALGOD}/v2/status")
    last_round = status["last-round"]
    names = list_box_names(KEEPER)
    upkeeps = []
    skipped = []
    for name in names:
        uid = decode_id(name)
        if uid is None:
            continue
        box = get(f"{INDEXER}/v2/applications/{KEEPER}/box?name=b64:{name}")
        raw = base64.b64decode(box["value"])
        try:
            rec = decode_upkeep(uid, raw)
        except ValueError as exc:
            skipped.append(str(exc))
            continue
        upkeeps.append(rec)
    upkeeps.sort(key=lambda u: u["id"])

    rain_app = get(f"{INDEXER}/v2/applications/{RAIN_HUB}")
    hs = hub_state(rain_app)
    next_id = int(hs.get("next_rain_id") or 0)
    rains = []
    for rid in range(1, next_id + 1):
        name = base64.b64encode(b"r" + rid.to_bytes(8, "big")).decode("ascii")
        box = get(f"{INDEXER}/v2/applications/{RAIN_HUB}/box?name=b64:{name}")
        raw = base64.b64decode(box["value"])
        rains.append(decode_rain(rid, raw))

    snapshot = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "network": "testnet",
        "keeper_app": KEEPER,
        "last_round": last_round,
        "indexer": INDEXER,
        "algod": ALGOD,
        "upkeeps": upkeeps,
        "rain": {
            "hub": {
                "cursor": hs.get("cursor", 0),
                "bootstrapped": hs.get("bootstrapped", 0),
                "next_rain_id": hs.get("next_rain_id", 0),
            },
            "rains": rains,
        },
    }
    OUT.write_text(json.dumps(snapshot, indent=2) + "\n")
    ids = [u["id"] for u in upkeeps]
    print(f"wrote {OUT} upkeeps={len(upkeeps)} ids={ids} last_round={last_round} rains={len(rains)}")
    if skipped:
        print("skipped:", "; ".join(skipped))
    named = [PUBLIC_APPS.get(u["target_app"], str(u["target_app"])) for u in upkeeps]
    print("target labels (public overlay only):", named)


if __name__ == "__main__":
    main()
