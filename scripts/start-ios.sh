#!/usr/bin/env bash
# Healory on iOS Simulator — dedicated Metro from THIS repo (not kspeaker on :8081).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

METRO_PORT="${METRO_PORT:-8081}"
SIMULATOR_NAME="${SIMULATOR_NAME:-iPhone 17 Pro}"

if [[ ! -f .env ]]; then
  cp .env.local.example .env
fi

free_port() {
  local port=$1
  if lsof -i :"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Stopping process on port ${port}..."
    lsof -ti :"${port}" | xargs kill -9 2>/dev/null || true
    sleep 2
  fi
}

# Default 8081 is often occupied by another Expo app (e.g. kspeaker) — free it for Healory.
free_port "${METRO_PORT}"

echo "Starting Metro for $(basename "$ROOT") on http://127.0.0.1:${METRO_PORT} ..."
EXPO_NO_INTERACTIVE=1 npx expo start --port "${METRO_PORT}" --localhost --clear &
METRO_PID=$!
# Keep Metro running after install — only stop on Ctrl+C in this terminal.
cleanup_metro() {
  echo ""
  echo "Stopping Metro (PID ${METRO_PID})..."
  kill "${METRO_PID}" 2>/dev/null || true
}
trap cleanup_metro INT TERM

for i in {1..90}; do
  if curl -sf "http://127.0.0.1:${METRO_PORT}/status" >/dev/null 2>&1; then
    echo "Metro ready."
    break
  fi
  sleep 1
done

echo "Installing on ${SIMULATOR_NAME}..."
xcrun simctl uninstall booted com.healory.healthtour 2>/dev/null || true
xcrun simctl uninstall booted com.myapp 2>/dev/null || true

EXPO_NO_INTERACTIVE=1 \
REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 \
RCT_METRO_PORT="${METRO_PORT}" \
npx expo run:ios --device "${SIMULATOR_NAME}" --no-bundler

echo ""
echo "Healory is running."
echo "  Metro:  http://127.0.0.1:${METRO_PORT} (PID ${METRO_PID})"
echo "  API:    start in another terminal: npm run server:dev"
echo "  Stop Metro: kill ${METRO_PID}"
# Re-open app with correct deep link (after Info.plist scheme fix).
xcrun simctl openurl booted "healory://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A${METRO_PORT}" 2>/dev/null || true
