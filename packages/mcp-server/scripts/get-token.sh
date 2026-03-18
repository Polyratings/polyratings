#!/usr/bin/env bash
#
# Authenticate against the Polyratings backend and print a JWT.
#
# Usage:
#   ./scripts/get-token.sh
#
# The printed token can be set as POLYRATINGS_ADMIN_TOKEN in your
# .cursor/mcp.json (or exported in your shell) to give the MCP server
# admin access.

set -euo pipefail

BACKEND_URL="${POLYRATINGS_BACKEND_URL:-https://api-prod.polyratings.org}"

if [[ $# -ne 0 ]]; then
    echo "This script no longer accepts positional credentials for security reasons." >&2
    echo "Run without arguments and enter credentials at the prompt." >&2
    exit 1
fi

read -rp "Username: " USERNAME
read -rsp "Password: " PASSWORD
echo

RESPONSE=$(curl -s -X POST "${BACKEND_URL}/auth.login" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg username "${USERNAME}" --arg password "${PASSWORD}" \
        '{ username: $username, password: $password }')")

# tRPC wraps the result in {"result":{"data":"<jwt>"}}
TOKEN=$(echo "$RESPONSE" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['result']['data'])" 2>/dev/null)

if [[ -z "$TOKEN" ]]; then
    echo "Login failed. Response from backend:" >&2
    echo "$RESPONSE" >&2
    exit 1
fi

echo ""
echo "Token (expires in 2 hours):"
echo "$TOKEN"
echo ""
echo "To use with Cursor, add to .cursor/mcp.json:"
echo "  \"POLYRATINGS_ADMIN_TOKEN\": \"$TOKEN\""
