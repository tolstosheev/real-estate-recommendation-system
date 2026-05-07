import asyncio
import random
from uuid import uuid4
from datetime import datetime, timezone
from geoalchemy2 import Geography
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

import os

# Database URL - use environment variable or default for Docker
db_url = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/nestai_db")
# Ensure we're using asyncpg driver
if "+asyncpg" not in db_url:
    DATABASE_URL = db_url.replace("postgresql://", "postgresql+asyncpg://")
else:
    DATABASE_URL = db_url

# Cities with equal distribution: 10 cities x 50 properties = 500
CITIES = {
    "Москва": {"lat_range": (55.55, 55.95), "lon_range": (37.35, 37.85), "streets": ["Тверская", "Арбат", "Садовая", "Ленинградский проспект", "Проспект Мира"]},
    "Санкт-Петербург": {"lat_range": (59.85, 60.05), "lon_range": (30.15, 30.55), "streets": ["Невский проспект", "Лиговский проспект", "Московский проспект", "Каменноостровский проспект", "Гороховая улица"]},
    "Казань": {"lat_range": (55.75, 55.85), "lon_range": (49.05, 49.25), "streets": ["Баумана", "Пушкина", "Тукая", "Гоголя", "Карла Маркса"]},
    "Новосибирск": {"lat_range": (54.95, 55.05), "lon_range": (82.85, 83.15), "streets": ["Красный проспект", "Димитрова", "Гоголя", "Ленина", "Мичурина"]},
    "Екатеринбург": {"lat_range": (56.75, 56.85), "lon_range": (60.55, 60.75), "streets": ["Ленина", "8 Марта", "Малышева", "Белинского", "Шарташская"]},
    "Сочи": {"lat_range": (43.55, 43.65), "lon_range": (39.70, 39.80), "streets": ["Навагинская", "Курортный проспект", "Войкова", "Горького", "Орджоникидзе"]},
    "Тула": {"lat_range": (54.15, 54.25), "lon_range": (37.45, 37.65), "streets": ["Ленина", "Пролетарская", "Советская", "Кутузова", "Оборонная"]},
    "Нижний Новгород": {"lat_range": (56.25, 56.35), "lon_range": (43.85, 44.15), "streets": ["Большая Покровская", "Минина", "Ильинская", "Горького", "Коминтерна"]},
    "Ростов-на-Дону": {"lat_range": (47.20, 47.30), "lon_range": (39.55, 39.75), "streets": ["Станиславского", "Большая Садовая", "Ворошиловский проспект", "Темерницкая", "Шаумяна"]},
    "Самара": {"lat_range": (53.15, 53.25), "lon_range": (50.05, 50.25), "streets": ["Куйбышева", "Ленина", "Молодогвардейская", "Чапаевская", "Вилоновская"]},
}

PROPERTY_TYPES = ["Apartment", "House", "Studio", "Townhouse"]
PURPOSES = ["sale", "rent"]
REPAIR_TYPES = ["косметический", "дизайнерский", "без ремонта", "евро"]
MATERIALS = ["панель", "кирпич", "монолит", "блок"]
ROOM_TYPES = ["изолированные", "смежные"]
IS_NEW_OPTIONS = ["новостройка", "вторичка"]
BALCONY_OPTIONS = ["есть", "нет"]
PARKING_OPTIONS = ["есть", "нет"]

# Equal distribution: 500 / 10 cities = 50 per city
PROPERTIES_PER_CITY = 50
TOTAL_PROPERTIES = 500


def generate_property(city_name, city_data, user_id):
    lat = random.uniform(*city_data["lat_range"])
    lon = random.uniform(*city_data["lon_range"])
    street = random.choice(city_data["streets"])
    house_num = random.randint(1, 100)

    property_type = random.choice(PROPERTY_TYPES)
    rooms = random.randint(1, 5) if property_type != "Studio" else 1
    area = round(random.uniform(30, 120), 1)
    sq_living = round(area * 0.7, 1)
    sq_kitchen = round(random.uniform(6, 15), 1)

    return {
        "id": str(uuid()),
        "user_id": user_id,
        "title": f"{property_type} in {city_name}, {street}",
        "city": city_name,
        "description": f"Beautiful {property_type.lower()} for {'sale' if random.choice(PURPOSES) == 'sale' else 'rent'}",
        "price": round(random.uniform(2000000, 30000000), 2) if random.choice(PURPOSES) == "sale" else round(random.uniform(15000, 80000), 2),
        "rooms": rooms,
        "area": area,
        "floor": random.randint(1, 25),
        "total_floors": random.randint(5, 30),
        "property_type": property_type,
        "property_purpose": random.choice(PURPOSES),
        "category": f"{rooms}-к квартира" if rooms > 0 else "Студия",
        "address": f"{city_name}, {street}, {house_num}",
        "district": f"Район {random.randint(1, 10)}",
        "metro": f"Метро {random.choice(['Северная', 'Южная', 'Центральная', 'Восточная', 'Западная'])}" if random.random() > 0.3 else None,
        "location": f"SRID=4326;POINT({lon} {lat})",
        "images": [f"https://example.com/property_{random.randint(1000, 9999)}.jpg"],
        "sq_living": sq_living,
        "sq_kitchen": sq_kitchen,
        "build_year": random.randint(1970, 2024),
        "material": random.choice(MATERIALS),
        "repair_type": random.choice(REPAIR_TYPES),
        "room_type": random.choice(ROOM_TYPES),
        "is_new": random.choice(IS_NEW_OPTIONS),
        "balcony": random.choice(BALCONY_OPTIONS),
        "parking": random.choice(PARKING_OPTIONS),
        "views_count": random.randint(0, 500),
        "likes_count": random.randint(0, 100),
        "created_at": datetime.now(timezone.utc),
    }


async def populate():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Use a test user ID (you may need to create a user first)
    test_user_id = str(uuid())

    # Create test user if not exists
    async with async_session() as session:
        # Check if test user exists
        result = await session.execute(text("SELECT id FROM users LIMIT 1"))
        user = result.first()

        if user:
            user_id = str(user[0])
            print(f"Using existing user: {user_id}")
        else:
            # Create a test user
            user_id = test_user_id
            await session.execute(
                text(
                    "INSERT INTO users (id, email, hashed_password, full_name, phone_number) "
                    "VALUES (:id, :email, :pwd, :name, :phone)"
                ),
                {
                    "id": user_id,
                    "email": "test@example.com",
                    "pwd": "hashed_password_here",
                    "name": "Test User",
                    "phone": "+79001234567",
                },
            )
            await session.commit()
            print(f"Created test user: {user_id}")

        # Generate and insert properties
        properties = []
        for city_name, city_data in CITIES.items():
            for _ in range(PROPERTIES_PER_CITY):
                prop = generate_property(city_name, city_data, user_id)
                properties.append(prop)

        # Shuffle to mix cities
        random.shuffle(properties)

        print(f"Inserting {len(properties)} properties...")

        # Batch insert
        for i in range(0, len(properties), 50):
            batch = properties[i : i + 50]
            await session.execute(
                text(
                    """
                    INSERT INTO properties (
                        id, user_id, title, city, description, price, rooms, area,
                        floor, total_floors, property_type, property_purpose, category,
                        address, district, metro, location, images, sq_living, sq_kitchen,
                        build_year, material, repair_type, room_type, is_new, balcony, parking,
                        views_count, likes_count, created_at
                    ) VALUES (
                        :id, :user_id, :title, :city, :description, :price, :rooms, :area,
                        :floor, :total_floors, :property_type, :property_purpose, :category,
                        :address, :district, :metro, ST_GeomFromText(:location, 4326), :images, :sq_living, :sq_kitchen,
                        :build_year, :material, :repair_type, :room_type, :is_new, :balcony, :parking,
                        :views_count, :likes_count, :created_at
                    )
                    """
                ),
                batch,
            )
            await session.commit()
            print(f"Inserted {min(i + 50, len(properties))}/{len(properties)}")

        # Save city data for reference
        cities_file = "populated_cities.txt"
        with open(cities_file, "w", encoding="utf-8") as f:
            f.write("Populated Cities (50 properties each):\n")
            f.write("=" * 40 + "\n")
            for city in CITIES.keys():
                f.write(f"- {city}\n")
            f.write(f"\nTotal: {TOTAL_PROPERTIES} properties\n")
            f.write(f"User ID: {user_id}\n")

        print(f"\nDone! Data saved to {cities_file}")
        print(f"Total properties: {TOTAL_PROPERTIES}")
        print(f"Properties per city: {PROPERTIES_PER_CITY}")


if __name__ == "__main__":
    asyncio.run(populate())
