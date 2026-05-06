import asyncio
import random
import uuid
from decimal import Decimal
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import engine, Base
from app.models.models import User, Property, UserPreference, Interaction
from app.services.auth_service import AuthService
from app.services.geocoding_service import GeocodingService
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_GeomFromText
import time
import httpx

# Realistic addresses for Russian cities
MOSCOW_ADDRESSES = [
    ("Moscow", "Tverskaya St", 10, "Apartment"),
    ("Moscow", "Novy Arbat St", 20, "Apartment"),
    ("Moscow", "Sadovaya-Kudrinskaya St", 15, "Apartment"),
    ("Moscow", "Patriarshiye Prudy", 5, "Apartment"),
    ("Moscow", "Pokrovka St", 12, "Apartment"),
    ("Moscow", "Leningradsky Prospekt", 30, "Apartment"),
    ("Moscow", "Prospekt Mira", 50, "Apartment"),
    ("Moscow", "Volgogradsky Prospekt", 45, "Apartment"),
    ("Moscow", "Leninsky Prospekt", 42, "Apartment"),
    ("Moscow", "Kutuzovsky Prospekt", 18, "Apartment"),
    ("Moscow", "Kommunarka", 4, "House"),
    ("Moscow", "Troitsk", 3, "House"),
]

SPB_ADDRESSES = [
    ("Saint Petersburg", "Nevsky Prospekt", 25, "Apartment"),
    ("Saint Petersburg", "Gorokhovaya St", 18, "Apartment"),
    ("Saint Petersburg", "Kamennoostrovsky Prospekt", 22, "Apartment"),
    ("Saint Petersburg", "Vyborgskaya Embankment", 30, "Apartment"),
    ("Saint Petersburg", "Moskovsky Prospekt", 40, "Apartment"),
    ("Saint Petersburg", "Prospekt Energovikov", 15, "Apartment"),
]

KAZAN_ADDRESSES = [
    ("Kazan", "Baumana St", 20, "Apartment"),
    ("Kazan", "Pushkina St", 15, "Apartment"),
    ("Kazan", "Pobedy Prospekt", 30, "Apartment"),
    ("Kazan", "Peterburgskaya St", 12, "Apartment"),
]

NOVOSIBIRSK_ADDRESSES = [
    ("Novosibirsk", "Krasny Prospekt", 35, "Apartment"),
    ("Novosibirsk", "Gogolya St", 20, "Apartment"),
    ("Novosibirsk", "Lenina St", 25, "Apartment"),
]

EKATERINBURG_ADDRESSES = [
    ("Yekaterinburg", "Lenina Prospekt", 30, "Apartment"),
    ("Yekaterinburg", "8 Marta St", 22, "Apartment"),
]

SOCHI_ADDRESSES = [
    ("Sochi", "Navaginskaya St", 15, "Apartment"),
    ("Sochi", "Kurortny Prospekt", 25, "House"),
]

TULA_ADDRESSES = [
    ("Tula", "Lenina Prospekt", 25, "Apartment"),
    ("Tula", "Proletarskaya St", 18, "Apartment"),
    ("Tula", "Sovetskaya St", 22, "Apartment"),
]

TULA_REGION_ADDRESSES = [
    ("Novomoskovsk", "Komsomolskaya St", 16, "Apartment"),
    ("Donskoy", "Lenina St", 12, "Apartment"),
    ("Aleksin", "Sovetskaya St", 10, "Apartment"),
]

# Создаем список из 100 адресов с весами по городам
# Умножаем количество адресов пропорционально
ALL_ADDRESSES = (
    MOSCOW_ADDRESSES * 40 +
    SPB_ADDRESSES * 30 +
    KAZAN_ADDRESSES * 10 +
    NOVOSIBIRSK_ADDRESSES * 10 +
    EKATERINBURG_ADDRESSES * 10 +
    SOCHI_ADDRESSES * 5 +
    TULA_ADDRESSES * 3 +
    TULA_REGION_ADDRESSES * 2
)[:100]

# Параметры генерации по типам недвижимости
PROPERTY_PARAMS = {
    "Studio": {"price_range": (1_500_000, 5_000_000), "area_range": (15, 35), "rooms": 1},
    "Apartment": {"price_range": (3_000_000, 50_000_000), "area_range": (30, 150), "rooms_range": (1, 4)},
    "House": {"price_range": (5_000_000, 100_000_000), "area_range": (80, 400), "rooms_range": (3, 8)},
    "Townhouse": {"price_range": (8_000_000, 30_000_000), "area_range": (60, 200), "rooms_range": (2, 5)},
}

# Реалистичные названия для объектов
TITLES = {
    "Studio": ["Cozy Studio", "Studio with View", "Bright Studio", "Studio in City Center", "Modern Studio"],
    "Apartment": ["Spacious Apartment", "Renovated Apartment", "Bright Apartment", "New Building Apartment",
                  "Cozy Apartment", "Apartment with Park View", "Spacious Apartment", "Apartment with Loggia"],
    "House": ["Spacious House", "House with Plot", "House near Forest", "Modern House", "House with Garage",
              "Country House", "House with Garden", "Spacious Cottage"],
    "Townhouse": ["Townhouse in Complex", "Spacious Townhouse", "Bright Townhouse", "Townhouse near Park"],
}

DESCRIPTIONS = [
    "Great option for living. Quality renovation, good infrastructure.",
    "Spacious housing with modern layout. Nearby schools, shops, parks.",
    "Cozy housing in quiet area. Developed infrastructure, convenient transport accessibility.",
    "Bright apartment with beautiful view. Quality finishing, built-in kitchen.",
    "Great option for large family. Spacious rooms, large kitchen-living room.",
]

# Placeholder images (placehold.co always works)
def get_property_images(prop_type, seed):
    base_url = f"https://placehold.co/600x400/e6e6e6/333333"
    return [
        f"{base_url}?text={prop_type}+1",
        f"{base_url}?text={prop_type}+2",
        f"{base_url}?text={prop_type}+3",
    ]

# Coordinates dictionary removed - now using geocoder only

# Reference books for generation
MATERIALS = ["Panel", "Brick", "Monolith", "Brick-Monolith", "Wood", "Block"]
REPAIR_TYPES = ["Cosmetic", "Euro", "Design", "Rough"]
ROOM_TYPES = ["Adjacent", "Separated", "Both"]
PURPOSES = ["sale", "rent"]
CATEGORIES = {
    "Studio": ["Studio"],
    "Apartment": ["1-room Apartment", "2-room Apartment", "3-room Apartment", "4-room Apartment", "Multi-room"],
    "House": ["House", "Cottage", "Country House"],
    "Townhouse": ["Townhouse"],
}
DISTRICTS = {
    "Moscow": ["CAO", "SAO", "SVAO", "VAO", "YVAO", "YUAO", "YZAO", "ZAO", "SZAO", "NAO", "Nekrasovka"],
    "Saint Petersburg": ["Central", "Admiralteysky", "Vasileostrovsky", "Petrogradsky", "Vyborgsky"],
    "Kazan": ["Vakhitovsky", "Novo-Savinovsky", "Moscow", "Aviastroitelny"],
    "Novosibirsk": ["Central", "Oktyabrsky", "Kalininsky", "Leninsky"],
    "Yekaterinburg": ["Center", "Zheleznodorozhny", "Chkalovsky", "Ordzhonikidzevsky"],
    "Sochi": ["Center", "Lazarevskoye", "Hosta", "Adler"],
    "Tula": ["Center", "Proletarsky", "Sovetsky", "Prioksky"],
}

BUILD_YEAR_RANGE = {
    "Panel": (1960, 1990),
    "Brick": (1950, 2000),
    "Monolith": (1995, 2023),
    "Brick-Monolith": (1990, 2023),
    "Wood": (1990, 2023),
    "Block": (1980, 2010),
}

async def get_coordinates(geocoder, city, street, house):
    full_address = f"{city}, {street}, {house}"

    try:
        coords = await geocoder.get_coords_from_address(full_address)
        if coords:
            lat, lon = coords
            # Get metro info via reverse geocoding
            address = await geocoder.get_address_from_coords(lat, lon)
            metro = ""
            if address:
                # Try to find metro in address
                import re
                metro_match = re.search(r'(metro|м\.)\s*([A-Za-z\-]+)', address, re.IGNORECASE)
                if metro_match:
                    metro = metro_match.group(2)
            return (lat, lon, metro)
    except Exception as e:
        print(f"Geocoder error for {full_address}: {e}")

    # Fallback to city center coordinates
    city_centers = {
        "Moscow": (55.7558, 37.6173),
        "Saint Petersburg": (59.9343, 30.3351),
        "Kazan": (55.8304, 49.0661),
        "Novosibirsk": (55.0302, 82.9204),
        "Yekaterinburg": (56.8389, 60.6030),
        "Sochi": (43.5994, 39.7305),
        "Tula": (54.1961, 37.6182),
        "Novomoskovsk": (54.0500, 38.2700),
        "Donskoy": (53.9800, 38.3300),
        "Aleksin": (54.5000, 37.0700),
    }

    if city in city_centers:
        base_lat, base_lon = city_centers[city]
        lat = base_lat + random.uniform(-0.01, 0.01)
        lon = base_lon + random.uniform(-0.01, 0.01)
        return (lat, lon, "")

    return (55.7558, 37.6173, "")

async def populate():
    async with AsyncSession(engine) as session:
        # Clear tables
        print("Clearing tables...")
        async with session.begin():
            await session.execute(text("TRUNCATE users, properties, user_preferences, interactions CASCADE"))

        auth_service = AuthService(session)

        # Create users
        print("Creating users...")
        users_data = [
            {"email": "moscow_user@example.com", "name": "Alexander", "phone": "+79011111111", "tg": "@alex_msk"},
            {"email": "tula_user@example.com", "name": "Elena", "phone": "+79022222222", "tg": "@elena_tula"},
            {"email": "family_man@example.com", "name": "Dmitry", "phone": "+79033333333", "tg": "@dima_family"},
            {"email": "investor@example.com", "name": "Olga", "phone": "+79044444444", "tg": "@olga_inv"},
            {"email": "student@example.com", "name": "Maria", "phone": "+79055555555", "tg": "@mary_stud"},
            {"email": "pensioner@example.com", "name": "Victor", "phone": "+79066666666", "tg": "@victor_pen"},
        ]

        created_user_ids = []
        for u in users_data:
            try:
                user = await auth_service.register_user(
                    email=u["email"],
                    password="Password123!",
                    full_name=u["name"],
                    phone_number=u["phone"],
                    telegram_handle=u["tg"]
                )
                created_user_ids.append(user.id)
                print(f"Created user: {u['email']}")
            except Exception as e:
                print(f"Error creating user {u['email']}: {e}")

        await session.commit()

        # Initialize geocoder
        geocoder = GeocodingService()

        # Create properties
        print("Creating properties (100 items)...")
        properties_data = []

        # Select 100 random addresses from the list (with repetitions)
        selected_addresses = random.choices(ALL_ADDRESSES, k=100)

        for i, addr in enumerate(selected_addresses):
            city, street, house, prop_type = addr
            if not isinstance(house, int):
                house = random.randint(1, 100)

            try:
                lat, lon, metro = await get_coordinates(geocoder, city, street, house)
            except Exception as e:
                print(f"Error getting coordinates for {city}, {street}: {e}")
                lat, lon, metro = (55.7558, 37.6173, "")

            params = PROPERTY_PARAMS[prop_type]
            price_min, price_max = params["price_range"]
            area_min, area_max = params["area_range"]

            price = Decimal(random.randint(price_min, price_max))
            area = Decimal(random.randint(area_min, area_max))

            if "rooms_range" in params:
                rooms = random.randint(*params["rooms_range"])
            else:
                rooms = params["rooms"]

            if prop_type in ["Apartment", "Studio"]:
                floor = random.randint(1, 25)
                total_floors = random.randint(floor, 30)
            else:
                floor = None
                total_floors = None

            title = random.choice(TITLES[prop_type])
            if prop_type in ["Apartment", "House"]:
                title = f"{title} in {city}"

            description = random.choice(DESCRIPTIONS)
            images = get_property_images(prop_type, i)
            address = f"{city}, {street}, {house}"

            material = random.choice(MATERIALS)
            repair = random.choice(REPAIR_TYPES)
            room_type = random.choice(ROOM_TYPES)
            purpose = random.choice(PURPOSES)
            category = random.choice(CATEGORIES[prop_type])
            district = random.choice(DISTRICTS.get(city, ["Center"]))

            build_year_min, build_year_max = BUILD_YEAR_RANGE[material]
            build_year = random.randint(build_year_min, build_year_max)

            sq_living = Decimal(float(area) * random.uniform(0.6, 0.85))
            sq_kitchen = Decimal(random.randint(6, 20))

            is_new = "new" if build_year >= 2015 and prop_type != "House" else "secondary"
            balcony = random.choice(["yes", "no"])
            parking = random.choice(["yes", "no", "paid"])

            p_id = uuid.uuid4()

            properties_data.append({
                "id": p_id,
                "user_id": random.choice(created_user_ids),
                "title": title,
                "description": description,
                "price": price,
                "rooms": rooms,
                "area": area,
                "floor": floor,
                "total_floors": total_floors,
                "property_type": prop_type,
                "property_purpose": purpose,
                "category": category,
                "address": address,
                "district": district,
                "metro": metro if metro else None,
                "location": ST_GeomFromText(f"POINT({lon} {lat})", 4326),
                "images": images,
                "sq_living": sq_living,
                "sq_kitchen": sq_kitchen,
                "build_year": build_year,
                "material": material,
                "repair_type": repair,
                "room_type": room_type,
                "is_new": is_new,
                "balcony": balcony,
                "parking": parking,
            })

        # Add to DB
        print(f"Adding {len(properties_data)} properties to DB...")
        for p_data in properties_data:
            prop = Property(**p_data)
            session.add(prop)

        await session.commit()
        print(f"Created {len(properties_data)} properties")

        # Create user preferences
        print("Creating user preferences...")
        prefs = [
            # Moscow user - looking for apartment in Moscow, higher price
            (created_user_ids[0], Decimal('5000000'), Decimal('30000000'), Decimal('40')),
            # Tula user - looking for budget housing in Tula
            (created_user_ids[1], Decimal('1500000'), Decimal('8000000'), Decimal('30')),
            # Family man - large apartment or house
            (created_user_ids[2], Decimal('8000000'), Decimal('50000000'), Decimal('80')),
            # Investor - any objects for investment
            (created_user_ids[3], Decimal('3000000'), Decimal('100000000'), Decimal('20')),
            # Student - budget housing
            (created_user_ids[4], Decimal('1000000'), Decimal('5000000'), Decimal('15')),
            # Pensioner - comfortable housing without stairs
            (created_user_ids[5], Decimal('3000000'), Decimal('15000000'), Decimal('40')),
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
        print("Preferences created")

        # Create interactions (likes, views)
        print("Creating interactions...")
        for i, p_data in enumerate(properties_data):
            if i >= 50:  # Limit number of interactions
                break

            # First user likes cheap properties
            if p_data["price"] < Decimal('5000000'):
                session.add(Interaction(
                    user_id=created_user_ids[0],
                    property_id=p_data["id"],
                    interaction_type="like"
                ))

            # Second user likes properties in Tula
            if "Tula" in p_data["address"]:
                session.add(Interaction(
                    user_id=created_user_ids[1],
                    property_id=p_data["id"],
                    interaction_type="like"
                ))

            # Third user likes large properties
            if p_data["area"] and p_data["area"] > 80:
                session.add(Interaction(
                    user_id=created_user_ids[2],
                    property_id=p_data["id"],
                    interaction_type="like"
                ))

            # All users "view" random properties
            if random.random() < 0.3:  # 30% chance of view
                viewer = random.choice(created_user_ids)
                session.add(Interaction(
                    user_id=viewer,
                    property_id=p_data["id"],
                    interaction_type="view"
                ))

        await session.commit()
        print("Interactions created")

        print("\nDatabase population completed successfully!")
        print(f"Created: {len(created_user_ids)} users, {len(properties_data)} properties")

if __name__ == "__main__":
    asyncio.run(populate())
