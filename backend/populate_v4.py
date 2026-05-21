import asyncio
import random
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.category import compute_category

CITIES = {
    "London": {"country": "UK", "center": (51.5074, -0.1278), "price_coef": 1.8,
        "streets": ["Oxford Street", "Baker Street", "Abbey Road", "Kings Road", "Piccadilly",
                     "Bond Street", "Regent Street", "Strand", "Whitehall", "Fleet Street"],
        "districts": ["Westminster", "Camden", "Kensington", "Chelsea", "Islington",
                      "Shoreditch", "Greenwich", "Canary Wharf", "Hampstead", "Notting Hill"]},
    "New York": {"country": "USA", "center": (40.7128, -74.0060), "price_coef": 2.0,
        "streets": ["Broadway", "Fifth Avenue", "Park Avenue", "Madison Avenue", "Wall Street",
                     "Lexington Avenue", "Amsterdam Avenue", "West End Avenue", "Columbus Avenue", "Sixth Avenue"],
        "districts": ["Manhattan", "Brooklyn", "Queens", "Bronx", "Upper East Side",
                      "Upper West Side", "Greenwich Village", "SoHo", "Harlem", "Williamsburg"]},
    "Paris": {"country": "France", "center": (48.8566, 2.3522), "price_coef": 1.7,
        "streets": ["Champs-Élysées", "Rue de Rivoli", "Boulevard Saint-Germain", "Avenue Montaigne",
                     "Boulevard Haussmann", "Rue Saint-Honoré", "Rue de la Paix", "Rue de Rennes",
                     "Rue du Faubourg Saint-Honoré", "Avenue des Champs-Élysées"],
        "districts": ["Le Marais", "Montmartre", "Saint-Germain-des-Prés", "Latin Quarter", "Champs-Élysées",
                      "Montparnasse", "Belleville", "Bastille", "Opéra", "Batignolles"]},
    "Berlin": {"country": "Germany", "center": (52.5200, 13.4050), "price_coef": 1.2,
        "streets": ["Unter den Linden", "Friedrichstraße", "Karl-Marx-Allee", "Kurfürstendamm",
                     "Potsdamer Platz", "Alexanderplatz", "Torstraße", "Oranienburger Straße",
                     "Schönhauser Allee", "Frankfurter Allee"],
        "districts": ["Mitte", "Kreuzberg", "Prenzlauer Berg", "Friedrichshain", "Neukölln",
                      "Charlottenburg", "Schöneberg", "Wedding", "Tempelhof", "Lichtenberg"]},
    "Tokyo": {"country": "Japan", "center": (35.6762, 139.6503), "price_coef": 1.9,
        "streets": ["Shibuya Crossing", "Omotesando", "Ginza", "Akihabara", "Shinjuku",
                     "Roppongi", "Harajuku", "Ueno", "Marunouchi", "Kagurazaka"],
        "districts": ["Shibuya", "Shinjuku", "Minato", "Chiyoda", "Chuo",
                      "Taito", "Bunkyo", "Setagaya", "Meguro", "Toshima"]},
    "Dubai": {"country": "UAE", "center": (25.2048, 55.2708), "price_coef": 1.6,
        "streets": ["Sheikh Zayed Road", "Jumeirah Beach Road", "Al Maktoom Road", "Al Wasl Road",
                     "Al Rigga Road", "Baniyas Street", "Al Maktoum Street", "Al Mina Road",
                     "Umm Suqeim Road", "Hessa Street"],
        "districts": ["Downtown Dubai", "Dubai Marina", "Palm Jumeirah", "Jumeirah", "Deira",
                      "Bur Dubai", "Al Barsha", "Mirdif", "Arabian Ranches", "Dubai Hills"]},
    "Singapore": {"country": "Singapore", "center": (1.3521, 103.8198), "price_coef": 1.7,
        "streets": ["Orchard Road", "Marina Boulevard", "Raffles Avenue", "Shenton Way", "Robinson Road",
                     "Cecil Street", "North Bridge Road", "Serangoon Road", "Bukit Timah Road", "Tanjong Pagar Road"],
        "districts": ["Marina Bay", "Orchard", "Chinatown", "Little India", "Bugis",
                      "Tanjong Pagar", "Raffles Place", "Sentosa", "Tiong Bahru", "Holland Village"]},
    "Toronto": {"country": "Canada", "center": (43.6532, -79.3832), "price_coef": 1.3,
        "streets": ["Yonge Street", "Queen Street West", "King Street West", "Bloor Street", "Dundas Street",
                     "Spadina Avenue", "Bay Street", "Front Street", "College Street", "Danforth Avenue"],
        "districts": ["Downtown Core", "Yorkville", "Queen West", "King West", "Distillery District",
                      "Kensington Market", "Leslieville", "The Annex", "Corktown", "Liberty Village"]},
    "Sydney": {"country": "Australia", "center": (-33.8688, 151.2093), "price_coef": 1.5,
        "streets": ["George Street", "Pitt Street", "Elizabeth Street", "Macquarie Street", "Oxford Street",
                     "Darling Drive", "King Street", "Market Street", "Castlereagh Street", "Sussex Street"],
        "districts": ["Sydney CBD", "Surry Hills", "Darlinghurst", "Paddington", "Bondi",
                      "Manly", "Newtown", "Pyrmont", "Redfern", "Barangaroo"]},
    "Barcelona": {"country": "Spain", "center": (41.3874, 2.1686), "price_coef": 1.1,
        "streets": ["La Rambla", "Passeig de Gràcia", "Carrer de Balmes", "Via Laietana", "Avinguda Diagonal",
                     "Rambla de Catalunya", "Carrer de Pau Claris", "Gran Via de les Corts Catalanes",
                     "Carrer de València", "Carrer d'Aragó"],
        "districts": ["Gothic Quarter", "Eixample", "Gràcia", "El Born", "Barceloneta",
                      "Sants-Montjuïc", "Les Corts", "Sarrià-Sant Gervasi", "Horta-Guinardó", "Nou Barris"]},
    "Moscow": {"country": "Russia", "center": (55.7558, 37.6173), "price_coef": 2.0, "currency": "RUB",
        "streets": ["Tverskaya Street", "Novy Arbat", "Sadovaya-Kudrinskaya", "Patriarshy Ponds", "Pokrovka",
                     "Leningradsky Prospekt", "Prospekt Mira", "Volgogradsky Prospekt", "Leninsky Prospekt", "Kutuzovsky Prospekt"],
        "districts": ["Central", "Northern", "North-Eastern", "Eastern", "South-Eastern",
                      "Southern", "South-Western", "Western", "North-Western", "Zelenograd"]},
    "Saint Petersburg": {"country": "Russia", "center": (59.9343, 30.3351), "price_coef": 1.5, "currency": "RUB",
        "streets": ["Nevsky Prospekt", "Gorokhovaya Street", "Kamennoostrovsky Prospekt", "Vyborgskaya Embankment",
                     "Moskovsky Prospekt", "Ligovsky Prospekt", "Maly Prospekt", "Bolshoy Prospekt",
                     "Sredny Prospekt", "Shpalernaya Street"],
        "districts": ["Central", "Admiralteysky", "Vasileostrovsky", "Petrogradsky", "Vyborgsky",
                      "Kalininsky", "Krasnogvardeysky", "Nevsky", "Moskovsky", "Frunzensky"]},
    "Kazan": {"country": "Russia", "center": (55.8304, 49.0661), "price_coef": 1.0, "currency": "RUB",
        "streets": ["Bauman Street", "Pushkin Street", "Prospekt Pobedy", "Peterburgskaya Street", "Gogol Street",
                     "Kremlyovskaya Street", "Butlerova Street", "Chistopolskaya Street", "Sibgat Khakim Street", "Adoratskogo Street"],
        "districts": ["Vakhitovsky", "Novo-Savinovsky", "Moskovsky", "Aviastroitelny", "Sovetsky",
                      "Privolzhsky", "Kirovsky", "Kazan Kremlin", "Derbyshki", "Gorki"]},
    "Novosibirsk": {"country": "Russia", "center": (55.0084, 82.9357), "price_coef": 0.8, "currency": "RUB",
        "streets": ["Krasny Prospekt", "Lenina Street", "Vokzalnaya Magistral", "Gorsky Street", "Karla Marxa Street",
                     "Bolshevistskaya Street", "Sibirskaya Street", "Frunze Street", "Deputatskaya Street", "Kamenskaya Street"],
        "districts": ["Central", "Zaeltsovsky", "Leninsky", "Kirovsky", "Oktyabrsky",
                      "Soviet", "Kalninsky", "Dzerzhinsky", "Pervomaisky", "Zheleznodorozhny"]},
    "Yekaterinburg": {"country": "Russia", "center": (56.8389, 60.6030), "price_coef": 0.9, "currency": "RUB",
        "streets": ["Lenina Prospekt", "8 Marta Street", "Malysheva Street", "Belinskogo Street", "Shartashskaya Street",
                     "Karla Marksa Street", "Vostochnaya Street", "Moskovskaya Street", "Amundsena Street", "Sverdlova Street"],
        "districts": ["Center", "Zheleznodorozhny", "Chkalovsky", "Ordzhonikidzevsky", "Verkh-Isetsky",
                      "Kirovsky", "Leninsky", "Oktyabrsky", "Akademichesky", "Elmash"]},
    "Sochi": {"country": "Russia", "center": (43.5994, 39.7305), "price_coef": 1.3, "currency": "RUB",
        "streets": ["Navaginskaya Street", "Kurortny Prospekt", "Voikova Street", "Gorkogo Street", "Ordzhonikidze Street",
                     "Plastunskaya Street", "Vinogradnaya Street", "Transportnaya Street", "Donskaya Street", "Lenina Street"],
        "districts": ["Central", "Lazarevskoye", "Khosta", "Adler", "Dagomys",
                      "Krasnaya Polyana", "Matsesta", "Svetlana", "Sochi Center", "Riviera"]},
    "Tula": {"country": "Russia", "center": (54.1935, 37.6173), "price_coef": 0.6, "currency": "RUB",
        "streets": ["Lenina Prospekt", "Karla Marxa Street", "Pervomayskaya Street", "Sovetskaya Street", "Moskovskaya Street",
                     "Oboronnaya Street", "Metallurgov Street", "Demidovskaya Street", "Puteyskaya Street", "Zavodskaya Street"],
        "districts": ["Central", "Proletarsky", "Zarechensky", "Prikosky", "Severny",
                      "Yuzhny", "Novomoskovsky", "Kosaya Gora", "Mendeleevsky", "Skuratovsky"]},
    "Nizhny Novgorod": {"country": "Russia", "center": (56.2965, 43.9361), "price_coef": 0.8, "currency": "RUB",
        "streets": ["Bolshaya Pokrovskaya Street", "Rozhdestvenskaya Street", "Gorky Street", "Minin Street", "Kovrovskaya Street",
                     "Belinskogo Street", "Krasnykh Zor Street", "Rodionova Street", "Kominterna Street", "Sormovskoye Shosse"],
        "districts": ["Nizhegorodsky", "Prioksky", "Sormovsky", "Moskovsky", "Kanavinsky",
                      "Leninsky", "Avtozavodsky", "Sovietsky", "Gagarinsky", "Nagorny"]},
    "Rostov-on-Don": {"country": "Russia", "center": (47.2357, 39.7015), "price_coef": 0.8, "currency": "RUB",
        "streets": ["Bolshaya Sadovaya Street", "Pushkinskaya Street", "Krasnoarmeyskaya Street", "Budennovsky Prospekt",
                     "Voroshilovsky Prospekt", "Stachki Prospekt", "Lenina Street", "Nagibina Street", "Mikhaila Street", "Siversa Street"],
        "districts": ["Kirovsky", "Leninsky", "Oktyabrsky", "Pervomaisky", "Proletarsky",
                      "Sovietsky", "Voroshilovsky", "Zheleznodorozhny", "Selmashevsky", "Nakhichevansky"]},
    "Samara": {"country": "Russia", "center": (53.1959, 50.1002), "price_coef": 0.7, "currency": "RUB",
        "streets": ["Moskovskoye Shosse", "Lenina Street", "Gagarina Street", "Revolutionnaya Street", "Polevaya Street",
                     "Karla Marxa Street", "Samarskaya Street", "Vilonovskaya Street", "Sadovaya Street", "Michurina Street"],
        "districts": ["Leninsky", "Oktyabrsky", "Zheleznodorozhny", "Kirovsky", "Krasnoglinsky",
                      "Kuybyshevsky", "Promyshlenny", "Samarsky", "Sovietsky", "Volzhsky"]},
}

USERS = [
    {"email": "elena.petrova@example.com", "name": "Elena Petrova", "phone": "+79161234567", "telegram": "@elena_p", "role": "agent"},
    {"email": "sergey.ivanov@example.com", "name": "Sergey Ivanov", "phone": "+79261234568", "telegram": "@sergey_i", "role": "owner"},
    {"email": "anna.smirnova@example.com", "name": "Anna Smirnova", "phone": "+79361234569", "telegram": "@anna_s", "role": "agent"},
    {"email": "dmitry.kozlov@example.com", "name": "Dmitry Kozlov", "phone": "+79461234570", "telegram": "@dmitry_k", "role": "owner"},
    {"email": "olga.morozova@example.com", "name": "Olga Morozova", "phone": "+79561234571", "telegram": "@olga_m", "role": "agent"},
    {"email": "alexey.volkov@example.com", "name": "Alexey Volkov", "phone": "+79661234572", "telegram": "@alexey_v", "role": "owner"},
    {"email": "maria.sokolova@example.com", "name": "Maria Sokolova", "phone": "+79761234573", "telegram": "@maria_s", "role": "agent"},
    {"email": "ivan.pavlov@example.com", "name": "Ivan Pavlov", "phone": "+79861234574", "telegram": "@ivan_p", "role": "owner"},
    {"email": "tatiana.popova@example.com", "name": "Tatiana Popova", "phone": "+79961234575", "telegram": "@tatiana_p", "role": "agent"},
    {"email": "nikolay.romanov@example.com", "name": "Nikolay Romanov", "phone": "+79011234576", "telegram": "@nikolay_r", "role": "owner"},
    {"email": "ekaterina.fedorova@example.com", "name": "Ekaterina Fedorova", "phone": "+79021234577", "telegram": "@ekaterina_f", "role": "agent"},
    {"email": "mikhail.kuznetsov@example.com", "name": "Mikhail Kuznetsov", "phone": "+79031234578", "telegram": "@mikhail_k", "role": "owner"},
]

PROPERTY_TYPES_DIST = ["Apartment", "Apartment", "Apartment", "Apartment",
                       "Studio", "Studio",
                       "House", "House", "House", "House",
                       "Townhouse", "Townhouse",
                       "Penthouse", "Loft", "Duplex"]

PURPOSES = ["sale", "rent", "daily_rent"]
REPAIR_TYPES = ["cosmetic", "designer", "no_repair", "euro", "premium", "rough"]
MATERIALS = ["panel", "brick", "monolith", "block", "wood", "brick-monolith"]
ROOM_TYPES = ["separated", "adjacent", "open_plan"]
IS_NEW_OPTIONS = ["new_building", "secondary"]
BALCONY_OPTIONS = ["yes", "no", "loggia"]
PARKING_OPTIONS = ["yes", "no", "underground", "guest"]
CATEGORY_OPTIONS = ["Studio", "1-bedroom", "2-bedroom", "3-bedroom", "4-bedroom", "5+ bedroom", "Penthouse", "Duplex", "Loft"]

TITLES_BY_TYPE = {
    "Studio": ["Cozy Studio", "Modern Studio", "Bright Studio", "Compact Studio", "Stylish Studio"],
    "Apartment": ["Spacious Apartment", "Modern Apartment", "Bright Apartment", "Cozy Apartment",
                  "Elegant Apartment", "Stylish Apartment", "Sunny Apartment", "Charming Apartment",
                  "Contemporary Apartment", "Luxury Apartment", "Panoramic Apartment", "Garden Apartment"],
    "House": ["Spacious House", "Modern House", "Family House", "Garden House", "Charming House",
              "Detached House", "Victorian House", "Country House", "Lake House", "Mountain House"],
    "Townhouse": ["Modern Townhouse", "Spacious Townhouse", "Bright Townhouse", "Urban Townhouse",
                  "Contemporary Townhouse", "Family Townhouse", "Garden Townhouse", "Stylish Townhouse"],
    "Penthouse": ["Luxury Penthouse", "Sky Penthouse", "Penthouse Suite", "Panoramic Penthouse",
                  "Executive Penthouse", "Rooftop Penthouse", "Premium Penthouse"],
    "Loft": ["Industrial Loft", "Artist Loft", "Urban Loft", "Creative Loft",
             "Converted Loft", "Open Loft", "Warehouse Loft", "Modern Loft"],
    "Duplex": ["Spacious Duplex", "Modern Duplex", "Garden Duplex", "Sky Duplex",
               "Premium Duplex", "Contemporary Duplex", "Sunny Duplex"],
}

DESCRIPTIONS = [
    "Excellent property in a prime location. High-quality renovation, great infrastructure nearby. "
    "Walking distance to public transport, shops, and restaurants.",
    "Spacious living with modern layout. Schools, parks, and supermarkets within walking distance. "
    "Quiet neighborhood with friendly community.",
    "Cozy home in a quiet neighborhood. Well-developed infrastructure and convenient transport links. "
    "Perfect for families and professionals.",
    "Bright property with beautiful panoramic views. Quality finishes, built-in kitchen appliances, "
    "and smart home system installed.",
    "Great option for a family. Large rooms, spacious living-dining area, separate kitchen. "
    "Children's playground and green zone nearby.",
    "Modern property with premium finishes. Floor-to-ceiling windows, open plan layout with "
    "Italian marble floors and German kitchen.",
    "Recently renovated with designer interior. Perfect for professionals and couples. "
    "Fully furnished, ready to move in.",
    "Wonderful property near the city center. Excellent transport connections, "
    "24/7 security, underground parking available.",
    "Stylish property with a private balcony and panoramic views. Quiet area yet close to all amenities. "
    "Ideal for remote work with high-speed internet.",
    "Investment opportunity in a rapidly developing area. High rental yield potential. "
    "New building with modern infrastructure.",
    "Charming property with character. High ceilings, original hardwood floors, "
    "exposed brick walls, and modern bathroom.",
    "Eco-friendly property with solar panels and energy-efficient systems. "
    "Smart home technology, water filtration, and climate control.",
    "Luxury property with premium amenities. Swimming pool, gym, concierge service, "
    "and private garden area for residents.",
    "Historic building with modern renovation. High ceilings, stucco moldings, "
    "fireplace, and renovated kitchen with premium appliances.",
]

PROPERTIES_PER_CITY = 30

PRICE_BASES = {
    ("sale", "Apartment"): (100000, 500000),
    ("sale", "Studio"): (80000, 300000),
    ("sale", "House"): (200000, 1000000),
    ("sale", "Townhouse"): (150000, 600000),
    ("sale", "Penthouse"): (500000, 3000000),
    ("sale", "Loft"): (120000, 500000),
    ("sale", "Duplex"): (200000, 800000),
    ("rent", "Apartment"): (500, 5000),
    ("rent", "Studio"): (300, 2500),
    ("rent", "House"): (1000, 8000),
    ("rent", "Townhouse"): (800, 5000),
    ("rent", "Penthouse"): (2000, 15000),
    ("rent", "Loft"): (600, 4000),
    ("rent", "Duplex"): (1000, 6000),
    ("daily_rent", "Apartment"): (30, 200),
    ("daily_rent", "Studio"): (20, 120),
    ("daily_rent", "House"): (50, 400),
    ("daily_rent", "Townhouse"): (40, 250),
    ("daily_rent", "Penthouse"): (100, 800),
    ("daily_rent", "Loft"): (30, 180),
    ("daily_rent", "Duplex"): (50, 300),
}

AREA_RANGES = {
    "Studio": (18, 40),
    "Apartment": (30, 150),
    "House": (80, 400),
    "Townhouse": (60, 200),
    "Penthouse": (80, 300),
    "Loft": (50, 200),
    "Duplex": (70, 250),
}

ROOMS_BY_TYPE = {
    "Studio": (1, 1),
    "Apartment": (1, 5),
    "House": (2, 7),
    "Townhouse": (2, 5),
    "Penthouse": (2, 6),
    "Loft": (1, 3),
    "Duplex": (2, 5),
}


def get_password_hash():
    return "$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5EwWqy7x7q7x7q7x7q7x7q7x7q7"


def get_coords_fallback(city_center):
    base_lat, base_lon = city_center
    lat = base_lat + random.uniform(-0.025, 0.025)
    lon = base_lon + random.uniform(-0.025, 0.025)
    return lat, lon


def generate_price(property_type: str, purpose: str, city_coef: float, currency: str) -> float:
    key = (purpose, property_type)
    base_min, base_max = PRICE_BASES.get(key, (50000, 300000))

    if currency == "RUB":
        rub_coef = 90
        base_min = base_min * rub_coef
        base_max = base_max * rub_coef

    price = random.uniform(base_min, base_max) * city_coef
    if purpose == "sale":
        price = round(price / 10000) * 10000
    elif purpose == "rent":
        price = round(price / 1000) * 1000
    else:
        price = round(price / 100) * 100
    return max(1, price)


async def generate_property(city_name: str, city_data: dict, user_id: str, prop_num: int):
    property_type = random.choice(PROPERTY_TYPES_DIST)
    street = random.choice(city_data["streets"])
    house_num = random.randint(1, 200)
    lat, lon = get_coords_fallback(city_data["center"])

    purpose = random.choice(PURPOSES)
    price = generate_price(property_type, purpose, city_data["price_coef"], city_data.get("currency", "USD"))

    price_for_rooms = price if purpose == "sale" else (price * 100 if purpose == "rent" else price * 30)
    if price_for_rooms < 100000:
        min_r, max_r = ROOMS_BY_TYPE.get(property_type, (1, 2))
    elif price_for_rooms > 20000000:
        min_r, max_r = ROOMS_BY_TYPE.get(property_type, (3, 6))
    else:
        min_r, max_r = ROOMS_BY_TYPE.get(property_type, (1, 4))

    rooms = random.randint(min_r, max_r)

    area_min, area_max = AREA_RANGES.get(property_type, (30, 100))
    area = round(random.uniform(area_min, area_max), 1)

    title_prefix = random.choice(TITLES_BY_TYPE.get(property_type, TITLES_BY_TYPE["Apartment"]))

    category = compute_category(property_type, rooms)

    base_desc = random.choice(DESCRIPTIONS)
    extras = [
        f" {random.choice(['Pet friendly', 'Quiet hours', 'No smoking', 'Student friendly'])}.",
        f" Renovated in {random.randint(2018, 2024)}.",
        f" Ceiling height: {random.choice(['2.5', '2.7', '3.0', '3.5'])}m.",
    ]
    description = base_desc + random.choice(extras)

    floor_max = random.randint(3, 40)
    floor = random.randint(1, floor_max)
    district = random.choice(city_data["districts"])

    build_year = random.randint(1960, 2025)
    is_new = "new_building" if build_year >= 2015 else "secondary"

    sq_living = round(area * random.uniform(0.5, 0.8), 1)
    sq_kitchen = round(random.uniform(6, 20), 1)

    created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(0, 730))

    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": f"{title_prefix} in {city_name}",
        "city": city_name,
        "description": description,
        "price": price,
        "rooms": rooms,
        "area": area,
        "floor": floor,
        "total_floors": floor_max,
        "property_type": property_type,
        "property_purpose": purpose,
        "category": category,
        "address": f"{house_num} {street}, {city_name}, {city_data['country']}",
        "district": district,
        "metro": f"{district} Station" if random.random() > 0.25 and city_data["price_coef"] >= 1.0 else None,
        "location": f"SRID=4326;POINT({lon} {lat})",
        "images": [],
        "sq_living": sq_living,
        "sq_kitchen": sq_kitchen,
        "build_year": build_year,
        "material": random.choice(MATERIALS),
        "repair_type": random.choice(REPAIR_TYPES),
        "room_type": random.choice(ROOM_TYPES),
        "is_new": is_new,
        "balcony": random.choice(BALCONY_OPTIONS),
        "parking": random.choice(PARKING_OPTIONS),
        "views_count": random.randint(0, 2000),
        "likes_count": random.randint(0, 500),
        "created_at": created_at,
    }


async def populate():
    from app.core.db import engine as db_engine

    total = len(CITIES) * PROPERTIES_PER_CITY
    print("=" * 60)
    print(f"Populating database with {total} properties")
    print(f"Cities: {len(CITIES)}")
    print("=" * 60)

    print("\nCreating users...")
    user_ids = []

    async with db_engine.begin() as conn:
        await conn.execute(text("DELETE FROM interactions"))
        await conn.execute(text("DELETE FROM properties"))
        await conn.execute(text("DELETE FROM user_preferences"))
        await conn.execute(text("DELETE FROM users"))

        for u in USERS:
            user_id = str(uuid.uuid4())
            tg = u.get("telegram") if random.random() > 0.3 else None
            phone = u.get("phone") if random.random() > 0.2 else None
            await conn.execute(
                text("""
                    INSERT INTO users (id, email, hashed_password, full_name, phone_number, telegram_handle)
                    VALUES (:id, :email, :pwd, :name, :phone, :telegram)
                """),
                {"id": user_id, "email": u["email"], "pwd": get_password_hash(),
                 "name": u["name"], "phone": phone, "telegram": tg},
            )
            user_ids.append(user_id)
            print(f"  {u['email']} ({u['name']})")

    async_session = sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    properties = []
    prop_num = 0

    # Agents get more properties, owners get fewer
    agent_ids = [uid for i, uid in enumerate(user_ids) if USERS[i]["role"] == "agent"]
    owner_ids = [uid for i, uid in enumerate(user_ids) if USERS[i]["role"] == "owner"]

    for city_name, city_data in CITIES.items():
        print(f"\n  {city_name} ({PROPERTIES_PER_CITY} props)...", end=" ")
        for i in range(PROPERTIES_PER_CITY):
            user_id = random.choice(agent_ids) if random.random() > 0.4 else random.choice(owner_ids)
            prop = await generate_property(city_name, city_data, user_id, prop_num)
            properties.append(prop)
            prop_num += 1

    random.shuffle(properties)

    print(f"\n\nInserting {len(properties)} properties...")
    async with async_session() as session:
        batch_size = 100
        for i in range(0, len(properties), batch_size):
            batch = properties[i: i + batch_size]
            await session.execute(
                text("""
                    INSERT INTO properties (
                        id, user_id, title, city, description, price, rooms, area,
                        floor, total_floors, property_type, property_purpose, category,
                        address, district, metro, location, images, sq_living, sq_kitchen,
                        build_year, material, repair_type, room_type, is_new, balcony, parking,
                        views_count, likes_count, created_at
                    ) VALUES (
                        :id, :user_id, :title, :city, :description, :price, :rooms, :area,
                        :floor, :total_floors, :property_type, :property_purpose, :category,
                        :address, :district, :metro, ST_GeomFromText(:location, 4326), :images,
                        :sq_living, :sq_kitchen, :build_year, :material, :repair_type, :room_type,
                        :is_new, :balcony, :parking, :views_count, :likes_count, :created_at
                    )
                """),
                batch,
            )
            await session.commit()
            print(f"  Inserted {min(i + batch_size, len(properties))}/{len(properties)}")

    print(f"\n{'=' * 60}")
    print("POPULATION COMPLETE!")
    print(f"  Total properties: {total}")
    print(f"  Cities: {len(CITIES)}")
    print(f"  Users: {len(USERS)}")
    print(f"  User IDs:")
    for uid in user_ids:
        print(f"    {uid}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    asyncio.run(populate())
