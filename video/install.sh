#!/usr/bin/env bash
# Downloads the go2rtc binary for this Mac into video/go2rtc.
set -euo pipefail
cd "$(dirname "$0")"

case "$(uname -m)" in
  arm64|aarch64) ASSET="go2rtc_mac_arm64.zip" ;;
  x86_64)        ASSET="go2rtc_mac_amd64.zip" ;;
  *) echo "Unsupported arch: $(uname -m)"; exit 1 ;;
esac

echo "Downloading $ASSET ..."
curl -fsSL -o go2rtc.zip \
  "https://github.com/AlexxIT/go2rtc/releases/latest/download/$ASSET"

bin="$(unzip -Z1 go2rtc.zip | head -1)"
unzip -o go2rtc.zip >/dev/null
mv -f "$bin" go2rtc
chmod +x go2rtc
rm -f go2rtc.zip

echo "Done. Binary at video/go2rtc"
echo "Run it with: npm run video   (or npm start for everything)"
