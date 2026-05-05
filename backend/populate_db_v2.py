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
import random

# Реальные координаты для популярных улиц Москвы и Тулы
STREET_COORDS = {
    """Geocode using OpenStreetMap Nominatim (free, no key needed)"""
    base_url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": address,
        "format": "json",
        "limit": 1,
        "addressdetails": 1
    }
    headers = {
        "User-Agent": "RealEstateRecommendationSystem/1.0"
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(base_url, params=params, headers=headers, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            if data and len(data) > 0:
                lat = float(data[0]["lat"])
                lon = float(data[0]["lon"])
                return lat, lon
    except Exception as e:
        print(f"Nominatim error for {address}: {e}")
    return None

# Реалистичные адреса для Москвы и Тульской области (без координат!)
MOSCOW_ADDRESSES = [
    # ЦАО
    ("Москва", "ул. Тверская", 10, "Apartment"),
    ("Москва", "ул. Новый Арбат", 20, "Apartment"),
    ("Москва", "ул. Садовая-Кудринская", 15, "Apartment"),
    ("Москва", "Патриаршие пруды", 5, "Apartment"),
    ("Москва", "ул. Покровка", 12, "Apartment"),
    # САО
    ("Москва", "Ленинградский проспект", 30, "Apartment"),
    ("Москва", "ул. 1-я Ямская", 8, "Apartment"),
    ("Москва", "Дмитровское шоссе", 40, "Apartment"),
    # СВАО
    ("Москва", "проспект Мира", 50, "Apartment"),
    ("Москва", "Ярославское шоссе", 60, "Apartment"),
    # ВАО
    ("Москва", "ул. Сокольнический вал", 25, "Apartment"),
    ("Москва", "Измайловский проспект", 35, "Apartment"),
    # ЮВАО
    ("Москва", "Волгоградский проспект", 45, "Apartment"),
    ("Москва", "ул. Люблинская", 30, "Apartment"),
    # ЮАО
    ("Москва", "Варшавское шоссе", 55, "Apartment"),
    ("Москва", "Каширское шоссе", 48, "Apartment"),
    # ЮЗАО
    ("Москва", "Ленинский проспект", 42, "Apartment"),
    ("Москва", "ул. Профсоюзная", 38, "Apartment"),
    # ЗАО
    ("Москва", "Кутузовский проспект", 18, "Apartment"),
    ("Москва", "ул. Арбат", 7, "Apartment"),
    # СЗАО
    ("Москва", "ул. Народного Ополчения", 28, "Apartment"),
    ("Москва", "Хорошёвское шоссе", 35, "Apartment"),
    # НАО (Новая Москва)
    ("Москва", "Коммунарка", 4, "House"),
    ("Москва", "Троицк", 3, "House"),
]

TULA_ADDRESSES = [
    ("Тула", "пр. Ленина", 25, "Apartment"),
    ("Тула", "ул. Пролетарская", 18, "Apartment"),
    ("Тула", "ул. Октябрьская", 15, "Apartment"),
    ("Тула", "ул. Красноармейский проспект", 12, "Apartment"),
    ("Тула", "ул. Советская", 22, "Apartment"),
    ("Тула", "пос. Плановский", 6, "House"),
]

TULA_REGION_ADDRESSES = [
    ("Новомосковск", "ул. Комсомольская", 16, "Apartment"),
    ("Донской", "ул. Ленина", 12, "Apartment"),
    ("Алексин", "ул. Советская", 10, "Apartment"),
    ("Щёкино", "ул. Ленина", 14, "Apartment"),
    ("Ефремов", "ул. Ленина", 13, "Apartment"),
]

# Создаем список из 100 адресов с весами: Москва 70%, Тула 20%, область 10%
ALL_ADDRESSES = MOSCOW_ADDRESSES * 7 + TULA_ADDRESSES * 2 + TULA_REGION_ADDRESSES

# Параметры генерации по типам недвижимости
PROPERTY_PARAMS = {
    "Studio": {"price_range": (1_500_000, 5_000_000), "area_range": (15, 35), "rooms": 1},
    "Apartment": {"price_range": (3_000_000, 50_000_000), "area_range": (30, 150), "rooms_range": (1, 4)},
    "House": {"price_range": (5_000_000, 100_000_000), "area_range": (80, 400), "rooms_range": (3, 8)},
    "Townhouse": {"price_range": (8_000_000, 30_000_000), "area_range": (60, 200), "rooms_range": (2, 5)},
}

# Реалистичные названия для объектов
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

# Картинки-заглушки (placehold.co всегда работает)
def get_property_images(prop_type, seed):
    base_url = f"https://placehold.co/600x400/e6e6e6/333333"
    return [
        f"{base_url}?text={prop_type}+1",
        f"{base_url}?text={prop_type}+2",
        f"{base_url}?text={prop_type}+3",
    ]

# Реальные координаты для популярных улиц Москвы и Тулы
STREET_COORDS = {
    # Москва
    "ул. Тверская": (55.7611, 37.6111),
    "ул. Новый Арбат": (55.7500, 37.5900),
    "ул. Садовая-Кудринская": (55.7700, 37.5800),
    "Патриаршие пруды": (55.7600, 37.6000),
    "ул. Покровка": (55.7600, 37.6500),
    "Ленинградский проспект": (55.7900, 37.5400),
    "ул. 1-я Ямская": (55.7800, 37.5800),
    "Дмитровское шоссе": (55.8200, 37.5900),
    "проспект Мира": (55.7900, 37.6300),
    "Ярославское шоссе": (55.8400, 37.6600),
    "ул. Сокольнический вал": (55.7800, 37.6900),
    "Измайловский проспект": (55.7900, 37.7800),
    "Волгоградский проспект": (55.7300, 37.7300),
    "ул. Люблинская": (55.6900, 37.7300),
    "Варшавское шоссе": (55.6800, 37.6100),
    "Каширское шоссе": (55.6600, 37.6300),
    "Ленинский проспект": (55.7000, 37.5800),
    "ул. Профсоюзная": (55.6900, 37.5600),
    "Кутузовский проспект": (55.7400, 37.5200),
    "ул. Арбат": (55.7500, 37.6000),
    "ул. Народного Ополчения": (55.7700, 37.4700),
    "Хорошёвское шоссе": (55.7800, 37.5000),
    "Коммунарка": (55.5800, 37.4800),
    "Троицк": (55.4900, 37.1800),
    # Тула
    "пр. Ленина": (54.2000, 37.6200),
    "ул. Пролетарская": (54.2100, 37.6000),
    "ул. Октябрьская": (54.1900, 37.6400),
    "ул. Красноармейский проспект": (54.2200, 37.6100),
    "ул. Советская": (54.2000, 37.6300),
    "пос. Плановский": (54.1800, 37.5800),
    # Тульская область
    "ул. Комсомольская": (54.0500, 38.2700),  # Новомосковск
    "Донской, ул. Ленина": (53.9800, 38.3300),
    "Алексин, ул. Советская": (54.5000, 37.0700),
    "Щёкино, ул. Ленина": (53.6200, 37.5100),
    "Ефремов, ул. Ленина": (53.1500, 38.1000),
}

async def get_coordinates(geocoder, city, street, house):
    """Получить координаты из словаря или использовать центр города"""
    # Формируем ключ для поиска в словаре
    key = f"{street}"
    if city != "Москва":
        key = f"{city}, {street}"
    
    if key in STREET_COORDS:
        # Добавляем небольшой разброс (до 500м) чтобы объекты не накладывались друг на друга
        base_lat, base_lon = STREET_COORDS[key]
        lat = base_lat + random.uniform(-0.002, 0.002)
        lon = base_lon + random.uniform(-0.002, 0.002)
        return (lat, lon)
    
    # Если улицы нет в словаре, используем центр города
    city_centers = {
        "Москва": (55.7558, 37.6173),
        "Тула": (54.1961, 37.6182),
        "Новомосковск": (54.0500, 38.2700),
        "Донской": (53.9800, 38.3300),
        "Алексин": (54.5000, 37.0700),
        "Щёкино": (53.6200, 37.5100),
        "Ефремов": (53.1500, 38.1000),
    }
    
    if city in city_centers:
        base_lat, base_lon = city_centers[city]
        lat = base_lat + random.uniform(-0.01, 0.01)
        lon = base_lon + random.uniform(-0.01, 0.01)
        return (lat, lon)
    
    # Крайний случай - Москва центр
    return (55.7558, 37.6173)

async def populate():
    async with AsyncSession(engine) as session:
        # Очистка таблиц
        print("Очистка таблиц...")
        async with session.begin():
            await session.execute(text("TRUNCATE users, properties, user_preferences, interactions CASCADE"))
        
        auth_service = AuthService(session)
        
        # Создание пользователей
        print("Создание пользователей...")
        users_data = [
            {"email": "moscow_user@example.com", "name": "Александр", "phone": "+79011111111", "tg": "@alex_msk"},
            {"email": "tula_user@example.com", "name": "Елена", "phone": "+79022222222", "tg": "@elena_tula"},
            {"email": "family_man@example.com", "name": "Дмитрий", "phone": "+79033333333", "tg": "@dima_family"},
            {"email": "investor@example.com", "name": "Ольга", "phone": "+79044444444", "tg": "@olga_inv"},
            {"email": "student@example.com", "name": "Мария", "phone": "+79055555555", "tg": "@mary_stud"},
            {"email": "pensioner@example.com", "name": "Виктор", "phone": "+79066666666", "tg": "@victor_pen"},
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
                print(f"Создан пользователь: {u['email']}")
            except Exception as e:
                print(f"Ошибка создания пользователя {u['email']}: {e}")
        
        await session.commit()
        
        # Инициализация геокодера
        geocoder = GeocodingService()
        
        # Создание объектов недвижимости
        print("Создание объектов недвижимости (100 шт.)...")
        properties_data = []
        
        # Выбираем 100 случайных адресов из списка (с повторениями если нужно)
        selected_addresses = random.choices(ALL_ADDRESSES, k=100)
        
        for i, addr in enumerate(selected_addresses):
            city, street, house, prop_type = addr
            # Генерируем номер дома случайно если он был фиксированным
            if not isinstance(house, int):
                house = random.randint(1, 100)
            # Получаем координаты (с задержкой чтобы не перегрузить API)
            if i > 0 and i % 10 == 0:
                await asyncio.sleep(0.1)  # Небольшая задержка каждые 10 запросов
            
            try:
                lat, lon = await get_coordinates(geocoder, city, street, house)
            except Exception as e:
                print(f"Ошибка получения координат для {city}, {street}: {e}")
                lat, lon = default_coords
            
            # Генерируем параметры в зависимости от типа
            params = PROPERTY_PARAMS[prop_type]
            price_min, price_max = params["price_range"]
            area_min, area_max = params["area_range"]
            
            price = Decimal(random.randint(price_min, price_max))
            area = Decimal(random.randint(area_min, area_max))
            
            if "rooms_range" in params:
                rooms = random.randint(*params["rooms_range"])
            else:
                rooms = params["rooms"]
            
            # Номер этажа и этажность (для квартир)
            if prop_type in ["Apartment", "Studio"]:
                floor = random.randint(1, 25)
                total_floors = random.randint(floor, 30)
            else:
                floor = None
                total_floors = None
            
            # Название и описание
            title = random.choice(TITLES[prop_type])
            if prop_type == "Apartment":
                title = f"{title} в {city}"
            elif prop_type == "House":
                title = f"{title} в {city}"
            
            description = random.choice(DESCRIPTIONS)
            
            # Картинки
            images = get_property_images(prop_type, i)
            
            # Адрес строкой
            address = f"{city}, {street}, {house}"
            
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
                "address": address,
                "location": ST_GeomFromText(f"POINT({lon} {lat})", 4326),
                "images": images
            })
        
        # Добавление в БД
        print(f"Добавление {len(properties_data)} объектов в БД...")
        for p_data in properties_data:
            prop = Property(**p_data)
            session.add(prop)
        
        await session.commit()
        print(f"Создано {len(properties_data)} объектов недвижимости")
        
        # Создание предпочтений пользователей
        print("Создание предпочтений пользователей...")
        prefs = [
            # Moscow user - ищет квартиру в Москве подороже
            (created_user_ids[0], Decimal('5000000'), Decimal('30000000'), Decimal('40')),
            # Tula user - ищет недорогое жилье в Туле
            (created_user_ids[1], Decimal('1500000'), Decimal('8000000'), Decimal('30')),
            # Family man - большая квартира или дом
            (created_user_ids[2], Decimal('8000000'), Decimal('50000000'), Decimal('80')),
            # Investor - любые объекты для инвестиций
            (created_user_ids[3], Decimal('3000000'), Decimal('100000000'), Decimal('20')),
            # Student - бюджетное жилье
            (created_user_ids[4], Decimal('1000000'), Decimal('5000000'), Decimal('15')),
            # Pensioner - комфортное жилье без лестниц
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
        print("Предпочтения созданы")
        
        # Создание взаимодействий (лайки, просмотры)
        print("Создание взаимодействий...")
        for i, p_data in enumerate(properties_data):
            if i >= 50:  # Ограничим количество взаимодействий
                break
                
            # Первый пользователь лайкает недорогие объекты
            if p_data["price"] < Decimal('5000000'):
                session.add(Interaction(
                    user_id=created_user_ids[0], 
                    property_id=p_data["id"], 
                    interaction_type="like"
                ))
            
            # Второй пользователь лайкает объекты в Туле
            if "Тула" in p_data["address"]:
                session.add(Interaction(
                    user_id=created_user_ids[1], 
                    property_id=p_data["id"], 
                    interaction_type="like"
                ))
            
            # Третий пользователь лайкает большие объекты
            if p_data["area"] and p_data["area"] > 80:
                session.add(Interaction(
                    user_id=created_user_ids[2], 
                    property_id=p_data["id"], 
                    interaction_type="like"
                ))
            
            # Все пользователи "просматривают" случайные объекты
            if random.random() < 0.3:  # 30% вероятность просмотра
                viewer = random.choice(created_user_ids)
                session.add(Interaction(
                    user_id=viewer, 
                    property_id=p_data["id"], 
                    interaction_type="view"
                ))
        
        await session.commit()
        print("Взаимодействия созданы")
        
        print("\nЗаполнение базы данных завершено успешно!")
        print(f"Создано: {len(created_user_ids)} пользователей, {len(properties_data)} объектов недвижимости")

if __name__ == "__main__":
    asyncio.run(populate())
