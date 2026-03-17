#!/bin/bash
# Quick setup and test script

cd /Users/luzbel/repos/vidGen2

echo "🔨 Rebuilding TypeScript with updated timeouts..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful"
echo ""
echo "📋 Available tests:"
echo "   1. python3 diagnostic_test.py      - Quick all-in-one test"
echo "   2. python3 test_steps.py           - Step-by-step interactive test"
echo "   3. python3 create_full_video.py    - Full pipeline (60+ minutes)"
echo ""
echo "For detailed documentation, see: TESTING.md"
