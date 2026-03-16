#!/bin/bash

# Script to add missing NextAuth environment variables to .env file

ENV_FILE=".env"

# Generate a secure random secret (64 characters)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

echo "========================================="
echo "Adding NextAuth Environment Variables"
echo "========================================="

# Check if NEXTAUTH_SECRET already exists
if grep -q "^NEXTAUTH_SECRET=" "$ENV_FILE"; then
    echo "✓ NEXTAUTH_SECRET already exists in .env"
else
    echo "" >> "$ENV_FILE"
    echo "# NextAuth Configuration" >> "$ENV_FILE"
    echo "NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"" >> "$ENV_FILE"
    echo "✓ Added NEXTAUTH_SECRET to .env"
fi

# Check if NEXTAUTH_URL already exists
if grep -q "^NEXTAUTH_URL=" "$ENV_FILE"; then
    echo "✓ NEXTAUTH_URL already exists in .env"
else
    echo "NEXTAUTH_URL=\"http://localhost:3000\"" >> "$ENV_FILE"
    echo "✓ Added NEXTAUTH_URL to .env"
fi

echo ""
echo "========================================="
echo "Done! Please restart your Next.js server:"
echo "  1. Stop the current server (Ctrl+C)"
echo "  2. Run: npm run dev"
echo "========================================="
