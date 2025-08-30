# 🔐 1Password CLI OTP Setup for NPM Publishing

## 🎯 **Automatic OTP Retrieval from 1Password**

### **1️⃣ Setup 1Password CLI (Already Installed ✅)**

```bash
# Verify installation
op --version  # ✅ 2.32.0 installed

# Sign in to 1Password (first time)
op signin

# Or if already configured
eval $(op signin)
```

### **2️⃣ Find Your NPM OTP Entry in 1Password**

```bash
# List items to find your npm entry
op item list | grep -i npm

# Or search for npm/npmjs items
op item list --categories "Login,Password" | grep -i npm
```

### **3️⃣ Get OTP Token Reference**

```bash
# Get the item details to find the OTP field reference
op item get "NPM" --format json

# Look for the TOTP field, usually something like:
# "id": "TOTP_abc123...", "label": "one-time password"
```

### **4️⃣ Create Automated NPM Publish Script**

```bash
# Create publish script with automatic OTP
cat > npm-publish.sh << 'EOF'
#!/bin/bash

echo "🔐 Getting OTP from 1Password..."

# Get OTP from 1Password (replace "NPM" with your actual item name/ID)
OTP=$(op item get "NPM" --otp)

if [ -z "$OTP" ]; then
    echo "❌ Failed to get OTP from 1Password"
    echo "💡 Make sure you're signed in: eval \$(op signin)"
    exit 1
fi

echo "📦 Publishing to npm with OTP..."
npm publish --otp=$OTP

if [ $? -eq 0 ]; then
    echo "✅ Successfully published to npm!"
    echo "🌍 Package is now available via NPX worldwide"
else
    echo "❌ NPM publish failed"
    exit 1
fi
EOF

chmod +x npm-publish.sh
```

### **5️⃣ Alternative: Direct Command Usage**

```bash
# One-liner for quick publishing
npm publish --otp=$(op item get "NPM" --otp)

# Or with error handling
OTP=$(op item get "NPM" --otp) && npm publish --otp=$OTP
```

## 🔧 **Common 1Password Item References**

### **By Item Name**
```bash
# If your npm item is named "NPM"
op item get "NPM" --otp

# If it's named "npmjs.com" 
op item get "npmjs.com" --otp

# If it's named "npm registry"
op item get "npm registry" --otp
```

### **By Item UUID (More Reliable)**
```bash
# Get the UUID first
op item list | grep -i npm

# Then use UUID (more reliable than name)
op item get "uuid-here" --otp
```

### **By Vault (If Multiple Vaults)**
```bash
# Specify vault if you have multiple
op item get "NPM" --vault="Personal" --otp
op item get "NPM" --vault="Work" --otp
```

## 🚀 **Complete Publishing Workflow**

### **Option 1: Automated Script (Recommended)**
```bash
# Run the automated script
./npm-publish.sh

# Expected output:
# 🔐 Getting OTP from 1Password...
# 📦 Publishing to npm with OTP...
# ✅ Successfully published to npm!
```

### **Option 2: Manual Command**
```bash
# Get OTP and publish in one command
npm publish --otp=$(op item get "NPM" --otp)
```

### **Option 3: Two-Step Process**
```bash
# Step 1: Get OTP
op item get "NPM" --otp

# Step 2: Use the 6-digit code
npm publish --otp=123456
```

## 🛠 **Troubleshooting**

### **"Command failed" or "Item not found"**
```bash
# List all items to find correct name
op item list

# Search for npm-related items
op item list | grep -i npm
op item list | grep -i registry
```

### **"Not signed in"**
```bash
# Sign in again
eval $(op signin)

# Or sign in to specific account
eval $(op signin your-account.1password.com)
```

### **"OTP field not found"**
```bash
# Check item structure
op item get "NPM" --format json | jq '.fields[]'

# Look for TOTP or one-time password field
op item get "NPM" --format json | jq '.fields[] | select(.label | test("password|otp|totp"; "i"))'
```

## 🎯 **For This Package (v0.0.12)**

```bash
# Publish the enhanced claude-flow-agent-toolkit
npm publish --otp=$(op item get "NPM" --otp)

# Then test globally
npx @aigentics/agent-toolkit claude-flow-hooks smart-fix --enhanced
```

## 💡 **Security Benefits**

- **No manual typing**: Eliminates typos in OTP codes
- **Automatic expiry**: Uses fresh OTP each time
- **Secure storage**: OTP secrets stay in 1Password vault
- **Audit trail**: 1Password tracks when OTP was accessed

---

**Ready to publish with automatic OTP retrieval!** 🚀