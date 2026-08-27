#!/bin/bash

echo "=========================================="
echo "Khan Traders - Windows Build Script"
echo "=========================================="
echo ""

# Run pre-build checks
echo "Running pre-build validation..."
./pre-build-check.sh

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Pre-build checks failed. Fix errors above."
    exit 1
fi

echo ""
echo "=========================================="
echo "Starting Windows Build..."
echo "=========================================="
echo ""

# Run the build
npm run build:win

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ BUILD SUCCESSFUL!"
    echo "=========================================="
    echo ""
    echo "Output file:"
    ls -lh dist/khan-trader-*-setup.exe
    echo ""
    echo "Next steps:"
    echo "1. Copy dist/khan-trader-1.0.0-setup.exe to Windows laptop"
    echo "2. Run installer on Windows"
    echo "3. Test all features (see BUILD_READY.md)"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "❌ BUILD FAILED"
    echo "=========================================="
    echo ""
    echo "Check errors above. Common issues:"
    echo "- Wine not installed: sudo apt install wine wine32 wine64"
    echo "- TypeScript errors: npm run typecheck"
    echo "- Missing dependencies: npm install"
    echo ""
    exit 1
fi
