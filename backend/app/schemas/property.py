from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from uuid import UUID


class PropertyBase(BaseModel):
    title: str = Field(..., json_schema_extra={"example": "Modern Apartment in City Center"})
    city: Optional[str] = Field(None, json_schema_extra={"example": "Москва"})
    description: Optional[str] = Field(
        None, json_schema_extra={"example": "A beautiful 2-bedroom apartment with a great view"}
    )
    price: float = Field(..., json_schema_extra={"example": 250000.00})
    rooms: Optional[int] = Field(None, json_schema_extra={"example": 2})
    area: Optional[float] = Field(None, json_schema_extra={"example": 65.5})
    floor: Optional[int] = Field(None, json_schema_extra={"example": 5})
    total_floors: Optional[int] = Field(None, json_schema_extra={"example": 10})
    property_type: Optional[str] = Field(None, json_schema_extra={"example": "Apartment"})
    property_purpose: Optional[str] = Field(None, json_schema_extra={"example": "sale"})
    category: Optional[str] = Field(None, json_schema_extra={"example": "2-к квартира"})
    address: str = Field(..., json_schema_extra={"example": "123 Main St, New York, NY"})
    district: Optional[str] = Field(None, json_schema_extra={"example": "Центральный"})
    metro: Optional[str] = Field(None, json_schema_extra={"example": "Пушкинская"})
    lat: float = Field(0.0)
    lon: float = Field(0.0)
    images: Optional[List[str]] = Field(
        None,
        json_schema_extra={
            "example": [
                "https://example.com/img1.jpg",
                "https://example.com/img2.jpg",
            ]
        },
    )
    sq_living: Optional[float] = Field(None, json_schema_extra={"example": 40.5})
    sq_kitchen: Optional[float] = Field(None, json_schema_extra={"example": 12.0})
    build_year: Optional[int] = Field(None, json_schema_extra={"example": 2015})
    material: Optional[str] = Field(None, json_schema_extra={"example": "кирпич"})
    repair_type: Optional[str] = Field(None, json_schema_extra={"example": "евро"})
    room_type: Optional[str] = Field(None, json_schema_extra={"example": "изолированные"})
    is_new: Optional[str] = Field(None, json_schema_extra={"example": "новостройка"})
    balcony: Optional[str] = Field(None, json_schema_extra={"example": "есть"})
    parking: Optional[str] = Field(None, json_schema_extra={"example": "есть"})


class PropertyCreate(PropertyBase):
    pass


class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    rooms: Optional[int] = None
    area: Optional[float] = None
    floor: Optional[int] = None
    total_floors: Optional[int] = None
    property_type: Optional[str] = None
    property_purpose: Optional[str] = None
    category: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    metro: Optional[str] = None
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lon: Optional[float] = Field(None, ge=-180, le=180)
    images: Optional[List[str]] = None
    sq_living: Optional[float] = None
    sq_kitchen: Optional[float] = None
    build_year: Optional[int] = None
    material: Optional[str] = None
    repair_type: Optional[str] = None
    room_type: Optional[str] = None
    is_new: Optional[str] = None
    balcony: Optional[str] = None
    parking: Optional[str] = None


class OwnerOut(BaseModel):
    id: UUID
    full_name: str
    phone_number: Optional[str]
    telegram_handle: Optional[str]
    model_config = ConfigDict(from_attributes=True)


class PropertyOut(BaseModel):
    id: UUID
    title: str
    city: Optional[str] = None
    description: Optional[str] = None
    price: float
    rooms: Optional[int] = None
    area: Optional[float] = None
    floor: Optional[int] = None
    total_floors: Optional[int] = None
    property_type: Optional[str] = None
    property_purpose: Optional[str] = None
    category: Optional[str] = None
    address: str
    district: Optional[str] = None
    metro: Optional[str] = None
    lat: Optional[float] = 0.0
    lon: Optional[float] = 0.0
    images: Optional[List[str]] = None
    sq_living: Optional[float] = None
    sq_kitchen: Optional[float] = None
    build_year: Optional[int] = None
    material: Optional[str] = None
    repair_type: Optional[str] = None
    room_type: Optional[str] = None
    is_new: Optional[str] = None
    balcony: Optional[str] = None
    parking: Optional[str] = None
    owner: Optional[OwnerOut] = None
    views_count: int = 0
    likes_count: int = 0
    is_liked_by_me: bool = False

    model_config = ConfigDict(from_attributes=True)
