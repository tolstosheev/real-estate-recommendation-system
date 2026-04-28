from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

class PropertyBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: Decimal
    rooms: Optional[int] = None
    area: Optional[Decimal] = None
    floor: Optional[int] = None
    total_floors: Optional[int] = None
    property_type: Optional[str] = None
    address: str
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    images: Optional[List[str]] = None

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    rooms: Optional[int] = None
    area: Optional[Decimal] = None
    floor: Optional[int] = None
    total_floors: Optional[int] = None
    property_type: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lon: Optional[float] = Field(None, ge=-180, le=180)
    images: Optional[List[str]] = None

class PropertyOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    price: Decimal
    rooms: Optional[int]
    area: Optional[Decimal]
    floor: Optional[int]
    total_floors: Optional[int]
    property_type: Optional[str]
    address: str
    lat: float
    lon: float
    images: Optional[List[str]]
    
    model_config = ConfigDict(from_attributes=True)
