import asyncio
import random
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

CITIES = {
    # International
    "London": {
        "country": "UK", "center": (51.5074, -0.1278),
        "streets": ["Oxford Street", "Baker Street", "Abbey Road", "Kings Road", "Piccadilly",
                     "Fleet Street", "Bond Street", "Regent Street", "Strand", "Whitehall"],
        "districts": ["Westminster", "Camden", "Kensington", "Chelsea", "Islington",
                      "Shoreditch", "Greenwich", "Canary Wharf", "Hampstead", "Notting Hill"],
    },
    "New York": {
        "country": "USA", "center": (40.7128, -74.0060),
        "streets": ["Broadway", "Fifth Avenue", "Park Avenue", "Madison Avenue", "Wall Street",
                     "Lexington Avenue", "Amsterdam Avenue", "West End Avenue", "Columbus Avenue", "Sixth Avenue"],
        "districts": ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island",
                      "Upper East Side", "Upper West Side", "Greenwich Village", "SoHo", "Harlem"],
    },
    "Paris": {
        "country": "France", "center": (48.8566, 2.3522),
        "streets": ["Champs-Élysées", "Rue de Rivoli", "Boulevard Saint-Germain",
                     "Avenue Montaigne", "Boulevard Haussmann", "Rue Saint-Honoré",
                     "Rue de la Paix", "Rue de Rennes", "Rue du Faubourg Saint-Honoré", "Avenue des Champs-Élysées"],
        "districts": ["Le Marais", "Montmartre", "Saint-Germain-des-Prés", "Latin Quarter", "Champs-Élysées",
                      "Montparnasse", "Belleville", "Bastille", "Opéra", "Batignolles"],
    },
    "Berlin": {
        "country": "Germany", "center": (52.5200, 13.4050),
        "streets": ["Unter den Linden", "Friedrichstraße", "Karl-Marx-Allee", "Kurfürstendamm",
                     "Potsdamer Platz", "Alexanderplatz", "Torstraße", "Oranienburger Straße",
                     "Schönhauser Allee", "Frankfurter Allee"],
        "districts": ["Mitte", "Kreuzberg", "Prenzlauer Berg", "Friedrichshain", "Neukölln",
                      "Charlottenburg", "Schöneberg", "Wedding", "Tempelhof", "Lichtenberg"],
    },
    "Tokyo": {
        "country": "Japan", "center": (35.6762, 139.6503),
        "streets": ["Shibuya Crossing", "Omotesando", "Ginza", "Akihabara", "Shinjuku",
                     "Roppongi", "Harajuku", "Ueno", "Marunouchi", "Kagurazaka"],
        "districts": ["Shibuya", "Shinjuku", "Minato", "Chiyoda", "Chuo",
                      "Taito", "Bunkyo", "Setagaya", "Meguro", "Toshima"],
    },
    "Dubai": {
        "country": "UAE", "center": (25.2048, 55.2708),
        "streets": ["Sheikh Zayed Road", "Jumeirah Beach Road", "Al Maktoom Road", "Al Wasl Road",
                     "Al Rigga Road", "Baniyas Street", "Al Maktoum Street", "Al Mina Road",
                     "Umm Suqeim Road", "Hessa Street"],
        "districts": ["Downtown Dubai", "Dubai Marina", "Palm Jumeirah", "Jumeirah", "Deira",
                      "Bur Dubai", "Al Barsha", "Mirdif", "Arabian Ranches", "Dubai Hills"],
    },
    "Singapore": {
        "country": "Singapore", "center": (1.3521, 103.8198),
        "streets": ["Orchard Road", "Marina Boulevard", "Raffles Avenue", "Shenton Way", "Robinson Road",
                     "Cecil Street", "North Bridge Road", "Serangoon Road", "Bukit Timah Road", "Tanjong Pagar Road"],
        "districts": ["Marina Bay", "Orchard", "Chinatown", "Little India", "Bugis",
                      "Tanjong Pagar", "Raffles Place", "Sentosa", "Tiong Bahru", "Holland Village"],
    },
    "Toronto": {
        "country": "Canada", "center": (43.6532, -79.3832),
        "streets": ["Yonge Street", "Queen Street West", "King Street West", "Bloor Street", "Dundas Street",
                     "Spadina Avenue", "Bay Street", "Front Street", "College Street", "Danforth Avenue"],
        "districts": ["Downtown Core", "Yorkville", "Queen West", "King West", "Distillery District",
                      "Kensington Market", "Leslieville", "The Annex", "Corktown", "Liberty Village"],
    },
    "Sydney": {
        "country": "Australia", "center": (-33.8688, 151.2093),
        "streets": ["George Street", "Pitt Street", "Elizabeth Street", "Macquarie Street", "Oxford Street",
                     "Darling Drive", "King Street", "Market Street", "Castlereagh Street", "Sussex Street"],
        "districts": ["Sydney CBD", "Surry Hills", "Darlinghurst", "Paddington", "Bondi",
                      "Manly", "Newtown", "Pyrmont", "Redfern", "Barangaroo"],
    },
    "Barcelona": {
        "country": "Spain", "center": (41.3874, 2.1686),
        "streets": ["La Rambla", "Passeig de Gràcia", "Carrer de Balmes", "Via Laietana", "Avinguda Diagonal",
                     "Rambla de Catalunya", "Carrer de Pau Claris", "Gran Via de les Corts Catalanes",
                     "Carrer de València", "Carrer d'Aragó"],
        "districts": ["Gothic Quarter", "Eixample", "Gràcia", "El Born", "Barceloneta",
                      "Sants-Montjuïc", "Les Corts", "Sarrià-Sant Gervasi", "Horta-Guinardó", "Nou Barris"],
    },
    # Russian cities (English names)
    "Moscow": {
        "country": "Russia", "center": (55.7558, 37.6173),
        "streets": ["Tverskaya Street", "Novy Arbat", "Sadovaya-Kudrinskaya", "Patriarshy Ponds", "Pokrovka",
                     "Leningradsky Prospekt", "Prospekt Mira", "Volgogradsky Prospekt", "Leninsky Prospekt", "Kutuzovsky Prospekt"],
        "districts": ["Central", "Northern", "North-Eastern", "Eastern", "South-Eastern",
                      "Southern", "South-Western", "Western", "North-Western", "Zelenograd"],
    },
    "Saint Petersburg": {
        "country": "Russia", "center": (59.9343, 30.3351),
        "streets": ["Nevsky Prospekt", "Gorokhovaya Street", "Kamennoostrovsky Prospekt", "Vyborgskaya Embankment",
                     "Moskovsky Prospekt", "Ligovsky Prospekt", "Maly Prospekt", "Bolshoy Prospekt",
                     "Sredny Prospekt", "Shpalernaya Street"],
        "districts": ["Central", "Admiralteysky", "Vasileostrovsky", "Petrogradsky", "Vyborgsky",
                      "Kalininsky", "Krasnogvardeysky", "Nevsky", "Moskovsky", "Frunzensky"],
    },
    "Kazan": {
        "country": "Russia", "center": (55.8304, 49.0661),
        "streets": ["Bauman Street", "Pushkin Street", "Prospekt Pobedy", "Peterburgskaya Street", "Gogol Street",
                     "Kremlyovskaya Street", "Butlerova Street", "Chistopolskaya Street", "Sibgat Khakim Street", "Adoratskogo Street"],
        "districts": ["Vakhitovsky", "Novo-Savinovsky", "Moskovsky", "Aviastroitelny", "Sovetsky",
                      "Privolzhsky", "Kirovsky", "Kazan Kremlin", "Derbyshki", "Gorki"],
    },
    "Sochi": {
        "country": "Russia", "center": (43.5994, 39.7305),
        "streets": ["Navaginskaya Street", "Kurortny Prospekt", "Voikova Street", "Gorkogo Street", "Ordzhonikidze Street",
                     "Plastunskaya Street", "Vinogradnaya Street", "Transportnaya Street", "Donskaya Street", "Lenina Street"],
        "districts": ["Central", "Lazarevskoye", "Khosta", "Adler", "Dagomys",
                      "Krasnaya Polyana", "Matsesta", "Svetlana", "Sochi Center", "Riviera"],
    },
    "Yekaterinburg": {
        "country": "Russia", "center": (56.8389, 60.6030),
        "streets": ["Lenina Prospekt", "8 Marta Street", "Malysheva Street", "Belinskogo Street", "Shartashskaya Street",
                     "Karla Marksa Street", "Vostochnaya Street", "Moskovskaya Street", "Amundsena Street", "Sverdlova Street"],
        "districts": ["Center", "Zheleznodorozhny", "Chkalovsky", "Ordzhonikidzevsky", "Verkh-Isetsky",
                      "Kirovsky", "Leninsky", "Oktyabrsky", "Akademichesky", "Elmash"],
    },
}

PROPERTY_TYPES = ["Apartment", "House", "Studio", "Townhouse", "Penthouse", "Loft", "Duplex"]
PURPOSES = ["sale", "rent", "daily_rent"]
REPAIR_TYPES = ["cosmetic", "designer", "no repair", "euro", "premium"]
MATERIALS = ["panel", "brick", "monolith", "block", "wood"]
ROOM_TYPES = ["separated", "adjacent", "open plan"]
IS_NEW_OPTIONS = ["new building", "secondary", "under construction"]

PROPERTIES_PER_CITY = 50
TOTAL_PROPERTIES = len(CITIES) * PROPERTIES_PER_CITY  # 15 * 50 = 750

USERS = [
    {"email": "sarah@example.com", "name": "Sarah Johnson", "phone": "+447700900001"},
    {"email": "michael@example.com", "name": "Michael Chen", "phone": "+12125550001"},
    {"email": "emma@example.com", "name": "Emma Williams", "phone": "+33750010001"},
    {"email": "alex@example.com", "name": "Alex Müller", "phone": "+49305000001"},
    {"email": "olivia@example.com", "name": "Olivia Brown", "phone": "+81390000001"},
    {"email": "dmitry@example.com", "name": "Dmitry Volkov", "phone": "+74951230001"},
    {"email": "anna@example.com", "name": "Anna Petrova", "phone": "+78121230001"},
    {"email": "maria@example.com", "name": "Maria Rossi", "phone": "+39061234567"},
]

TITLES = {
    "Studio": ["Modern Studio", "Cozy Studio", "Bright Studio", "Compact Studio", "Urban Studio",
               "Stylish Studio", "Sunny Studio", "Charming Studio", "Contemporary Studio", "Elegant Studio"],
    "Apartment": ["Spacious Apartment", "Modern Apartment", "Bright Apartment", "Cozy Apartment",
                  "Elegant Apartment", "Stylish Apartment", "Sunny Apartment", "Charming Apartment",
                  "Contemporary Apartment", "Luxury Apartment", "Penthouse Apartment", "Garden Apartment"],
    "House": ["Spacious House", "Modern House", "Family House", "Garden House", "Charming House",
              "Contemporary House", "Sunny House", "Elegant House", "Cozy House", "Detached House",
              "Victorian House", "Country House", "Lake House", "Mountain House"],
    "Townhouse": ["Modern Townhouse", "Spacious Townhouse", "Bright Townhouse", "Urban Townhouse",
                  "Contemporary Townhouse", "Family Townhouse", "Charming Townhouse", "Stylish Townhouse",
                  "Garden Townhouse", "Elegant Townhouse", "Corner Townhouse", "End Terrace Townhouse"],
    "Penthouse": ["Luxury Penthouse", "Sky Penthouse", "Penthouse Suite", "Panoramic Penthouse",
                  "Executive Penthouse", "Rooftop Penthouse", "Premium Penthouse", "Grand Penthouse"],
    "Loft": ["Industrial Loft", "Artist Loft", "Urban Loft", "Creative Loft", "Converted Loft",
             "Open Loft", "Warehouse Loft", "Modern Loft"],
    "Duplex": ["Spacious Duplex", "Modern Duplex", "Garden Duplex", "Sky Duplex", "Corner Duplex",
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

CATEGORY_OPTIONS = ["Studio", "1-bedroom", "2-bedroom", "3-bedroom", "4-bedroom", "5+ bedroom",
                    "Penthouse", "Duplex", "Garden Apartment", "Loft"]

FURNISHING_OPTIONS = ["fully furnished", "partially furnished", "unfurnished", "kitchen only"]
HEATING_OPTIONS = ["central", "individual gas", "electric", "underfloor", "autonomous"]
WINDOW_OPTIONS = ["street", "courtyard", "panoramic", "park view", "city view"]  # used in description variation
CONDITION_OPTIONS = ["excellent", "good", "requires renovation", "after renovation"]


def get_password_hash():
    return "$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5EwWqy7x7q7x7q7x7q7x7q7x7q7"


def get_property_images(prop_type, seed):
    colors = ["e6e6e6", "d4d4d4", "c0c0c0", "b0b0b0", "a0a0a0"]
    color = colors[seed % len(colors)]
    base_url = f"https://placehold.co/800x600/{color}/333333"
    return [
        f"{base_url}?text={prop_type}+{seed}+Front",
        f"{base_url}?text={prop_type}+{seed}+Living",
        f"{base_url}?text={prop_type}+{seed}+Kitchen",
        f"{base_url}?text={prop_type}+{seed}+Bedroom",
        f"{base_url}?text={prop_type}+{seed}+Bathroom",
    ]


def get_coords_fallback(city_center):
    base_lat, base_lon = city_center
    lat = base_lat + random.uniform(-0.02, 0.02)
    lon = base_lon + random.uniform(-0.02, 0.02)
    return lat, lon


def add_random_description_variation(desc):
    extras = [
        f" {random.choice(['Pet friendly', 'Quiet hours', 'No smoking', 'Student friendly'])}.",
        f" {random.choice(['Renovated in ' + str(random.randint(2018, 2024)) + '.', 'Recently painted.', 'New windows installed.'])}",
        f" {random.choice(['Nearby: metro station.', 'Close to bus stop.', 'Walking distance to supermarket.'])}",
        f" Ceiling height: {random.choice(['2.5', '2.7', '3.0', '3.5'])}m.",
        f" {random.choice(['Bathroom: separate.', 'Bathroom: combined.', 'Two bathrooms.'])}",
    ]
    return desc + random.choice(extras)


async def generate_property(city_name, city_data, user_id, prop_num):
    property_type = random.choice(PROPERTY_TYPES)
    street = random.choice(city_data["streets"])
    house_num = random.randint(1, 200)
    lat, lon = get_coords_fallback(city_data["center"])

    rooms = random.randint(1, 6) if property_type not in ("Studio", "Penthouse") else (
        1 if property_type == "Studio" else random.randint(2, 5)
    )
    area = round(random.uniform(25, 250), 1) if property_type != "House" else round(random.uniform(80, 400), 1)

    purpose = random.choice(PURPOSES)
    if purpose == "sale":
        price_mult = random.uniform(0.7, 1.5)
        if city_data["country"] in ("Russia",):
            price = round(random.uniform(3000000, 50000000) * price_mult, 2)
        elif city_data["country"] in ("Japan", "Singapore"):
            price = round(random.uniform(200000, 3000000) * price_mult, 2)
        else:
            price = round(random.uniform(50000, 2000000) * price_mult, 2)
    elif purpose == "rent":
        price = round(random.uniform(300, 8000), 2)
    else:
        price = round(random.uniform(50, 500), 2)

    title_prefix = random.choice(TITLES.get(property_type, TITLES["Apartment"]))
    if property_type == "Studio":
        category = "Studio"
    elif rooms == 1:
        category = "1-bedroom"
    elif rooms == 2:
        category = "2-bedroom"
    elif rooms == 3:
        category = "3-bedroom"
    elif rooms == 4:
        category = "4-bedroom"
    else:
        category = "5+ bedroom"

    base_desc = random.choice(DESCRIPTIONS)
    description = add_random_description_variation(base_desc)

    floor_max = random.randint(3, 40)
    floor = random.randint(1, floor_max)

    dist = random.choice(city_data["districts"])

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
        "district": dist,
        "metro": f"{dist} Station" if random.random() > 0.25 else None,
        "location": f"SRID=4326;POINT({lon} {lat})",
        "images": get_property_images(property_type, prop_num),
        "sq_living": round(area * random.uniform(0.5, 0.8), 1),
        "sq_kitchen": round(random.uniform(6, 20), 1),
        "build_year": random.randint(1950, 2025),
        "material": random.choice(MATERIALS),
        "repair_type": random.choice(REPAIR_TYPES),
        "room_type": random.choice(ROOM_TYPES),
        "is_new": random.choice(IS_NEW_OPTIONS),
        "balcony": random.choice(["yes", "no", "loggia"]),
        "parking": random.choice(["yes", "no", "underground", "guest"]),
        "views_count": random.randint(0, 1500),
        "likes_count": random.randint(0, 300),
        "created_at": datetime.now(timezone.utc),
    }


async def populate():
    from app.core.db import engine as db_engine

    print("=" * 60)
    print(f"Populating database with {TOTAL_PROPERTIES} properties")
    print(f"Cities: {len(CITIES)} ({', '.join(CITIES.keys())})")
    print("=" * 60)

    print("\nCreating users...")
    user_ids = []

    async with db_engine.begin() as conn:
        # clear existing
        await conn.execute(text("DELETE FROM interactions"))
        await conn.execute(text("DELETE FROM properties"))
        await conn.execute(text("DELETE FROM user_preferences"))
        await conn.execute(text("DELETE FROM users"))
        print("\nCleared existing data")

        for u in USERS:
            user_id = str(uuid.uuid4())
            await conn.execute(
                text("""
                    INSERT INTO users (id, email, hashed_password, full_name, phone_number, telegram_handle)
                    VALUES (:id, :email, :pwd, :name, :phone, :telegram)
                """),
                {
                    "id": user_id,
                    "email": u["email"],
                    "pwd": get_password_hash(),
                    "name": u["name"],
                    "phone": u["phone"],
                    "telegram": f"@{u['name'].split()[0].lower()}_{u['name'].split()[1].lower()[:4]}",
                },
            )
            user_ids.append(user_id)
            print(f"  ✓ {u['email']} ({u['name']})")

    async_session = sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    properties = []
    prop_num = 0

    geocode_errors = 0

    print(f"\nGenerating {TOTAL_PROPERTIES} properties...")

    for city_name, city_data in CITIES.items():
        print(f"\n  {city_name}, {city_data['country']} ({PROPERTIES_PER_CITY} props)...", end=" ")

        for i in range(PROPERTIES_PER_CITY):
            user_id = random.choice(user_ids)
            prop = await generate_property(city_name, city_data, user_id, prop_num)
            properties.append(prop)
            prop_num += 1

        print(f"done")

    random.shuffle(properties)

    print(f"\nInserting {len(properties)} properties into database...")

    async with async_session() as session:
        batch_size = 100
        for i in range(0, len(properties), batch_size):
            batch = properties[i : i + batch_size]
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
    print(f"  Total properties: {TOTAL_PROPERTIES}")
    print(f"  Cities: {len(CITIES)}")
    print(f"  Users: {len(USERS)}")
    print(f"  Users IDs:")
    for uid in user_ids:
        print(f"    {uid}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    asyncio.run(populate())
