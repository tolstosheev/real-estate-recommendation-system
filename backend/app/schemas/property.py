from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PropertyBase(BaseModel):
    title: str = Field(..., json_schema_extra={"example": "Modern Apartment in City Center"})
    city: str | None = Field(None, json_schema_extra={"example": "London"})
    description: str | None = Field(
        None, json_schema_extra={"example": "A beautiful 2-bedroom apartment with a great view"}
    )
    price: float = Field(..., json_schema_extra={"example": 250000.00})
    rooms: int | None = Field(None, json_schema_extra={"example": 2})
    area: float | None = Field(None, json_schema_extra={"example": 65.5})
    floor: int | None = Field(None, json_schema_extra={"example": 5})
    total_floors: int | None = Field(None, json_schema_extra={"example": 10})
    property_type: str | None = Field(None, json_schema_extra={"example": "Apartment"})
    property_purpose: str | None = Field(None, json_schema_extra={"example": "sale"})
    category: str | None = Field(None, json_schema_extra={"example": "2-bedroom"})
    address: str = Field(..., json_schema_extra={"example": "123 Main St, New York, NY"})
    district: str | None = Field(None, json_schema_extra={"example": "Central"})
    metro: str | None = Field(None, json_schema_extra={"example": "Oxford Circus"})
    lat: float = Field(0.0, ge=-90, le=90)
    lon: float = Field(0.0, ge=-180, le=180)
    images: list[str] | None = Field(
        None,
        json_schema_extra={
            "example": [
                "https://example.com/img1.jpg",
                "https://example.com/img2.jpg",
            ]
        },
    )
    sq_living: float | None = Field(None, json_schema_extra={"example": 40.5})
    sq_kitchen: float | None = Field(None, json_schema_extra={"example": 12.0})
    build_year: int | None = Field(None, json_schema_extra={"example": 2015})
    material: str | None = Field(None, json_schema_extra={"example": "brick"})
    repair_type: str | None = Field(None, json_schema_extra={"example": "designer"})
    room_type: str | None = Field(None, json_schema_extra={"example": "separated"})
    is_new: str | None = Field(None, json_schema_extra={"example": "new building"})
    balcony: str | None = Field(None, json_schema_extra={"example": "yes"})
    parking: str | None = Field(None, json_schema_extra={"example": "yes"})


class PropertyCreate(PropertyBase):
    pass


class PropertyUpdate(BaseModel):
    title: str | None = None
    city: str | None = None
    description: str | None = None
    price: float | None = None
    rooms: int | None = None
    area: float | None = None
    floor: int | None = None
    total_floors: int | None = None
    property_type: str | None = None
    property_purpose: str | None = None
    category: str | None = None
    address: str | None = None
    district: str | None = None
    metro: str | None = None
    lat: float | None = Field(None, ge=-90, le=90)
    lon: float | None = Field(None, ge=-180, le=180)
    images: list[str] | None = None
    sq_living: float | None = None
    sq_kitchen: float | None = None
    build_year: int | None = None
    material: str | None = None
    repair_type: str | None = None
    room_type: str | None = None
    is_new: str | None = None
    balcony: str | None = None
    parking: str | None = None


class OwnerOut(BaseModel):
    id: UUID
    full_name: str
    phone_number: str | None = None
    telegram_handle: str | None = None
    model_config = ConfigDict(from_attributes=True)


class PropertyOut(BaseModel):
    id: UUID
    title: str
    city: str | None = None
    description: str | None = None
    price: float
    rooms: int | None = None
    area: float | None = None
    floor: int | None = None
    total_floors: int | None = None
    property_type: str | None = None
    property_purpose: str | None = None
    category: str | None = None
    address: str
    district: str | None = None
    metro: str | None = None
    lat: float | None = 0.0
    lon: float | None = 0.0
    images: list[str] | None = None
    sq_living: float | None = None
    sq_kitchen: float | None = None
    build_year: int | None = None
    material: str | None = None
    repair_type: str | None = None
    room_type: str | None = None
    is_new: str | None = None
    balcony: str | None = None
    parking: str | None = None
    owner: OwnerOut | None = None
    views_count: int = 0
    likes_count: int = 0
    is_liked_by_me: bool = False

    model_config = ConfigDict(from_attributes=True)
