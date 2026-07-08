import mqtt from "mqtt";
import { WebSocketServer } from "ws";
import { config } from "./config.js";

// Latest known printer state, pushed to every connected overlay.
const state = {
  connected: false,
  gcodeState: null, // RUNNING | PAUSE | FINISH | IDLE | ...
  fileName: null,
  progress: 0, // percent
  layer: 0,
  totalLayers: 0,
  remainingMin: 0,
  nozzleTemp: 0,
  nozzleTarget: 0,
  bedTemp: 0,
  bedTarget: 0,
};

// --- WebSocket server: feeds the OBS browser-source overlay ---
const wss = new WebSocketServer({ port: config.wsPort });
wss.on("connection", (socket) => {
  socket.send(JSON.stringify(state));
});

function broadcast() {
  const payload = JSON.stringify(state);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
}

console.log(`[ws] overlay server on ws://localhost:${config.wsPort}`);

// --- MQTT client: reads the printer over the LAN ---
const client = mqtt.connect(`mqtts://${config.printerIp}:8883`, {
  username: "bblp",
  password: config.accessCode,
  rejectUnauthorized: false, // Bambu uses a self-signed certificate
  reconnectPeriod: 3000,
});

let serial = null;

client.on("connect", () => {
  console.log(`[mqtt] connected to ${config.printerIp}`);
  state.connected = true;
  client.subscribe("device/+/report");
  broadcast();
});

client.on("error", (err) => {
  console.error(`[mqtt] error: ${err.message}`);
});

client.on("close", () => {
  console.log("[mqtt] connection closed, retrying...");
  state.connected = false;
  broadcast();
});

client.on("message", (topic, buffer) => {
  // Discover the serial from the topic, then ask once for a full state dump.
  if (!serial) {
    const match = topic.match(/^device\/(.+)\/report$/);
    if (match) {
      serial = match[1];
      console.log(`[mqtt] printer serial: ${serial}`);
      client.publish(
        `device/${serial}/request`,
        JSON.stringify({ pushing: { sequence_id: "0", command: "pushall" } })
      );
    }
  }

  let msg;
  try {
    msg = JSON.parse(buffer.toString());
  } catch {
    return;
  }

  const p = msg.print;
  if (!p) return;

  if (p.gcode_state !== undefined) state.gcodeState = p.gcode_state;
  if (p.subtask_name !== undefined) state.fileName = p.subtask_name;
  if (p.mc_percent !== undefined) state.progress = p.mc_percent;
  if (p.layer_num !== undefined) state.layer = p.layer_num;
  if (p.total_layer_num !== undefined) state.totalLayers = p.total_layer_num;
  if (p.mc_remaining_time !== undefined) state.remainingMin = p.mc_remaining_time;
  if (p.nozzle_temper !== undefined) state.nozzleTemp = p.nozzle_temper;
  if (p.nozzle_target_temper !== undefined) state.nozzleTarget = p.nozzle_target_temper;
  if (p.bed_temper !== undefined) state.bedTemp = p.bed_temper;
  if (p.bed_target_temper !== undefined) state.bedTarget = p.bed_target_temper;

  broadcast();

  // Console heartbeat so you can see data flowing during the first test.
  console.log(
    `[state] ${state.gcodeState ?? "-"} | ${state.progress}% | ` +
      `layer ${state.layer}/${state.totalLayers} | ${state.remainingMin}min left`
  );
});
