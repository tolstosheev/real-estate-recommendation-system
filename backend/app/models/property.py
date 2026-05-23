import uuid

from geoalchemy2 import Geometry
from sqlalchemy import ARRAY, Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.db import Base


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
    property_type = Column(String)
    property_purpose = Column(String)
    category = Column(String)
    address = Column(String)
    district = Column(String)
    metro = Column(String)
    location = Column(Geometry("POINT", 4326))
    images = Column(ARRAY(String))  # type: ignore[var-annotated]
    sq_living = Column(Numeric)
    sq_kitchen = Column(Numeric)
    build_year = Column(Integer)
    material = Column(String)
    repair_type = Column(String)
    room_type = Column(String)
    is_new = Column(String)
    balcony = Column(String)
    parking = Column(String)
    views_count = Column(Integer, default=0, server_default='0')
    likes_count = Column(Integer, default=0, server_default='0')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
