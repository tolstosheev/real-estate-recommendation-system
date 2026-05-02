import asyncio
import httpx
import json

async def verify():
    base_url = "http://backend:8000"
    email = "verify_user@test.com"
    password = "password123"
    
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{base_url}/auth/register", json={"email": email, "password": password, "full_name": "Verify User"})
        print(f"Register status: {res.status_code}")
        
        res = await client.post(f"{base_url}/auth/token", data={"username": email, "password": password})
        print(f"Login status: {res.status_code}")
        if res.status_code != 200:
            print(f"Login failed: {res.text}")
            return
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        res = await client.put(f"{base_url}/user/preferences", json={"min_price": 100000, "max_price": 500000}, headers=headers)
        print(f"Prefs status: {res.status_code}")
        
        res = await client.post(f"{base_url}/api/properties/", json={"title": "Verify House", "price": 300000, "address": "Moscow, Red Square, 1", "property_type": "Apartment"}, headers=headers)
        print(f"Prop status: {res.status_code}")
        if res.status_code == 201:
            prop_id = res.json()["id"]
            res = await client.post(f"{base_url}/api/interactions/interact", json={"property_id": prop_id, "interaction_type": "like"}, headers=headers)
            print(f"Like status: {res.status_code}")
        
        res = await client.get(f"{base_url}/api/recommendations/", headers=headers)
        print(f"Recs status: {res.status_code}")
        
        res = await client.get(f"{base_url}/api/properties/map?min_lat=50&max_lat=60&min_lon=30&max_lon=40", headers=headers)
        print(f"BBox status: {res.status_code}")

if __name__ == "__main__":
    asyncio.run(verify())
