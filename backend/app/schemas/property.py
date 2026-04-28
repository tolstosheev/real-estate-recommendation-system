from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

class PropertyBase(BaseModel):
    title: str = Field(..., example="Modern Apartment in City Center")
    description: Optional[str] = Field(None, example="A beautiful 2-bedroom apartment with a great view")
    price: Decimal = Field(..., example=250000.00)
    rooms: Optional[int] = Field(None, example=2)
    area: Optional[Decimal] = Field(None, example=65.5)
    floor: Optional[int] = Field(None, example=5)
    total_floors: Optional[int] = Field(None, example=10)
    property_type: Optional[str] = Field(None, example="Apartment")
    address: str = Field(..., example="123 Main St, New York, NY")
    lat: float = Field(..., ge=-90, le=90, example=40.7128)
    lon: float = Field(..., ge=-180, le=180, example=-74.0060)
    images: Optional[List[str]] = Field(None, example=["https://example.com/img1.jpg", "https://example.com/img2.jpg"])

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
