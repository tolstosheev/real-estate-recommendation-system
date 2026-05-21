from sqlalchemy import Column, Integer, String, Boolean
from app.core.db import Base


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)


class RepairType(Base):
    __tablename__ = "repair_types"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)


class District(Base):
    __tablename__ = "districts"

    id = Column(Integer, primary_key=True)
    city = Column(String(100), nullable=False)
    name = Column(String(50), nullable=False)
    display_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)


class MetroStation(Base):
    __tablename__ = "metro_stations"

    id = Column(Integer, primary_key=True)
    city = Column(String(100), nullable=False)
    name = Column(String(100), nullable=False)
    line_color = Column(String(20))
    is_active = Column(Boolean, default=True)
