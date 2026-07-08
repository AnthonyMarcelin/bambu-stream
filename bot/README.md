# 3DPrint33 chat bot

Listens to the Twitch chat and answers viewers using `claude -p` (your Claude
Code subscription, no API key needed).

## How it triggers

- A viewer types `!ask <question>`, or
- A viewer mentions the bot: `@3dprint33 <question>`

Per-user cooldown (15s) and a concurrency cap keep it from hammering your quota.

## Requirements

- Node.js 20.12+
- Claude Code installed and logged in on this Mac (`claude` must run in a terminal)
- A Twitch OAuth token for the bot account

## Setup

1. Get an OAuth token at https://twitchtokengenerator.com (scopes: chat:read,
   chat:edit). It looks like `oauth:xxxx`.
2. `cp .env.example .env` and fill in `TWITCH_OAUTH_TOKEN`.
3. Install and run:

```bash
npm install
node bot.js
```

You should see `[bot] connected to #3dprint33`. Type `!ask coucou` in your chat
to test.

## Notes

- `claude -p` spawns the CLI per message: expect a few seconds of latency, and
  it draws on your Claude Code usage limits. For heavy traffic, switch to the
  Anthropic API (Haiku) instead.
- Tune `COOLDOWN_MS`, `MAX_INFLIGHT`, and `SYSTEM_PROMPT` at the top of bot.js.
