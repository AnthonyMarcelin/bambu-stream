// Loads printer settings from a local .env file (see .env.example).
// This file is safe to commit: no secrets live here.
try {
  process.loadEnvFile();
} catch {
  // No .env file, or Node < 20.12: fall back to the current environment.
}

const { PRINTER_IP, ACCESS_CODE, WS_PORT } = process.env;

if (!PRINTER_IP || !ACCESS_CODE) {
  throw new Error(
    "Missing PRINTER_IP or ACCESS_CODE. Copy .env.example to .env and fill it in."
  );
}

export const config = {
  printerIp: PRINTER_IP,
  accessCode: ACCESS_CODE,
  wsPort: Number(WS_PORT) || 7781,
};
