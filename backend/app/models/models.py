import uuid
from sqlalchemy import Column, String, Numeric, Integer, ForeignKey, DateTime, ARRAY, JSON
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from sqlalchemy.sql import func
from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    phone_number = Column(String)
    telegram_handle = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Property(Base):
    __tablename__ = "properties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    city = Column(String)
    description = Column(String)
    price = Column(Numeric, nullable=False)
    rooms = Column(Integer)
    area = Column(Numeric)
    floor = Column(Integer)
    total_floors = Column(Integer)
    property_type = Column(String)  # Apartment, House, Studio, Townhouse
    property_purpose = Column(String)  # sale, rent
    category = Column(String)  # 1-к квартира, Студия, etc.
    address = Column(String)
    district = Column(String)  # район
    metro = Column(String)  # метро
    location = Column(Geometry("POINT", 4326))
    images = Column(ARRAY(String))
    # Дополнительные площади
    sq_living = Column(Numeric)  # жилая площадь
    sq_kitchen = Column(Numeric)  # площадь кухни
    # Характеристики здания
    build_year = Column(Integer)  # год постройки
    material = Column(String)  # материал (панель, кирпич, монолит)
    repair_type = Column(String)  # тип ремонта (косметический, дизайнерский, без ремонта)
    room_type = Column(String)  # тип комнат (смежные, изолированные)
    is_new = Column(String)  # новостройка или вторичка
    # Удобства
    balcony = Column(String)  # наличие балкона
    parking = Column(String)  # наличие парковки
    views_count = Column(Integer, default=0)
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserPreference(Base):
    __tablename__ = "user_preferences"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    min_price = Column(Numeric)
    max_price = Column(Numeric)
    min_area = Column(Numeric)
    max_area = Column(Numeric)
    preferred_rooms = Column(ARRAY(Integer))
    property_types = Column(ARRAY(String))
    property_purposes = Column(ARRAY(String))
    cities = Column(ARRAY(String))
    tags = Column(ARRAY(String))
    priority_weight = Column(JSON)
    material = Column(String)
    repair_type = Column(String)
    min_build_year = Column(Integer)
    max_build_year = Column(Integer)


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=False)
    interaction_type = Column(String)
    weight = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
