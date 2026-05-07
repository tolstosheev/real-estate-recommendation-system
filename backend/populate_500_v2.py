import asyncio
import random
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, select
from geoalchemy2.elements import WKTElement
from app.core.db import engine as db_engine
from app.models.models import User, Property, UserPreference, Interaction
from app.services.geocoding_service import GeocodingService
import time

# Cities with equal distribution: 10 cities x 50 properties = 500
CITIES = {
    "Москва": {
        "streets": ["Тверская улица", "Новый Арбат", "Садовая-Кудринская", "Патриаршие Пруды", "Покровка", 
                    "Ленинградский проспект", "Проспект Мира", "Волгоградский проспект", "Ленинский проспект", "Кутузовский проспект"],
        "districts": ["ЦАО", "САО", "СВАО", "ВАО", "ЮВАО", "ЮАО", "ЮЗАО", "ЗАО", "СЗАО"],
    },
    "Санкт-Петербург": {
        "streets": ["Невский проспект", "Гороховая улица", "Каменноостровский проспект", "Выборгская набережная", 
                    "Московский проспект", "Проспект Энергетиков", "Лиговский проспект", "Малый проспект Васильевского острова"],
        "districts": ["Центральный", "Адмиралтейский", "Василеостровский", "Петроградский", "Выборгский"],
    },
    "Казань": {
        "streets": ["Баумана улица", "Пушкина улица", "Победы проспект", "Петербургская улица", "Гоголя улица"],
        "districts": ["Вахитовский", "Ново-Савиновский", "Московский", "Авиастроительный"],
    },
    "Новосибирск": {
        "streets": ["Красный проспект", "Гоголя улица", "Ленина улица", "Димитрова улица", "Мичурина улица"],
        "districts": ["Центральный", "Октябрьский", "Калининский", "Ленинский"],
    },
    "Екатеринбург": {
        "streets": ["Ленина проспект", "8 Марта улица", "Малышева улица", "Белинского улица", "Шарташская улица"],
        "districts": ["Центр", "Железнодорожный", "Чкаловский", "Орджоникидзевский"],
    },
    "Сочи": {
        "streets": ["Навагинская улица", "Курортный проспект", "Войкова улица", "Горького улица", "Орджоникидзе улица"],
        "districts": ["Центр", "Лазаревское", "Хоста", "Адлер"],
    },
    "Тула": {
        "streets": ["Ленина проспект", "Пролетарская улица", "Советская улица", "Кутузова улица", "Оборонная улица"],
        "districts": ["Центр", "Пролетарский", "Советский", "Приокский"],
    },
    "Нижний Новгород": {
        "streets": ["Большая Покровская улица", "Минина улица", "Ильинская улица", "Горького улица", "Коминтерна улица"],
        "districts": ["Нижегородский", "Советский", "Приокский", "Сормовский"],
    },
    "Ростов-на-Дону": {
        "streets": ["Станиславского улица", "Большая Садовая улица", "Ворошиловский проспект", "Темерницкая улица", "Шаумяна улица"],
        "districts": ["Центральный", "Кировский", "Ленинский", "Октябрьский"],
    },
    "Самара": {
        "streets": ["Куйбышева улица", "Ленина улица", "Молодогвардейская улица", "Чапаевская улица", "Вилоновская улица"],
        "districts": ["Железнодорожный", "Ленинский", "Октябрьский", "Самарский"],
    },
}

PROPERTY_TYPES = ["Apartment", "House", "Studio", "Townhouse"]
PURPOSES = ["sale", "rent"]
REPAIR_TYPES = ["косметический", "дизайнерский", "без ремонта", "евро"]
MATERIALS = ["панель", "кирпич", "монолит", "блок"]
ROOM_TYPES = ["изолированные", "смежные"]
IS_NEW_OPTIONS = ["новостройка", "вторичка"]
BALCONY_OPTIONS = ["есть", "нет"]
PARKING_OPTIONS = ["есть", "нет"]

PROPERTIES_PER_CITY = 50
TOTAL_PROPERTIES = 500

# Reference coordinates for cities (fallback)
CITY_CENTERS = {
    "Москва": (55.7558, 37.6173),
    "Санкт-Петербург": (59.9343, 30.3351),
    "Казань": (55.8304, 49.0661),
    "Новосибирск": (55.0302, 82.9204),
    "Екатеринбург": (56.8389, 60.6030),
    "Сочи": (43.5994, 39.7305),
    "Тула": (54.1961, 37.6182),
    "Нижний Новгород": (56.2965, 44.0058),
    "Ростов-на-Дону": (47.2357, 39.7015),
    "Самара": (53.1959, 50.1002),
}

TITLES = {
    "Studio": ["Уютная студия", "Студия с видом", "Светлая студия", "Студия в центре", "Современная студия"],
    "Apartment": ["Просторная квартира", "Квартира с ремонтом", "Светлая квартира", "Квартира в новостройке", 
                  "Уютная квартира", "Квартира с видом на парк", "Просторная квартира", "Квартира с лоджией"],
    "House": ["Просторный дом", "Дом с участком", "Дом у леса", "Современный дом", "Дом с гаражом", 
              "Загородный дом", "Дом с садом", "Просторный коттедж"],
    "Townhouse": ["Таунхаус в комплексе", "Просторный таунхаус", "Светлый таунхаус", "Таунхаус у парка"],
}

DESCRIPTIONS = [
    "Отличный вариант для проживания. Качественный ремонт, хорошая инфраструктура.",
    "Просторное жилье с современной планировкой. Рядом школы, магазины, парки.",
    "Уютное жилье в тихом районе. Развитая инфраструктура, удобная транспортная доступность.",
    "Светлая квартира с красивым видом. Качественная отделка, встроенная кухня.",
    "Отличный вариант для большой семьи. Просторные комнаты, большая кухня-гостиная.",
]

def get_property_images(prop_type, seed):
    base_url = f"https://placehold.co/600x400/e6e6e6/333333"
    return [
        f"{base_url}?text={prop_type}+1",
        f"{base_url}?text={prop_type}+2",
        f"{base_url}?text={prop_type}+3",
    ]


async def get_coordinates(geocoder, city, street, house_num):
    """Get coordinates using geocoding service with fallback"""
    full_address = f"{city}, {street}, {house_num}"
    
    try:
        coords = await geocoder.get_coords_from_address(full_address)
        if coords:
            lat, lon = coords
            return lat, lon
    except Exception as e:
        print(f"Geocoder error for {full_address}: {e}")
    
    # Fallback to city center with some randomness
    if city in CITY_CENTERS:
        base_lat, base_lon = CITY_CENTERS[city]
        lat = base_lat + random.uniform(-0.02, 0.02)
        lon = base_lon + random.uniform(-0.02, 0.02)
        return lat, lon
    
    return 55.7558, 37.6173  # Default to Moscow


async def generate_property(geocoder, city, city_data, user_id, prop_num):
    """Generate a single property with geocoded coordinates"""
    property_type = random.choice(PROPERTY_TYPES)
    street = random.choice(city_data["streets"])
    house_num = random.randint(1, 150)
    
    # Get coordinates via geocoder
    lat, lon = await get_coordinates(geocoder, city, street, house_num)
    
    rooms = random.randint(1, 5) if property_type != "Studio" else 1
    area = round(random.uniform(30, 120), 1)
    sq_living = round(area * 0.7, 1)
    sq_kitchen = round(random.uniform(6, 15), 1)
    
    purpose = random.choice(PURPOSES)
    price = round(random.uniform(2000000, 30000000), 2) if purpose == "sale" else round(random.uniform(15000, 80000), 2)
    
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": f"{random.choice(TITLES[property_type])} в {city}",
        "city": city,
        "description": random.choice(DESCRIPTIONS),
        "price": price,
        "rooms": rooms,
        "area": area,
        "floor": random.randint(1, 25),
        "total_floors": random.randint(5, 30),
        "property_type": property_type,
        "property_purpose": purpose,
        "category": f"{rooms}-к квартира" if rooms > 1 else "Студия",
        "address": f"{city}, {street}, {house_num}",
        "district": random.choice(city_data["districts"]),
        "metro": f"Метро {random.choice(['Северная', 'Южная', 'Центральная', 'Восточная', 'Западная'])}" if random.random() > 0.3 else None,
        "location": f"SRID=4326;POINT({lon} {lat})",
        "images": get_property_images(property_type, prop_num),
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
    """Main population function"""
    async with db_engine.begin() as conn:
        # Check if we have a user, create if not
        result = await conn.execute(text("SELECT id FROM users LIMIT 1"))
        user = result.first()
        
        if user:
            user_id = str(user[0])
            print(f"Using existing user: {user_id}")
        else:
            # Create a test user
            user_id = str(uuid.uuid4())
            await conn.execute(
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
            print(f"Created test user: {user_id}")
    
    # Create async session for property creation
    async_session = sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    geocoder = GeocodingService()
    
    properties = []
    prop_num = 0
    
    print(f"Generating {TOTAL_PROPERTIES} properties ({PROPERTIES_PER_CITY} per city)...")
    
    for city, city_data in CITIES.items():
        print(f"\nGenerating properties for {city}...")
        for i in range(PROPERTIES_PER_CITY):
            prop = await generate_property(geocoder, city, city_data, user_id, prop_num)
            properties.append(prop)
            prop_num += 1
            
            if (i + 1) % 10 == 0:
                print(f"  Generated {i + 1}/{PROPERTIES_PER_CITY} for {city}")
            
            # Small delay to avoid API rate limits
            if (prop_num % 20 == 0):
                await asyncio.sleep(0.5)
    
    # Shuffle to mix cities
    random.shuffle(properties)
    
    print(f"\nInserting {len(properties)} properties into database...")
    
    # Batch insert
    async with async_session() as session:
        batch_size = 50
        for i in range(0, len(properties), batch_size):
            batch = properties[i : i + batch_size]
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
            print(f"Inserted {min(i + batch_size, len(properties))}/{len(properties)}")
    
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
