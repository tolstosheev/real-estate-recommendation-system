#!/bin/bash

# Configuration
BASE_URL="http://localhost:8000"
EMAIL="curl_test@example.com"
PASSWORD="curl_password123"

echo "--- Starting API Verification ---"

# 1. Register
echo "Registering user..."
REG_RES=$(curl -s -X POST "$BASE_URL/auth/register" \
     -H "Content-Type: application/json" \
     -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\", \"full_name\": \"Curl Tester\"}")
echo "Response: $REG_RES"

# 2. Login
echo "Logging in..."
TOKEN_RES=$(curl -s -X POST "$BASE_URL/auth/token" \
     -H "Content-Type: application/json" \
     -d "{\"username\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
TOKEN=$(echo $TOKEN_RES | grep -oP '(?<="access_token":")[^"]*')
echo "Token: $TOKEN"

if [ -z "$TOKEN" ]; then
    echo "Failed to get token"
    exit 1
fi

HEADERS="Authorization: Bearer $TOKEN"

# 3. Set Preferences
echo "Setting preferences..."
curl -s -X PUT "$BASE_URL/user/preferences" \
     -H "$HEADERS" \
     -H "Content-Type: application/json" \
     -d '{"min_price": 100000, "max_price": 500000, "min_area": 40, "preferred_rooms": [2]}'
echo -e "\n"

# 4. Create Property (Testing Auto-Geocoding)
echo "Creating property with address (Auto-geocoding)..."
PROP_RES=$(curl -s -X POST "$BASE_URL/api/properties/" \
     -H "$HEADERS" \
     -H "Content-Type: application/json" \
     -d '{"title": "Curl Home", "price": 300000, "address": "Moscow, Red Square, 1", "property_type": "Apartment"}')
echo "Response: $PROP_RES"
PROP_ID=$(echo $PROP_RES | grep -oP '(?<="id":")[^"]*')

# 5. Interact (Like)
echo "Liking property..."
curl -s -X POST "$BASE_URL/api/interactions/interact" \
     -H "$HEADERS" \
     -H "Content-Type: application/json" \
     -d "{\"property_id\": \"$PROP_ID\", \"interaction_type\": \"like\"}"
echo -e "\n"

# 6. Get Recommendations
echo "Getting recommendations..."
curl -s -X GET "$BASE_URL/api/recommendations?limit=5" \
     -H "$HEADERS"
echo -e "\n"

# 7. Test BBox search
echo "Testing BBox search..."
curl -s -X GET "$BASE_URL/api/properties/map?min_lat=50&max_lat=60&min_lon=30&max_lon=40" \
     -H "$HEADERS"
echo -e "\n"

echo "--- Verification Complete ---"
