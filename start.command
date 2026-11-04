#!/bin/bash
cd "$(dirname "$0")"

PORT=8550

echo "========================================================"
echo "🏡 NestQuest AI — Property Hunter for Emma & Jordan"
echo "========================================================"

# Free port if previously used
lsof -ti :$PORT | xargs kill -9 2>/dev/null

echo "🚀 Starting server on http://localhost:$PORT ..."
python3 backend/server.py $PORT &
SERVER_PID=$!

sleep 1

# Open in default browser (Chrome / Safari)
if command -v open > /dev/null; then
    open "http://localhost:$PORT"
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "192.168.1.30")
echo "✨ Browser opened to http://localhost:$PORT"
echo "📱 Open on Jordan & Emma's Phones: http://$LOCAL_IP:$PORT"
fi

echo "🟢 App is running! Press Ctrl+C in this window to stop."
echo "💡 (You can also open 'app/index.html' directly in your browser anytime)"
echo "========================================================"

trap "kill $SERVER_PID 2>/dev/null; exit 0" SIGINT SIGTERM EXIT
wait $SERVER_PID
