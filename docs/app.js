/* ARRIVALS — TestNet Arcron keeper board. Read-only. No wallet. */
(() => {
  const KEEPER = 769891898;
  const INDEXER = "https://testnet-idx.algonode.cloud";
  const ALGOD = "https://testnet-api.algonode.cloud";
  const EXPLORER = "https://testnet.explorer.perawallet.app/application/";
  const REFRESH_MS = 30000;
  const ROUND_SEC = 2.8;

  const PUBLIC_NAMES = {
    769891898: "keeper",
    769891902: "pulse",
    770130162: "rain",
  };

  const MASK = (1n << 64n) - 1n;
  const rotr = (x, n) => ((x >> BigInt(n)) | (x << (64n - BigInt(n)))) & MASK;
  const K512 = [
    0x428a2f98d728ae22n, 0x7137449123ef65cdn, 0xb5c0fbcfec4d3b2fn, 0xe9b5dba58189dbbcn,
    0x3956c25bf348b538n, 0x59f111f1b605d019n, 0x923f82a4af194f9bn, 0xab1c5ed5da6d8118n,
    0xd807aa98a3030242n, 0x12835b0145706fben, 0x243185be4ee4b28cn, 0x550c7dc3d5ffb4e2n,
    0x72be5d74f27b896fn, 0x80deb1fe3b1696b1n, 0x9bdc06a725c71235n, 0xc19bf174cf692694n,
    0xe49b69c19ef14ad2n, 0xefbe4786384f25e3n, 0x0fc19dc68b8cd5b5n, 0x240ca1cc77ac9c65n,
    0x2de92c6f592b0275n, 0x4a7484aa6ea6e483n, 0x5cb0a9dcbd41fbd4n, 0x76f988da831153b5n,
    0x983e5152ee66dfabn, 0xa831c66d2db43210n, 0xb00327c898fb213fn, 0xbf597fc7beef0ee4n,
    0xc6e00bf33da88fc2n, 0xd5a79147930aa725n, 0x06ca6351e003826fn, 0x142929670a0e6e70n,
    0x27b70a8546d22ffcn, 0x2e1b21385c26c926n, 0x4d2c6dfc5ac42aedn, 0x53380d139d95b3dfn,
    0x650a73548baf63den, 0x766a0abb3c77b2a8n, 0x81c2c92e47edaee6n, 0x92722c851482353bn,
    0xa2bfe8a14cf10364n, 0xa81a664bbc423001n, 0xc24b8b70d0f89791n, 0xc76c51a30654be30n,
    0xd192e819d6ef5218n, 0xd69906245565a910n, 0xf40e35855771202an, 0x106aa07032bbd1b8n,
    0x19a4c116b8d2d0c8n, 0x1e376c085141ab53n, 0x2748774cdf8eeb99n, 0x34b0bcb5e19b48a8n,
    0x391c0cb3c5c95a63n, 0x4ed8aa4ae3418acbn, 0x5b9cca4f7763e373n, 0x682e6ff3d6b2b8a3n,
    0x748f82ee5defb2fcn, 0x78a5636f43172f60n, 0x84c87814a1f0ab72n, 0x8cc702081a6439ecn,
    0x90befffa23631e28n, 0xa4506cebde82bde9n, 0xbef9a3f7b2c67915n, 0xc67178f2e372532bn,
    0xca273eceea26619cn, 0xd186b8c721c0c207n, 0xeada7dd6cde0eb1en, 0xf57d4f7fee6ed178n,
    0x06f067aa72176fban, 0x0a637dc5a2c898a6n, 0x113f9804bef90daen, 0x1b710b35131c471bn,
    0x28db77f523047d84n, 0x32caab7b40c72493n, 0x3c9ebe0a15c9bebcn, 0x431d67c49c100d4cn,
    0x4cc5d4becb3e42b6n, 0x597f299cfc657e2an, 0x5fcb6fab3ad6faecn, 0x6c44198c4a475817n,
  ];
  const IV512_256 = [
    0x22312194fc2bf72cn, 0x9f555fa3c84c64c2n, 0x2393b86b6f53b151n, 0x963877195940eabdn,
    0x96283ee2a88effe3n, 0xbe5e1e2553863992n, 0x2b0199fc2c85b8aan, 0x0eb72ddc81c52ca2n,
  ];

  function sha512_256(bytes) {
    const bitLen = BigInt(bytes.length) * 8n;
    const withOne = new Uint8Array(bytes.length + 1);
    withOne.set(bytes);
    withOne[bytes.length] = 0x80;
    const pad = (128 - ((withOne.length + 16) % 128)) % 128;
    const msg = new Uint8Array(withOne.length + pad + 16);
    msg.set(withOne);
    const view = new DataView(msg.buffer);
    view.setUint32(msg.length - 8, Number((bitLen >> 32n) & 0xffffffffn));
    view.setUint32(msg.length - 4, Number(bitLen & 0xffffffffn));
    let H = IV512_256.slice();
    for (let off = 0; off < msg.length; off += 128) {
      const W = new Array(80);
      for (let t = 0; t < 16; t++) {
        const i = off + t * 8;
        W[t] = (BigInt(view.getUint32(i)) << 32n) | BigInt(view.getUint32(i + 4));
      }
      for (let t = 16; t < 80; t++) {
        const s0 = rotr(W[t - 15], 1) ^ rotr(W[t - 15], 8) ^ (W[t - 15] >> 7n);
        const s1 = rotr(W[t - 2], 19) ^ rotr(W[t - 2], 61) ^ (W[t - 2] >> 6n);
        W[t] = (W[t - 16] + s0 + W[t - 7] + s1) & MASK;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let t = 0; t < 80; t++) {
        const S1 = rotr(e, 14) ^ rotr(e, 18) ^ rotr(e, 41);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K512[t] + W[t]) & MASK;
        const S0 = rotr(a, 28) ^ rotr(a, 34) ^ rotr(a, 39);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) & MASK;
        h = g; g = f; f = e; e = (d + t1) & MASK;
        d = c; c = b; b = a; a = (t1 + t2) & MASK;
      }
      H = [a, b, c, d, e, f, g, h].map((x, i) => (x + H[i]) & MASK);
    }
    const out = new Uint8Array(32);
    const dv = new DataView(out.buffer);
    for (let i = 0; i < 4; i++) {
      dv.setUint32(i * 8, Number(H[i] >> 32n));
      dv.setUint32(i * 8 + 4, Number(H[i] & 0xffffffffn));
    }
    return out;
  }

  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  function encodeAddress(pk) {
    const digest = sha512_256(pk);
    const data = new Uint8Array(36);
    data.set(pk);
    data.set(digest.subarray(digest.length - 4), 32);
    let bits = 0, acc = 0, out = "";
    for (const byte of data) {
      acc = (acc << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        out += B32[(acc >> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits) out += B32[(acc << (5 - bits)) & 31];
    return out;
  }

  function b64ToBytes(b64) {
    const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function u64(dv, off) {
    return dv.getUint32(off) * 0x100000000 + dv.getUint32(off + 4);
  }

  function boxIdFromName(b64name) {
    const raw = b64ToBytes(b64name);
    if (raw.length < 9 || raw[0] !== 117) return null;
    const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    return u64(dv, 1);
  }

  function decodeUpkeep(id, bytes) {
    if (bytes.length < 130) throw new Error("short upkeep " + id);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      id,
      creator: encodeAddress(bytes.subarray(0, 32)),
      target_app: u64(dv, 32),
      call_args_offset: dv.getUint16(40),
      interval_rounds: u64(dv, 42),
      next_execution_round: u64(dv, 50),
      fee_per_execution: u64(dv, 58),
      balance: u64(dv, 66),
      times_executed: u64(dv, 74),
      policy: u64(dv, 82),
      fee_cap: u64(dv, 90),
      last_serviced_round: u64(dv, 98),
      fee_asset: u64(dv, 106),
      asset_fee: u64(dv, 114),
      asset_balance: u64(dv, 122),
    };
  }

  function statusOf(u, round) {
    if (u.balance < u.fee_per_execution) return "GROUNDED";
    if (round > u.next_execution_round) return "DELAYED";
    return "ON TIME";
  }

  function appName(id, extra) {
    if (extra && extra[id]) return extra[id];
    if (PUBLIC_NAMES[id]) return PUBLIC_NAMES[id].toUpperCase();
    return String(id);
  }

  function algo(micro) {
    return (micro / 1e6).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  }

  function waitLabel(u, round) {
    const delta = u.next_execution_round - round;
    if (u.balance < u.fee_per_execution) return "NO FUEL";
    if (delta >= 0) {
      const sec = delta * ROUND_SEC;
      if (sec < 90) return delta + "r";
      if (sec < 3600) return "~" + Math.round(sec / 60) + "m";
      return "~" + (sec / 3600).toFixed(1) + "h";
    }
    const late = -delta;
    const sec = late * ROUND_SEC;
    if (sec < 3600) return "LATE " + Math.round(sec / 60) + "m";
    return "LATE " + (sec / 3600).toFixed(1) + "h";
  }

  function intervalLabel(rounds) {
    const sec = rounds * ROUND_SEC;
    if (sec < 90) return rounds + "r";
    if (sec < 3600) return rounds + "r ~" + Math.round(sec / 60) + "m";
    return rounds + "r ~" + (sec / 3600).toFixed(1) + "h";
  }

  function policyLabel(p) {
    if (p === 0) return "CATCH UP";
    if (p === 1) return "SKIP AHD";
    return "POL " + p;
  }

  function flaps(text, size) {
    const wrap = document.createElement("span");
    wrap.className = "flaps";
    wrap.style.fontSize = size || "";
    const s = String(text);
    for (let i = 0; i < s.length; i++) {
      const cell = document.createElement("span");
      cell.className = "flap";
      cell.style.setProperty("--d", (i * 28) + "ms");
      cell.textContent = s[i] === " " ? "\u00a0" : s[i];
      wrap.appendChild(cell);
    }
    return wrap;
  }

  let extraNames = {};
  let sortMode = "eta";
  let lastFrame = { upkeeps: [], last_round: 0, mode: "unknown", note: "" };

  async function fetchJson(url) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(url + " " + res.status);
    return res.json();
  }

  async function loadOptionalNames() {
    try {
      const data = await fetchJson("names.json");
      const map = {};
      if (data && typeof data === "object") {
        const src = data.apps || data.names || data;
        for (const [k, v] of Object.entries(src)) {
          const id = Number(k);
          if (Number.isFinite(id) && typeof v === "string") map[id] = v;
        }
      }
      extraNames = map;
    } catch {
      extraNames = {};
    }
  }

  async function listBoxes() {
    const boxes = [];
    let url = INDEXER + "/v2/applications/" + KEEPER + "/boxes";
    for (let i = 0; i < 20; i++) {
      const page = await fetchJson(url);
      for (const b of page.boxes || []) {
        const name = typeof b.name === "string" ? b.name : b.name;
        boxes.push(name);
      }
      if (!page["next-token"]) break;
      url = INDEXER + "/v2/applications/" + KEEPER + "/boxes?next=" + encodeURIComponent(page["next-token"]);
    }
    return boxes;
  }

  async function fetchLive() {
    const status = await fetchJson(ALGOD + "/v2/status");
    const last_round = status["last-round"];
    const names = await listBoxes();
    const upkeeps = await Promise.all(names.map(async (name) => {
      const id = boxIdFromName(name);
      if (id == null) return null;
      const box = await fetchJson(INDEXER + "/v2/applications/" + KEEPER + "/box?name=b64:" + encodeURIComponent(name));
      const raw = b64ToBytes(box.value);
      return decodeUpkeep(id, raw);
    }));
    return {
      last_round,
      upkeeps: upkeeps.filter(Boolean),
      mode: "live",
      note: "indexer " + INDEXER.replace("https://", "") + " · algod last-round",
    };
  }

  async function fetchSnapshot() {
    const snap = await fetchJson("snapshot.json");
    return {
      last_round: snap.last_round,
      upkeeps: snap.upkeeps || [],
      mode: "fallback",
      note: "snapshot " + (snap.generated_at || "") + " · live fetch failed",
      generated_at: snap.generated_at,
    };
  }

  function sortUpkeeps(list, round) {
    const copy = list.slice();
    const rank = (u) => {
      const s = statusOf(u, round);
      return s === "DELAYED" ? 0 : s === "GROUNDED" ? 1 : 2;
    };
    if (sortMode === "status") {
      copy.sort((a, b) => rank(a) - rank(b) || a.id - b.id);
    } else if (sortMode === "flt") {
      copy.sort((a, b) => a.id - b.id);
    } else {
      copy.sort((a, b) => a.next_execution_round - b.next_execution_round || a.id - b.id);
    }
    return copy;
  }

  function setMode(mode, note) {
    const el = document.getElementById("feed-mode");
    el.textContent = mode === "live" ? "LIVE" : mode === "fallback" ? "SNAPSHOT" : "SEEKING";
    el.className = "mode " + (mode === "live" ? "live" : mode === "fallback" ? "fallback" : "unknown");
    document.getElementById("feed-note").textContent = note || "";
  }

  function render(frame) {
    lastFrame = frame;
    const round = frame.last_round;
    document.getElementById("round-digits").textContent = String(round);
    const rows = sortUpkeeps(frame.upkeeps, round);
    let nOn = 0, nDelay = 0, nGround = 0;
    for (const u of frame.upkeeps) {
      const s = statusOf(u, round);
      if (s === "ON TIME") nOn++;
      else if (s === "DELAYED") nDelay++;
      else nGround++;
    }
    document.getElementById("n-ontime").textContent = String(nOn);
    document.getElementById("n-delayed").textContent = String(nDelay);
    document.getElementById("n-grounded").textContent = String(nGround);
    document.getElementById("n-total").textContent = String(frame.upkeeps.length);
    setMode(frame.mode, frame.note);

    const board = document.getElementById("board");
    board.replaceChildren();
    document.getElementById("empty").classList.toggle("hidden", rows.length > 0);

    rows.forEach((u, idx) => {
      const st = statusOf(u, round);
      const stClass = st === "ON TIME" ? "ontime" : st === "DELAYED" ? "delayed" : "grounded";
      const dest = appName(u.target_app, extraNames);
      const row = document.createElement("div");
      row.className = "row";
      row.setAttribute("role", "row");
      row.style.setProperty("--row", String(idx));

      const flt = document.createElement("div");
      flt.appendChild(flaps(String(u.id).padStart(3, "0"), "20px"));

      const destCell = document.createElement("div");
      const destA = document.createElement("a");
      destA.className = "dest-link";
      destA.href = EXPLORER + u.target_app;
      destA.title = "app " + u.target_app + " · " + u.creator;
      destA.appendChild(flaps(dest.slice(0, 12).toUpperCase(), "18px"));
      destCell.appendChild(destA);
      const sub = document.createElement("div");
      sub.className = "tiny";
      sub.textContent = PUBLIC_NAMES[u.target_app] ? String(u.target_app) : "app " + u.target_app;
      destCell.appendChild(sub);

      const eta = document.createElement("div");
      eta.className = "crt-num";
      eta.textContent = String(u.next_execution_round);

      const wait = document.createElement("div");
      wait.className = "crt-num";
      wait.textContent = waitLabel(u, round);

      const intv = document.createElement("div");
      intv.className = "crt-num";
      intv.title = u.interval_rounds + " rounds";
      intv.textContent = intervalLabel(u.interval_rounds);

      const runs = document.createElement("div");
      runs.className = "crt-num";
      runs.textContent = String(u.times_executed);

      const bag = document.createElement("div");
      bag.className = "crt-num";
      bag.title = u.balance + " µALGO · fee " + u.fee_per_execution;
      bag.textContent = algo(u.balance);

      const pol = document.createElement("div");
      pol.className = "tiny";
      pol.textContent = policyLabel(u.policy);

      const tag = document.createElement("div");
      tag.className = "status-tag " + stClass;
      tag.textContent = st;

      row.append(flt, destCell, eta, wait, intv, runs, bag, pol, tag);
      board.appendChild(row);
    });

    const stamp = document.getElementById("stamp");
    const when = frame.generated_at ? " snapshot " + frame.generated_at : " painted " + new Date().toISOString();
    stamp.textContent = "Arcron is unaudited. TestNet only. last-round " + round + " · " + when + " · chain is source of truth.";
  }

  async function tick() {
    try {
      const live = await fetchLive();
      render(live);
    } catch (err) {
      console.warn("live indexer failed, using snapshot", err);
      try {
        const snap = await fetchSnapshot();
        render(snap);
      } catch (err2) {
        setMode("unknown", "live and snapshot both failed");
        console.error(err2);
      }
    }
  }

  document.querySelectorAll(".sorts button").forEach((btn) => {
    btn.addEventListener("click", () => {
      sortMode = btn.getAttribute("data-sort");
      document.querySelectorAll(".sorts button").forEach((b) => b.classList.toggle("active", b === btn));
      render(lastFrame);
    });
  });

  loadOptionalNames().finally(tick);
  setInterval(tick, REFRESH_MS);
})();
