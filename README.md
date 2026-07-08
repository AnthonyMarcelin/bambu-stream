# Bambu P2S → OBS overlay

Live print-status overlay for streaming a Bambu Lab P2S. A small Node bridge
reads the printer over MQTT (LAN) and pushes state to a browser-source overlay
in OBS.

## Requirements

- Node.js 20.12+ (`node -v`; install from https://nodejs.org if missing)
- The printer reachable on your LAN
- OBS

## Setup

```bash
cp .env.example .env   # then fill in PRINTER_IP and ACCESS_CODE
npm install
node bridge.js
```

Find the IP and access code on the printer: Screen → Settings → LAN Only.

Expected output:

```
[ws] overlay server on ws://localhost:7781
[mqtt] connected to 192.168.1.155
[mqtt] printer serial: ...
[state] RUNNING | 30% | layer 12/61 | 86min left
```

Leave this terminal running while you stream.

## OBS

1. Add source → **Browser**.
2. Check **Local file**, pick `overlay.html`.
3. Width `460`, height `240`, transparent background (already handled).

The overlay reconnects on its own if you restart the bridge.

## Files

- `bridge.js` — MQTT → WebSocket bridge
- `overlay.html` — OBS browser source
- `config.js` — reads settings from `.env` (safe to commit)
- `.env` — your printer IP + access code (git-ignored, never commit)

## Notes

- Camera video is separate: use Bambu Studio's virtual camera or the RTSPS
  stream as another OBS source. Enable **Mode LAN Vue Live** on the printer.

## Next

- Twitch last-sub / last-follow: StreamElements widgets on top, or the
  Twitch API wired into the overlay.
- Chat bot answering viewers: separate tmi.js + LLM script.
