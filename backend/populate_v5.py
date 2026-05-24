import asyncio
import logging
import random
import uuid
from datetime import UTC, datetime, timedelta
from math import log

import bcrypt
import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.category import compute_category
from app.core.config import settings
from app.core.db import engine as db_engine

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("populate_v5")

PASSWORD = "TestPass123"
PROPERTIES_PER_CITY = 56

IMAGES_PER_PROPERTY = 5

UNSPLASH_FALLBACK_IDS = [
    "1502672260266-1c1ef2d93688", "1522708323590-d24dbb6b0267",
    "1583847268964-b28dc8f51f92", "1674815329488-c4fc6bf4ced8",
    "1586023492125-27b2c045efd7", "1564078516393-cf04bd966897",
    "1676321046262-4978a752fb15", "1484154218962-a197022b5858",
    "1585128792020-803d29415281", "1493809842364-78817add7ffb",
    "1676823553207-758c7a66e9bb", "1613575831056-0acd5da8f085",
    "1628592102751-ba83b0314276", "1675279200694-8529c73b1fd0",
    "1674676471417-07f613528a94", "1512918728675-ed5a9ecdebfd",
    "1665249934445-1de680641f50", "1689609950112-d66095626efb",
    "1570129477492-45c003edd2be", "1600596542815-ffad4c1539a9",
    "1580587771525-78b9dba3b914", "1661915661139-5b6a4e4a6fcc",
    "1598228723793-52759bba239c", "1568605114967-8130f3a36994",
    "1583608205776-bfd35f0d9f83", "1661908377130-772731de98f6",
    "1523217582562-09d0def993a6", "1512917774080-9991f1c4c750",
    "1605276374104-dee2a0ed3cd6", "1661883964999-c1bcb57a7357",
    "1628624747186-a941c476b7ef", "1605146769289-440113cc3d00",
    "1592595896616-c37162298647", "1661954372617-15780178eb2e",
    "1511452885600-a3d2c9148a31", "1602343168117-bb8ffe3e2e9f",
    "1672423154405-5fd922c11af2", "1479839672679-a46483c0e7c8",
    "1488972685288-c3fd157d7c7a", "1527576539890-dfa815648363",
    "1693966067602-9ca1f56695c0", "1518005020951-eccb494ad742",
    "1460574283810-2aab119d8511", "1693966067391-98babaeecf52",
    "1486718448742-163732cd1544", "1483366774565-c783b9f70e2c",
    "1456930266018-fda42f7404a7", "1680281936362-aff258ecd143",
    "1496307653780-42ee777d4833", "1567943183748-3a7542120c90",
    "1598818384697-62330d600309", "1711132342072-67d65ee8c818",
    "1582045253062-f63cfbd45bcb", "1611816055460-618287c870bd",
    "1777920526943-f81e73e6198b", "1778546977770-f6c609485be0",
    "1778034342784-e97de7ed1b5e", "1680382578857-c331ead9ed51",
    "1600489000022-c2086d79f9d4", "1622372738946-62e02505feb3",
    "1602028915047-37269d1a73f7", "1678375722686-c7ea507c3003",
    "1632583824020-937ae9564495", "1617228069096-4638a7ffc906",
    "1565538810643-b5bdb714032a", "1661317296820-16fd638ee06f",
    "1502005097973-6a7082348e28", "1588854337221-4cf9fa96059c",
    "1628797285815-453c1d0d21e3", "1683917067889-c88599491d5c",
    "1600684388091-627109f3cd60", "1588854337236-6889d631faa8",
    "1661963167025-ca61fd6b36d8", "1565183928294-7063f23ce0f8",
    "1722605090433-41d1183a792d", "1609347744403-2306e8a9ae27",
    "1777116603323-ee9f48e5fbb7", "1675537843200-78c1a0ea1736",
    "1616594039964-ae9021a400a0", "1615874959474-d609969a20ed",
    "1616486029423-aaa4789e8c9a", "1618220179428-22790b461013",
    "1670360414483-64e6d9ba9038", "1616047006789-b7af5afb8c20",
    "1671269704807-5479855d03fe", "1595526114035-0d45ed16cfbf",
    "1616046229478-9901c5536a45", "1683120852623-143817d6400b",
    "1566665797739-1674de7a421a", "1618221118493-9cfa1a1c00da",
    "1676968002767-1f6a09891350", "1586105251261-72a756497a11",
    "1617098900591-3f90928e8c54", "1661902468735-eabf780f8ff6",
    "1584622650111-993a426fbf0a", "1631889993959-41b4e9c6e3c5",
    "1620626011761-996317b8d101", "1676320514136-5a15d9f97dfa",
    "1507652313519-d4e9174996dd", "1643949719317-4342d8d4031e",
    "1576698483491-8c43f0862543", "1681487208776-e308bfaa0539",
    "1629079447777-1e605162dc8d", "1661107259637-4e1c55462428",
    "1521783593447-5702b9bfd267", "1683134280183-e379783adb3f",
    "1600488999585-e4364713b90a", "1603825491103-bd638b1873b0",
    "1595514535116-d0401260e7cf", "1675616575244-54ab4547a929",
    "1733426107854-ee00a25d72a7", "1650894622076-e09ab837c502",
    "1631048499052-e6d9f305d2c0", "1676823547752-1d24e8597047",
    "1631679706909-1844bbd07221", "1683141170332-d7529337265c",
    "1598928506311-c55ded91a20c", "1605774337664-7a846e9cdf17",
    "1632829882891-5047ccc421bc", "1618221195710-dd6b41faaea6",
    "1615800002234-05c4d488696c", "1600121848594-d8644e57abab",
    "1778493011221-c7f3941f4816", "1613490493576-7fde63acd811",
    "1531971589569-0d9370cbe1e5", "1661963657305-f52dcaeef418",
    "1670589953882-b94c9cb380f5", "1721815693498-cc28507c0ba2",
    "1628012209120-d9db7abf7eab", "1613977257363-707ba9348227",
    "1628745277862-bc0b2d68c50c", "1682377521625-c656fc1ff3e1",
    "1627141234469-24711efb373c", "1513584684374-8bab748fbf90",
    "1706808849780-7a04fbac83ef", "1661876449499-26de7959878f",
    "1599777560450-e462cffc5368", "1628744448840-55bdb2497bd4",
    "1779126931870-7f30c215c2ae", "1678903964473-1271ecfb0288",
    "1745794621090-d856c53b0cc2", "1582407947304-fd86f028f716",
    "1748228885250-49564b614db9", "1663089688180-444ff0066e5d",
    "1486406146926-c627a92ad1ab", "1634344656611-0773d8dbbe2c",
    "1680281937048-735543c5c0f7", "1448630360428-65456885c650",
    "1564767609342-620cb19b2357", "1679856789403-c6fd2d5ec83c",
    "1565402170291-8491f14678db", "1593696140826-c58b021acf8b",
    "1592595896551-12b371d546d5", "1606744837616-56c9a5c6a6eb",
    "1681113076872-c74b8926e70c", "1606744824163-985d376605aa",
    "1567016376408-0226e4d0c1ea", "1684348962314-64fa628992f0",
    "1664711942326-2c3351e215e6", "1599696848652-f0ff23bc911f",
    "1606744888344-493238951221", "1671269941569-7841144ee4e0",
    "1618219908412-a29a1bb7b86e", "1778168968332-bf5097f49a64",
    "1777848334511-804ebef03ccc", "1777715329605-79e61ab03728",
    "1779464433263-35e2c02d1cc8", "1556020685-ae41abfc9365",
    "1560419450-a53fe3b90211", "1684175656320-5c3f701c082c",
    "1560448204-e02f11c3d0e2", "1560185893-a55cbc8c57e8",
    "1559554704-0f74b35a8718", "1745794621090-d856c53b0cc2",
    "1778163265411-310265f46196",
]

PEXELS_QUERIES = [
    "apartment+interior",
    "house+exterior+architecture",
    "modern+kitchen+interior",
    "bedroom+bathroom+interior",
]


async def _fetch_pexels_image_urls() -> list[str]:
    api_key = settings.PEXELS_API_KEY
    if not api_key:
        logger.info("  PEXELS_API_KEY not set, using Unsplash fallback")
        return []

    urls = []
    async with httpx.AsyncClient(timeout=15) as client:
        for query in PEXELS_QUERIES:
            try:
                resp = await client.get(
                    f"https://api.pexels.com/v1/search?query={query}&per_page=80",
                    headers={"Authorization": api_key},
                )
                if resp.status_code == 200:
                    batch = [p["src"]["medium"] for p in resp.json()["photos"]]
                    urls.extend(batch)
                    logger.info(f"  Pexels «{query}»: {len(batch)} photos")
                else:
                    logger.warning(f"  Pexels «{query}»: HTTP {resp.status_code}")
            except Exception as e:
                logger.warning(f"  Pexels «{query}» failed: {e}")

    if not urls:
        logger.info("  No Pexels photos fetched, will use Unsplash fallback")

    return urls


def _build_image_pool(pexels_urls: list[str]) -> list[str]:
    if pexels_urls:
        return pexels_urls
    return [
        f"https://images.unsplash.com/photo-{id}?w=800&h=600&fit=crop"
        for id in UNSPLASH_FALLBACK_IDS
    ]


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
    {"email": "elena.petrova@example.com", "name": "Elena Petrova", "phone": "+79161234501", "telegram": "@elena_p"},
    {"email": "sergey.ivanov@example.com", "name": "Sergey Ivanov", "phone": "+79261234502", "telegram": "@sergey_i"},
    {"email": "anna.smirnova@example.com", "name": "Anna Smirnova", "phone": "+79361234503", "telegram": "@anna_s"},
    {"email": "dmitry.kozlov@example.com", "name": "Dmitry Kozlov", "phone": "+79461234504", "telegram": "@dmitry_k"},
    {"email": "olga.morozova@example.com", "name": "Olga Morozova", "phone": "+79561234505", "telegram": "@olga_m"},
    {"email": "alexey.volkov@example.com", "name": "Alexey Volkov", "phone": "+79661234506", "telegram": "@alexey_v"},
    {"email": "maria.sokolova@example.com", "name": "Maria Sokolova", "phone": "+79761234507", "telegram": "@maria_s"},
    {"email": "ivan.pavlov@example.com", "name": "Ivan Pavlov", "phone": "+79861234508", "telegram": "@ivan_p"},
    {"email": "tatiana.popova@example.com", "name": "Tatiana Popova", "phone": "+79961234509", "telegram": "@tatiana_p"},
    {"email": "nikolay.romanov@example.com", "name": "Nikolay Romanov", "phone": "+79011234510", "telegram": "@nikolay_r"},
    {"email": "ekaterina.fedorova@example.com", "name": "Ekaterina Fedorova", "phone": "+79021234511", "telegram": "@ekaterina_f"},
    {"email": "mikhail.kuznetsov@example.com", "name": "Mikhail Kuznetsov", "phone": "+79031234512", "telegram": "@mikhail_k"},
    {"email": "olga.zaitseva@example.com", "name": "Olga Zaitseva", "phone": "+79041234513", "telegram": "@olga_z"},
    {"email": "andrey.sokolov@example.com", "name": "Andrey Sokolov", "phone": "+79051234514", "telegram": "@andrey_s"},
    {"email": "natalia.belova@example.com", "name": "Natalia Belova", "phone": "+79061234515", "telegram": "@natalia_b"},
    {"email": "vladimir.medvedev@example.com", "name": "Vladimir Medvedev", "phone": "+79071234516", "telegram": "@vladimir_m"},
    {"email": "irina.novikova@example.com", "name": "Irina Novikova", "phone": "+79081234517", "telegram": "@irina_n"},
    {"email": "pavel.zaicev@example.com", "name": "Pavel Zaicev", "phone": "+79091234518", "telegram": "@pavel_z"},
    {"email": "svetlana.mikhailova@example.com", "name": "Svetlana Mikhailova", "phone": "+79101234519", "telegram": "@svetlana_m"},
    {"email": "denis.filippov@example.com", "name": "Denis Filippov", "phone": "+79111234520", "telegram": "@denis_f"},
    {"email": "alexandra.egorova@example.com", "name": "Alexandra Egorova", "phone": "+79121234521", "telegram": "@alexandra_e"},
    {"email": "maxim.titov@example.com", "name": "Maxim Titov", "phone": "+79131234522", "telegram": "@maxim_t"},
    {"email": "veronika.kiseleva@example.com", "name": "Veronika Kiseleva", "phone": "+79141234523", "telegram": "@veronika_k"},
    {"email": "artem.grigoriev@example.com", "name": "Artem Grigoriev", "phone": "+79151234524", "telegram": "@artem_g"},
    {"email": "daria.orlova@example.com", "name": "Daria Orlova", "phone": "+79161234525", "telegram": "@daria_o"},
    {"email": "roman.bogdanov@example.com", "name": "Roman Bogdanov", "phone": "+79171234526", "telegram": "@roman_b"},
    {"email": "yulia.sorokina@example.com", "name": "Yulia Sorokina", "phone": "+79181234527", "telegram": "@yulia_s"},
    {"email": "vitaly.kuzmin@example.com", "name": "Vitaly Kuzmin", "phone": "+79191234528", "telegram": "@vitaly_k"},
    {"email": "evgenia.vasilieva@example.com", "name": "Evgenia Vasilieva", "phone": "+79201234529", "telegram": "@evgenia_v"},
    {"email": "kirill.petrov@example.com", "name": "Kirill Petrov", "phone": "+79211234530", "telegram": "@kirill_p"},
    {"email": "anastasia.leonova@example.com", "name": "Anastasia Leonova", "phone": "+79221234531", "telegram": "@anastasia_l"},
    {"email": "evgeny.belov@example.com", "name": "Evgeny Belov", "phone": "+79231234532", "telegram": "@evgeny_b"},
    {"email": "marina.gromova@example.com", "name": "Marina Gromova", "phone": "+79241234533", "telegram": "@marina_g"},
    {"email": "stepan.efimov@example.com", "name": "Stepan Efimov", "phone": "+79251234534", "telegram": "@stepan_e"},
    {"email": "ludmila.semenova@example.com", "name": "Ludmila Semenova", "phone": "+79261234535", "telegram": "@ludmila_s"},
    {"email": "gleb.nikiforov@example.com", "name": "Gleb Nikiforov", "phone": "+79271234536", "telegram": "@gleb_n"},
    {"email": "polina.karpova@example.com", "name": "Polina Karpova", "phone": "+79281234537", "telegram": "@polina_k"},
    {"email": "anton.gerasimov@example.com", "name": "Anton Gerasimov", "phone": "+79291234538", "telegram": "@anton_g"},
    {"email": "tamara.sergeeva@example.com", "name": "Tamara Sergeeva", "phone": "+79301234539", "telegram": "@tamara_s"},
    {"email": "victor.lazarev@example.com", "name": "Victor Lazarev", "phone": "+79311234540", "telegram": "@victor_l"},
    {"email": "sofia.krylova@example.com", "name": "Sofia Krylova", "phone": "+79321234541", "telegram": "@sofia_k"},
    {"email": "grigory.vinogradov@example.com", "name": "Grigory Vinogradov", "phone": "+79331234542", "telegram": "@grigory_v"},
    {"email": "alisa.tarasova@example.com", "name": "Alisa Tarasova", "phone": "+79341234543", "telegram": "@alisa_t"},
    {"email": "timur.ignatov@example.com", "name": "Timur Ignatov", "phone": "+79351234544", "telegram": "@timur_i"},
    {"email": "vera.frolova@example.com", "name": "Vera Frolova", "phone": "+79361234545", "telegram": "@vera_f"},
    {"email": "konstantin.subbotin@example.com", "name": "Konstantin Subbotin", "phone": "+79371234546", "telegram": "@konstantin_s"},
    {"email": "lilia.makarova@example.com", "name": "Lilia Makarova", "phone": "+79381234547", "telegram": "@lilia_m"},
    {"email": "yaroslav.krylov@example.com", "name": "Yaroslav Krylov", "phone": "+79391234548", "telegram": "@yaroslav_k"},
    {"email": "nadezhda.golubeva@example.com", "name": "Nadezhda Golubeva", "phone": "+79401234549", "telegram": "@nadezhda_g"},
    {"email": "valentin.zhukov@example.com", "name": "Valentin Zhukov", "phone": "+79411234550", "telegram": "@valentin_z"},
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
BALCONY_OPTIONS = ["yes", "no", "loggia"]
PARKING_OPTIONS = ["yes", "no", "underground", "guest"]

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
    "Excellent property in a prime location. High-quality renovation, great infrastructure nearby. Walking distance to public transport, shops, and restaurants.",
    "Spacious living with modern layout. Schools, parks, and supermarkets within walking distance. Quiet neighborhood with friendly community.",
    "Cozy home in a quiet neighborhood. Well-developed infrastructure and convenient transport links. Perfect for families and professionals.",
    "Bright property with beautiful panoramic views. Quality finishes, built-in kitchen appliances, and smart home system installed.",
    "Great option for a family. Large rooms, spacious living-dining area, separate kitchen. Children's playground and green zone nearby.",
    "Modern property with premium finishes. Floor-to-ceiling windows, open plan layout with Italian marble floors and German kitchen.",
    "Recently renovated with designer interior. Perfect for professionals and couples. Fully furnished, ready to move in.",
    "Wonderful property near the city center. Excellent transport connections, 24/7 security, underground parking available.",
    "Stylish property with a private balcony and panoramic views. Quiet area yet close to all amenities. Ideal for remote work with high-speed internet.",
    "Investment opportunity in a rapidly developing area. High rental yield potential. New building with modern infrastructure.",
    "Charming property with character. High ceilings, original hardwood floors, exposed brick walls, and modern bathroom.",
    "Eco-friendly property with solar panels and energy-efficient systems. Smart home technology, water filtration, and climate control.",
    "Luxury property with premium amenities. Swimming pool, gym, concierge service, and private garden area for residents.",
    "Historic building with modern renovation. High ceilings, stucco moldings, fireplace, and renovated kitchen with premium appliances.",
]

PRICE_SQM = {
    "sale": {
        "Studio":     (4000, 0.4), "Apartment": (3500, 0.4),  "House": (2500, 0.45),
        "Townhouse":  (3000, 0.4), "Penthouse": (8000, 0.4),  "Loft":  (5000, 0.4),
        "Duplex":     (4000, 0.4),
    },
    "rent": {
        "Studio":     (45, 0.35), "Apartment": (28, 0.35),    "House": (20, 0.4),
        "Townhouse":  (22, 0.35), "Penthouse": (55, 0.35),    "Loft":  (35, 0.35),
        "Duplex":     (28, 0.35),
    },
    "daily_rent": {
        "Studio":     (1.8, 0.35), "Apartment": (1.1, 0.35),  "House": (0.8, 0.4),
        "Townhouse":  (0.9, 0.35), "Penthouse": (2.2, 0.35),  "Loft":  (1.4, 0.35),
        "Duplex":     (1.1, 0.35),
    },
}

AREA_RANGES = {
    "Studio": (18, 40), "Apartment": (30, 150), "House": (80, 400),
    "Townhouse": (60, 200), "Penthouse": (80, 300), "Loft": (50, 200), "Duplex": (70, 250),
}

ROOMS_BY_TYPE = {
    "Studio": (1, 1), "Apartment": (1, 5), "House": (2, 7),
    "Townhouse": (2, 5), "Penthouse": (2, 6), "Loft": (1, 3), "Duplex": (2, 5),
}


def _hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def _get_coords(city_center):
    base_lat, base_lon = city_center
    lat = base_lat + random.uniform(-0.025, 0.025)
    lon = base_lon + random.uniform(-0.025, 0.025)
    return lat, lon


def _generate_price(property_type: str, purpose: str, city_coef: float, currency: str, area: float) -> float:
    median, sigma = PRICE_SQM[purpose][property_type]
    mu = log(median)
    price_per_sqm = random.lognormvariate(mu, sigma)
    price = area * price_per_sqm * city_coef

    if currency == "RUB":
        price *= 100
    else:
        price *= 90

    if purpose == "sale":
        price = round(price / 10000) * 10000
    elif purpose == "rent":
        price = round(price / 500) * 500
    else:
        price = round(price / 50) * 50
    return max(1, price)


async def _generate_property(city_name: str, city_data: dict, user_id: str, prop_num: int,
                             image_pool: list[str]):
    property_type = random.choice(PROPERTY_TYPES_DIST)
    street = random.choice(city_data["streets"])
    house_num = random.randint(1, 200)
    lat, lon = _get_coords(city_data["center"])

    purpose = random.choice(PURPOSES)
    area_min, area_max = AREA_RANGES.get(property_type, (30, 100))
    area = round(random.uniform(area_min, area_max), 1)
    sq_living = round(area * random.uniform(0.5, 0.8), 1)
    sq_kitchen = round(random.uniform(6, 20), 1)

    price = _generate_price(property_type, purpose, city_data["price_coef"],
                            city_data.get("currency", "USD"), area)

    rooms = random.randint(*ROOMS_BY_TYPE.get(property_type, (1, 4)))
    category = compute_category(property_type, rooms)

    title_prefix = random.choice(TITLES_BY_TYPE.get(property_type, TITLES_BY_TYPE["Apartment"]))
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

    created_at = datetime.now(UTC) - timedelta(days=random.randint(0, 730))

    images = random.sample(image_pool, min(IMAGES_PER_PROPERTY, len(image_pool)))

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
        "metro": f"{district} Station" if random.random() > 0.25 else None,
        "location": f"SRID=4326;POINT({lon} {lat})",
        "images": images,
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
        "likes_count": random.randint(0, 30),
        "created_at": created_at,
    }


async def populate():
    total = len(CITIES) * PROPERTIES_PER_CITY
    logger.info("=" * 60)
    logger.info(f"Populating database with {total} properties")
    logger.info(f"Cities: {len(CITIES)}, Users: {len(USERS)}")
    logger.info(f"Password for all users: {PASSWORD}")
    logger.info("=" * 60)

    pexels_urls = await _fetch_pexels_image_urls()
    image_pool = _build_image_pool(pexels_urls)
    image_source = "Pexels" if pexels_urls else "Unsplash"
    logger.info(f"  Image pool: {len(image_pool)} photos from {image_source}")

    logger.info("\nCreating password hash...")
    password_hash = await asyncio.to_thread(_hash_password, PASSWORD)

    logger.info("\nCreating users...")
    user_ids = []
    async with db_engine.begin() as conn:
        for table in ("interactions", "user_preferences", "properties", "users"):
            await conn.execute(text(f"DELETE FROM {table}"))
        logger.info("  Cleared existing data")

        for u in USERS:
            user_id = str(uuid.uuid4())
            phone = u["phone"] if random.random() > 0.2 else None
            tg = u["telegram"] if random.random() > 0.3 else None
            await conn.execute(
                text("""
                    INSERT INTO users (id, email, hashed_password, full_name, phone_number, telegram_handle)
                    VALUES (:id, :email, :pwd, :name, :phone, :telegram)
                """),
                {"id": user_id, "email": u["email"], "pwd": password_hash,
                 "name": u["name"], "phone": phone, "telegram": tg},
            )
            user_ids.append(user_id)
        logger.info(f"  Created {len(user_ids)} users")

    async_session = sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    properties = []
    prop_num = 0

    for city_name, city_data in CITIES.items():
        logger.info(f"\n  {city_name} ({PROPERTIES_PER_CITY} props)...")
        for _i in range(PROPERTIES_PER_CITY):
            user_id = random.choice(user_ids)
            prop = await _generate_property(city_name, city_data, user_id, prop_num, image_pool)
            properties.append(prop)
            prop_num += 1

    random.shuffle(properties)

    logger.info(f"\nInserting {len(properties)} properties...")
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
            logger.info(f"  Inserted {min(i + batch_size, len(properties))}/{len(properties)}")

    prop_ids = [p["id"] for p in properties]

    logger.info("\nCreating user preferences for 5 users...")
    async with async_session() as session:
        pref_users = random.sample(user_ids, 5)
        pref_templates = [
            {"min_price": 50000, "max_price": 300000, "min_area": 30, "max_area": 100,
             "preferred_rooms": [1, 2, 3], "property_types": ["Apartment", "Studio"],
             "property_purposes": ["sale"], "cities": ["Moscow", "London"],
             "material": ["brick", "monolith"], "repair_type": ["euro", "designer"],
             "min_build_year": 2000, "max_build_year": 2025},
            {"min_price": 100000, "max_price": 500000, "min_area": 50, "max_area": 150,
             "preferred_rooms": [2, 3, 4], "property_types": ["Apartment", "House", "Townhouse"],
             "property_purposes": ["sale", "rent"], "cities": ["New York", "Paris", "London"],
             "material": ["brick", "monolith", "block"], "repair_type": ["premium", "designer"],
             "min_build_year": 2010, "max_build_year": 2025},
            {"min_price": 300, "max_price": 3000, "min_area": 20, "max_area": 80,
             "preferred_rooms": [1, 2], "property_types": ["Studio", "Apartment"],
             "property_purposes": ["rent", "daily_rent"], "cities": ["Berlin", "Barcelona", "Singapore"],
             "material": ["brick", "monolith"], "repair_type": ["cosmetic", "euro"],
             "min_build_year": 1990, "max_build_year": 2025},
            {"min_price": 200000, "max_price": 2000000, "min_area": 80, "max_area": 300,
             "preferred_rooms": [3, 4, 5], "property_types": ["House", "Penthouse", "Duplex"],
             "property_purposes": ["sale"], "cities": ["Tokyo", "Dubai", "Sydney"],
             "material": ["monolith", "brick", "brick-monolith"], "repair_type": ["premium", "designer"],
             "min_build_year": 2005, "max_build_year": 2025},
            {"min_price": 50, "max_price": 500, "min_area": 25, "max_area": 120,
             "preferred_rooms": [1, 2, 3], "property_types": ["Apartment", "Studio", "Loft"],
             "property_purposes": ["daily_rent"], "cities": ["Sochi", "Barcelona", "Dubai"],
             "material": ["brick", "monolith", "wood"], "repair_type": ["cosmetic", "euro", "designer"],
             "min_build_year": 2000, "max_build_year": 2025},
        ]
        for uid, tmpl in zip(pref_users, pref_templates):
            await session.execute(
                text("""
                    INSERT INTO user_preferences (
                        user_id, min_price, max_price, min_area, max_area,
                        preferred_rooms, property_types, property_purposes, cities,
                        material, repair_type, min_build_year, max_build_year
                    ) VALUES (
                        :user_id, :min_price, :max_price, :min_area, :max_area,
                        :preferred_rooms, :property_types, :property_purposes, :cities,
                        :material, :repair_type, :min_build_year, :max_build_year
                    )
                """),
                {"user_id": uid, **tmpl},
            )
        await session.commit()
    logger.info("  Created 5 user preferences")

    logger.info("\nCreating interactions...")
    total_likes = 0
    total_views = 0
    async with async_session() as session:
        for user_id in user_ids:
            n_likes = random.randint(5, 20)
            liked = random.sample(prop_ids, min(n_likes, len(prop_ids)))
            for pid in liked:
                await session.execute(
                    text("""
                        INSERT INTO interactions (user_id, property_id, interaction_type, weight)
                        VALUES (:uid, :pid, 'like', 5)
                    """),
                    {"uid": user_id, "pid": pid},
                )
                await session.execute(
                    text("UPDATE properties SET likes_count = likes_count + 1 WHERE id = :pid"),
                    {"pid": pid},
                )
                total_likes += 1

            n_views = random.randint(10, 30)
            viewed = random.sample(prop_ids, min(n_views, len(prop_ids)))
            for pid in viewed:
                if pid in liked:
                    continue
                await session.execute(
                    text("""
                        INSERT INTO interactions (user_id, property_id, interaction_type, weight)
                        VALUES (:uid, :pid, 'view', 1)
                    """),
                    {"uid": user_id, "pid": pid},
                )
                await session.execute(
                    text("UPDATE properties SET views_count = views_count + 1 WHERE id = :pid"),
                    {"pid": pid},
                )
                total_views += 1
        await session.commit()
    logger.info(f"  Created {total_likes} likes and {total_views} views")

    logger.info(f"\n{'=' * 60}")
    logger.info("POPULATION COMPLETE!")
    logger.info(f"  Total properties: {len(properties)}")
    logger.info(f"  Cities: {len(CITIES)}")
    logger.info(f"  Users: {len(USERS)}")
    logger.info(f"  Preferences: 5")
    logger.info(f"  Interactions: {total_likes + total_views}")
    logger.info(f"  Images: {image_source} ({len(image_pool)} unique)")
    logger.info(f"  Password for all users: {PASSWORD}")
    logger.info(f"{'=' * 60}")


if __name__ == "__main__":
    asyncio.run(populate())
