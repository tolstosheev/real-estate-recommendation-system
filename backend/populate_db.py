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

        property_types = {
            "Apartment": ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688"],
            "House": ["https://images.unsplash.com/photo-1580587771525-7847574c7bc1", "https://images.unsplash.com/photo-1518780664697-55e3ad937233"],
            "Villa": ["https://images.unsplash.com/photo-1613490493576-7fde63acd811", "https://images.unsplash.com/photo-1580587771525-7847574c7bc1"],
            "Studio": ["https://images.unsplash.com/photo-1536376074476-760a60a1252d", "https://images.unsplash.com/photo-1536376074476-760a60a1252d"],
        }
        
        properties_data = []
        for i in range(50):
            p_type = random.choice(list(property_types.keys()))
            price = random.randint(50000, 10000000) if p_type != "Studio" else random.randint(30000, 300000)
            area = random.randint(20, 500)
            rooms = random.randint(1, 6) if p_type != "Studio" else 1
            
            lat = 55.75 + random.uniform(-0.1, 0.1)
            lon = 37.61 + random.uniform(-0.1, 0.1)
            
            p_id = uuid.uuid4()
            properties_data.append({
                "id": p_id,
                "user_id": random.choice(created_user_ids),
                "title": f"{p_type} {i+1}",
                "description": f"Beautiful {p_type} located in a great area. Area: {area} sqm.",
                "price": Decimal(price),
                "rooms": rooms,
                "area": Decimal(area),
                "property_type": p_type,
                "address": f"Street {i+1}, Moscow",
                "location": ST_GeomFromText(f"POINT({lon} {lat})", 4326),
                "images": random.sample(property_types[p_type], k=1) if len(property_types[p_type]) > 0 else []
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
                interaction = Interaction(
                    user_id=created_user_ids[0],
                    property_id=p_data["id"],
                    interaction_type="like"
                )
                session.add(interaction)
            elif p_data["price"] > 5000000:
                interaction = Interaction(
                    user_id=created_user_ids[0],
                    property_id=p_data["id"],
                    interaction_type="dislike"
                )
                session.add(interaction)

        for p_data in properties_data:
            if p_data["price"] > 5000000:
                interaction = Interaction(
                    user_id=created_user_ids[1],
                    property_id=p_data["id"],
                    interaction_type="like"
                )
                session.add(interaction)
        
        await session.commit()
        print("Interactions populated")

if __name__ == "__main__":
    asyncio.run(populate())
