#!/bin/bash

echo "=========================================="
echo "Khan Traders - Pre-Build Validation"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Check 1: Wine installation
echo -n "Checking Wine installation... "
if command -v wine &> /dev/null; then
    WINE_VERSION=$(wine --version)
    echo -e "${GREEN}✓${NC} Wine installed: $WINE_VERSION"
else
    echo -e "${RED}✗${NC} Wine not found!"
    echo "  Install: sudo apt install wine wine32 wine64"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: Icon files
echo -n "Checking icon files... "
if [ -f "build/icon.ico" ] && [ -f "build/icon.png" ] && [ -f "build/icon.icns" ]; then
    echo -e "${GREEN}✓${NC} All icon files present"
else
    echo -e "${RED}✗${NC} Missing icon files!"
    ls -la build/icon.* 2>/dev/null || echo "  No icon files found in build/"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: Node modules
echo -n "Checking node_modules... "
if [ -d "node_modules" ] && [ -d "node_modules/electron-builder" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${RED}✗${NC} Dependencies missing!"
    echo "  Run: npm install"
    ERRORS=$((ERRORS + 1))
fi

# Check 4: Config file
echo -n "Checking electron-builder.yml... "
if [ -f "electron-builder.yml" ]; then
    if grep -q "Saad Afridi" electron-builder.yml; then
        echo -e "${GREEN}✓${NC} Config valid with publisher name"
    else
        echo -e "${YELLOW}⚠${NC} Config exists but publisher name not found"
    fi
else
    echo -e "${RED}✗${NC} electron-builder.yml not found!"
    ERRORS=$((ERRORS + 1))
fi

# Check 5: Clean database script
echo -n "Checking clean-db script... "
if [ -f "clean-db-for-production.js" ]; then
    echo -e "${GREEN}✓${NC} Clean script present"
else
    echo -e "${YELLOW}⚠${NC} clean-db-for-production.js not found"
fi

# Check 6: TypeScript compilation
echo -n "Checking TypeScript... "
if npm run typecheck &> /dev/null; then
    echo -e "${GREEN}✓${NC} No TypeScript errors"
else
    echo -e "${YELLOW}⚠${NC} TypeScript errors present (will try to build anyway)"
fi

# Check 7: Disk space
echo -n "Checking disk space... "
FREE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$FREE_SPACE" -gt 2 ]; then
    echo -e "${GREEN}✓${NC} Sufficient disk space (${FREE_SPACE}GB free)"
else
    echo -e "${RED}✗${NC} Low disk space (${FREE_SPACE}GB free)!"
    echo "  Need at least 2GB for build"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to build.${NC}"
    echo ""
    echo "Run: npm run build:win"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found. Fix them before building.${NC}"
    exit 1
fi
