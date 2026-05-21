import uuid
from sqlalchemy import Column, String, Numeric, Integer, ForeignKey, DateTime, ARRAY, JSON
from sqlalchemy.dialects.postgresql import UUID
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
    material = Column(ARRAY(String))
    repair_type = Column(ARRAY(String))
    min_build_year = Column(Integer)
    max_build_year = Column(Integer)
