import asyncio
import random
import uuid
from decimal import Decimal
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import engine, Base
from app.models.models import User, Property, UserPreference, Interaction
from app.services.auth_service import AuthService
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_GeomFromText

async def populate():
    async with AsyncSession(engine) as session:
        async with session.begin():
            await session.execute(text("TRUNCATE users, properties, user_preferences, interactions CASCADE"))
        
        auth_service = AuthService(session)
        
        users_data = [
            {"email": "budget_seeker@example.com", "name": "Alex Budget", "phone": "+79001111111", "tg": "@budget_alex"},
            {"email": "luxury_lover@example.com", "name": "Bella Luxury", "phone": "+79002222222", "tg": "@bella_lux"},
            {"email": "family_man@example.com", "name": "Charlie Family", "phone": "+79003333333", "tg": "@charlie_fam"},
            {"email": "student_life@example.com", "name": "Dana Student", "phone": "+79004444444", "tg": "@dana_stud"},
            {"email": "investor@example.com", "name": "Edward Investor", "phone": "+79005555555", "tg": "@ed_invest"},
            {"email": "city_girl@example.com", "name": "Fiona City", "phone": "+79006666666", "tg": "@fiona_city"},
            {"email": "nature_fan@example.com", "name": "George Nature", "phone": "+79007777777", "tg": "@geo_nature"},
            {"email": "minimalist@example.com", "name": "Hannah Mini", "phone": "+79008888888", "tg": "@hannah_mini"},
        ]
        
        created_user_ids = []
        for u in users_data:
            user = await auth_service.register_user(
                email=u["email"],
                password="Password123!",
                full_name=u["name"],
                phone_number=u["phone"],
                telegram_handle=u["tg"]
            )
            created_user_ids.append(user.id)
            print(f"Created user: {u['email']}")
        
        await session.commit()

        property_images = {
            "Apartment": [
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
                "https://images.unsplash.com/photo-1493809842364-78817add7//", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
                "https://images.unsplash.com/photo-1484154218962-a7575a6767a1", "https://images.unsplash.com/photo-1493809842364-78817add7",
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2"
            ],
            "House": [
                "https://images.unsplash.com/photo-1580587771525-7847574c7bc1", "https://images.unsplash.com/photo-1518780664697-55e3ad937233",
                "https://images.unsplash.com/photo-1568605114967-8130f3a36994", "https://images.unsplash.com/photo-15701294774//",
                "https://images.unsplash.com/photo-1572120339551-8b5bb6750717", "https://images.unsplash.com/photo-1564013799919-ab600027ffc6",
                "https://images.unsplash.com/photo-15701294774", "https://images.unsplash.com/photo-1580587771525-7847574c7bc1"
            ],
            "Villa": [
                "https://images.unsplash.com/photo-1613490493576-7fde63acd811", "https://images.unsplash.com/photo-1580587771525-7847574c7bc1",
                "https://images.unsplash.com/photo-1613977257363-707ba9348267", "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c", "https://images.unsplash.com/photo-1600596542815-5b5bc57ca031",
                "https://images.unsplash.com/photo-1613490493576-7fde63acd811", "https://images.unsplash.com/photo-1613977257363-707ba9348267"
            ],
            "Studio": [
                "https://images.unsplash.com/photo-1536376074476-760a60a1252d", "https://images.unsplash.com/photo-1536376074476-760a60a1252d",
                "https://images.unsplash.com/photo-1505691938895-1758d7feb511", "https://images.unsplash.com/photo-1493809842364-78817add7",
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267", "https://images.unsplash.com/photo-1536376074476-760a60a1252d",
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688", "https://images.unsplash.com/photo-1536376074476-760a60a1252d"
            ],
        }
        
        properties_data = []
        for i in range(200):
            p_type = random.choice(list(property_images.keys()))
            
            if p_type == "Studio":
                price = random.randint(30000, 300000)
                area = random.randint(15, 40)
                rooms = 1
            elif p_type == "Apartment":
                price = random.randint(150000, 15000000)
                area = random.randint(30, 150)
                rooms = random.randint(1, 4)
            elif p_type == "House":
                price = random.randint(500000, 50000000)
                area = random.randint(80, 500)
                rooms = random.randint(3, 8)
            elif p_type == "Villa":
                price = random.randint(10000000, 200000000)
                area = random.randint(200, 1500)
                rooms = random.randint(5, 15)
            
            lat = 55.75 + random.uniform(-0.3, 0.3)
            lon = 37.61 + random.uniform(-0.3, 0.3)
            
            p_id = uuid.uuid4()
            
            pool = property_images[p_type]
            num_images = random.randint(3, 5)
            images = random.sample(pool, k=min(num_images, len(pool)))

            properties_data.append({
                "id": p_id,
                "user_id": random.choice(created_user_ids),
                "title": f"{p_type} {i+1}",
                "description": f"Stunning {p_type} with {rooms} rooms and {area} sqm. Perfect for living in Moscow.",
                "price": Decimal(price),
                "rooms": rooms,
                "area": Decimal(area),
                "property_type": p_type,
                "address": f"Street {i+1}, Moscow",
                "location": ST_GeomFromText(f"POINT({lon} {lat})", 4326),
                "images": images
            })
        
        for p_data in properties_data:
            prop = Property(**p_data)
            session.add(prop)
        
        await session.commit()
        print(f"Created {len(properties_data)} properties")

        prefs = [
            (created_user_ids[0], Decimal('30000'), Decimal('300000'), Decimal('20')),
            (created_user_ids[1], Decimal('5000000'), Decimal('100000000'), Decimal('150')),
            (created_user_ids[2], Decimal('200000'), Decimal('10000000'), Decimal('80')),
            (created_user_ids[3], Decimal('20000'), Decimal('200000'), Decimal('15')),
            (created_user_ids[4], Decimal('1000000'), Decimal('50000000'), Decimal('100')),
            (created_user_ids[5], Decimal('100000'), Decimal('2000000'), Decimal('40')),
            (created_user_ids[6], Decimal('500000'), Decimal('100000000'), Decimal('200')),
            (created_user_ids[7], Decimal('30000'), Decimal('150000'), Decimal('10')),
        ]
        
        for user_id, min_p, max_p, min_a in prefs:
            pref = UserPreference(
                user_id=user_id,
                min_price=min_p,
                max_price=max_p,
                min_area=min_a
            )
            session.add(pref)
        
        await session.commit()
        print("Preferences populated")

        for p_data in properties_data:
            if p_data["price"] < 300000:
                session.add(Interaction(user_id=created_user_ids[0], property_id=p_data["id"], interaction_type="like"))
            elif p_data["price"] > 5000000:
                session.add(Interaction(user_id=created_user_ids[0], property_id=p_data["id"], interaction_type="dislike"))
            
            if p_data["price"] > 5000000:
                session.add(Interaction(user_id=created_user_ids[1], property_id=p_data["id"], interaction_type="like"))
            
            if p_data["rooms"] >= 3 and p_data["area"] > 100:
                session.add(Interaction(user_id=created_user_ids[2], property_id=p_data["id"], interaction_type="like"))

        await session.commit()
        print("Interactions populated")

if __name__ == "__main__":
    asyncio.run(populate())
