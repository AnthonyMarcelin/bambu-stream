import tmi from "tmi.js";
import { execFile } from "node:child_process";

try {
  process.loadEnvFile();
} catch {
  // No .env, or Node < 20.12: fall back to the current environment.
}

const {
  TWITCH_BOT_USERNAME,
  TWITCH_OAUTH_TOKEN,
  TWITCH_CHANNEL,
  CLAUDE_MODEL,
  REMINDER_MIN,
} = process.env;

if (!TWITCH_BOT_USERNAME || !TWITCH_OAUTH_TOKEN || !TWITCH_CHANNEL) {
  throw new Error(
    "Missing Twitch settings. Copy .env.example to .env and fill it in."
  );
}

const SYSTEM_PROMPT = [
  "Tu es le bot de chat de la chaine Twitch 3DPrint33, qui diffuse une imprimante 3D Bambu Lab en direct.",
  "Reponds en francais, ton direct et drole, 1 a 2 phrases maximum.",
  "Pas de markdown, pas de listes, pas de sauts de ligne. Reste correct, jamais insultant.",
].join(" ");

const COOLDOWN_MS = 15000; // per-user rate limit
const MAX_INFLIGHT = 2; // cap concurrent claude calls to protect your quota
const REMINDER_MS = (Number(REMINDER_MIN) || 10) * 60 * 1000;

// Rotated so Twitch never sees the exact same line twice in a row.
const REMINDERS = [
  "Pour me parler: tape !ask suivi de ta question, ou mentionne @3dprint33 .",
  "Une question sur le print ? !ask <ta question> et je reponds.",
  "Psst, tu peux me parler avec !ask <ta question> ou @3dprint33 .",
];

const lastAsk = new Map();
let inflight = 0;
let messagesSinceReminder = 0;
let reminderIndex = 0;

const client = new tmi.Client({
  connection: { reconnect: true, secure: true },
  identity: { username: TWITCH_BOT_USERNAME, password: TWITCH_OAUTH_TOKEN },
  channels: [TWITCH_CHANNEL],
});

client.on("connected", () => {
  console.log(`[bot] connected to #${TWITCH_CHANNEL}`);
  // Only remind when the chat has been active, to avoid talking to an empty room.
  setInterval(() => {
    if (messagesSinceReminder === 0) return;
    const msg = REMINDERS[reminderIndex % REMINDERS.length];
    reminderIndex++;
    messagesSinceReminder = 0;
    client.say(`#${TWITCH_CHANNEL}`, msg);
  }, REMINDER_MS);
});
client.connect().catch((e) => console.error(`[bot] connect failed: ${e}`));

function askClaude(question) {
  return new Promise((resolve, reject) => {
    const args = ["-p", question, "--append-system-prompt", SYSTEM_PROMPT, "--max-turns", "1"];
    if (CLAUDE_MODEL) args.push("--model", CLAUDE_MODEL);
    execFile("claude", args, { timeout: 30000, maxBuffer: 1 << 20 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

function cleanReply(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, 450); // Twitch caps at 500 chars
}

client.on("message", async (channel, tags, message, self) => {
  if (self) return;
  messagesSinceReminder++;

  const botName = TWITCH_BOT_USERNAME.toLowerCase();
  const lower = message.toLowerCase();
  let question = null;

  if (lower.startsWith("!ask ")) {
    question = message.slice(5).trim();
  } else if (lower.includes(`@${botName}`)) {
    question = message.replace(new RegExp(`@${botName}`, "ig"), "").trim();
  }
  if (!question) return;

  const user = tags["user-id"] || tags.username;
  const now = Date.now();
  if (now - (lastAsk.get(user) || 0) < COOLDOWN_MS) return;
  if (inflight >= MAX_INFLIGHT) return;

  lastAsk.set(user, now);
  inflight++;
  try {
    const reply = cleanReply(await askClaude(question));
    if (reply) client.say(channel, `@${tags.username} ${reply}`);
  } catch (e) {
    console.error(`[bot] claude error: ${e.message}`);
  } finally {
    inflight--;
  }
});
