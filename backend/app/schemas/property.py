from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from uuid import UUID


class PropertyBase(BaseModel):
    title: str = Field(..., json_schema_extra={
                       "example": "Modern Apartment in City Center"})
    description: Optional[str] = Field(
        None, json_schema_extra={
            "example": "A beautiful 2-bedroom apartment with a great view"})
    price: float = Field(..., json_schema_extra={"example": 250000.00})
    rooms: Optional[int] = Field(None, json_schema_extra={"example": 2})
    area: Optional[float] = Field(None, json_schema_extra={"example": 65.5})
    floor: Optional[int] = Field(None, json_schema_extra={"example": 5})
    total_floors: Optional[int] = Field(
        None, json_schema_extra={"example": 10})
    property_type: Optional[str] = Field(
        None, json_schema_extra={
            "example": "Apartment"})
    address: str = Field(..., json_schema_extra={
                         "example": "123 Main St, New York, NY"})
    lat: Optional[float] = Field(
        None,
        ge=-90,
        le=90,
        json_schema_extra={
            "example": 40.7128})
    lon: Optional[float] = Field(
        None,
        ge=-180,
        le=180,
        json_schema_extra={
            "example": -74.0060})
    images: Optional[List[str]] = Field(
        None,
        json_schema_extra={
            "example": [
                "https://example.com/img1.jpg",
                "https://example.com/img2.jpg",
            ]
        }
    )


class PropertyCreate(PropertyBase):
    pass


class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    rooms: Optional[int] = None
    area: Optional[float] = None
    floor: Optional[int] = None
    total_floors: Optional[int] = None
    property_type: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lon: Optional[float] = Field(None, ge=-180, le=180)
    images: Optional[List[str]] = None


class OwnerOut(BaseModel):
    id: UUID
    full_name: str
    phone_number: Optional[str]
    telegram_handle: Optional[str]
    model_config = ConfigDict(from_attributes=True)


class PropertyOut(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    price: float
    rooms: Optional[int]
    area: Optional[float]
    floor: Optional[int]
    total_floors: Optional[int]
    property_type: Optional[str]
    address: str
    lat: float
    lon: float
    images: Optional[List[str]]
    owner: OwnerOut

    model_config = ConfigDict(from_attributes=True)
