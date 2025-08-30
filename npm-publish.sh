#!/bin/bash

echo "🔐 Getting OTP from 1Password for npm publishing..."

# Check if 1Password CLI is available
if ! command -v op &> /dev/null; then
    echo "❌ 1Password CLI not found"
    echo "💡 Install with: brew install 1password-cli"
    exit 1
fi

# Try to get OTP from common npm item names
NPM_ITEMS=("NPM" "npmjs.com" "npm registry" "npm" "npmjs")

OTP=""
ITEM_FOUND=""

for item in "${NPM_ITEMS[@]}"; do
    echo "🔍 Trying to find '$item' in 1Password..."
    
    if op item get "$item" --otp 2>/dev/null; then
        OTP=$(op item get "$item" --otp 2>/dev/null)
        if [ -n "$OTP" ]; then
            ITEM_FOUND="$item"
            break
        fi
    fi
done

# If no standard names work, show available items
if [ -z "$OTP" ]; then
    echo "❌ Could not find npm OTP in 1Password"
    echo "📋 Available items (check for npm-related entries):"
    op item list 2>/dev/null | head -10 || echo "   (Need to sign in to 1Password first)"
    echo ""
    echo "💡 Manual options:"
    echo "   1. Sign in: eval \$(op signin)"
    echo "   2. Find item: op item list | grep -i npm" 
    echo "   3. Get OTP: op item get \"ITEM_NAME\" --otp"
    echo "   4. Publish: npm publish --otp=XXXXXX"
    exit 1
fi

echo "✅ Found OTP from 1Password item: '$ITEM_FOUND'"
echo "📦 Publishing @aigentics/agent-toolkit@$(node -p "require('./package.json').version") to npm..."

# Publish with OTP from 1Password
npm publish --otp=$OTP

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Successfully published to npm!"
    echo "🌍 Package is now available worldwide via NPX"
    echo ""
    echo "✅ Test it globally:"
    echo "   npx @aigentics/agent-toolkit claude-flow-hooks status"
    echo "   npx @aigentics/agent-toolkit claude-flow-hooks smart-fix --enhanced"
    echo "   npx @aigentics/agent-toolkit claude-flow-hooks restore-mcp"
else
    echo "❌ NPM publish failed"
    exit 1
fi