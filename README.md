# Bambu P2S stream kit

Everything to stream a Bambu Lab P2S on Twitch: a live print-status overlay for
OBS and a chat bot that answers viewers.

## What's inside

```
.
├── bridge.js         MQTT -> WebSocket bridge (reads the printer over LAN)
├── overlay.html      OBS browser source (progress, layer, ETA, temps)
├── config.js         reads printer settings from .env (safe to commit)
├── .env              printer IP + access code (git-ignored)
├── bot/
│   ├── bot.js        Twitch chat bot answering via `claude -p`
│   └── .env          Twitch bot token (git-ignored)
└── brand/            channel logo (PNG + SVG)
```

## Requirements

- Node.js 20.12+ (Node 22 recommended)
- The printer reachable on your LAN
- OBS
- For the bot: Claude Code installed and logged in, plus a Twitch OAuth token

## First-time setup

```bash
# 1. printer settings
cp .env.example .env            # fill in PRINTER_IP and ACCESS_CODE

# 2. bot settings
cp bot/.env.example bot/.env    # fill in TWITCH_OAUTH_TOKEN

# 3. install everything
npm install
npm --prefix bot install
```

Find the printer IP and access code on the screen: Settings → LAN Only.
Get a Twitch token (scopes `chat:read`, `chat:edit`) at
https://twitchtokengenerator.com — it looks like `oauth:xxxx`.

## Run

Both at once, in one terminal:

```bash
npm start
```

Output is prefixed `[bridge]` (green) and `[bot]` (magenta). A single Ctrl+C
stops both.

Run just one:

```bash
npm run bridge   # print overlay only
npm run bot      # chat bot only
```

Expected on start:

```
[bridge] [ws] overlay server on ws://localhost:7781
[bridge] [mqtt] connected to 192.168.1.155
[bot] [bot] connected to #3dprint33
```

## OBS

- **Print data**: add source → Browser → Local file → `overlay.html`
  (460×240, transparent). Reconnects on its own if the bridge restarts.
- **Camera video**: window-capture Bambu Studio and crop to the video, or pull
  the RTSPS feed (see `go2rtc` note below). Enable **Mode LAN Vue Live** on the
  printer for the video feed.

## Bot usage

Viewers trigger it with `!ask <question>` or by mentioning `@3dprint33`.
It posts a welcome line on connect and a reminder every 10 min when the chat is
active. Tune `COOLDOWN_MS`, `MAX_INFLIGHT`, `REMINDER_MIN` and `SYSTEM_PROMPT`
in `bot/bot.js` (or `REMINDER_MIN` in `bot/.env`).

`claude -p` runs on your Claude Code subscription: a few seconds of latency per
reply, and it counts against your usage limits. For heavy traffic, switch to the
Anthropic API (Haiku).

## Camera video via go2rtc

Window-capturing Bambu Studio freezes when the window loses focus. For a stable
feed independent of any window, relay the printer's RTSPS stream through go2rtc.

Enable **Mode LAN Vue Live** on the printer first, then:

```bash
npm run setup:video     # downloads the go2rtc binary for your Mac
npm run video           # runs go2rtc alone, or use npm start for everything
```

Check the feed at http://localhost:1984, then in OBS add a Media source with
input `rtsp://127.0.0.1:8554/bambu` (uncheck "Local file", enable reconnect).

The `video/go2rtc.yaml` holds the access code and is git-ignored; a
`go2rtc.example.yaml` is versioned.

## Background music

DMCA-safe music streamed by URL, no files or app needed. Add an OBS **Media**
source, uncheck "Local file", and paste a Nightride FM stream into **Input**:

```
https://stream.nightride.fm/chillsynth.mp3   # chill
https://stream.nightride.fm/nightride.mp3    # synthwave
```

Use `.mp3` (OBS reads it reliably; `.m4a` often won't decode). Lower the source
to about -18 dB in the audio mixer to keep it in the background. To hear it
locally: right-click the source → Advanced Audio Properties → Monitor → "Monitor
and Output".

Nightride is stream-safe by design. Other options (Chillhop, StreamBeats) need
downloaded files or an app plus audio routing (BlackHole on Mac).

## Notes

- `.env` and `video/go2rtc.yaml` hold secrets (LAN access code, Twitch token)
  and are git-ignored. Run `git status` before committing to confirm none appear.
