from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserPreferenceBase(BaseModel):
    min_price: Decimal | None = Field(None, json_schema_extra={"example": 100000.0})
    max_price: Decimal | None = Field(None, json_schema_extra={"example": 5000000.0})
    min_area: Decimal | None = Field(None, json_schema_extra={"example": 50.0})
    max_area: Decimal | None = Field(None, json_schema_extra={"example": 150.0})
    preferred_rooms: list[int] | None = Field(None, json_schema_extra={"example": [2, 3]})
    property_types: list[str] | None = Field(None, json_schema_extra={"example": ["Apartment", "House"]})
    property_purposes: list[str] | None = Field(None, json_schema_extra={"example": ["sale"]})
    cities: list[str] | None = Field(None, json_schema_extra={"example": ["Москва", "Санкт-Петербург"]})
    material: list[str] | None = Field(None, json_schema_extra={"example": ["Brick", "Monolith"]})
    repair_type: list[str] | None = Field(None, json_schema_extra={"example": ["Euro", "Design"]})
    min_build_year: int | None = Field(None, json_schema_extra={"example": 2000})
    max_build_year: int | None = Field(None, json_schema_extra={"example": 2023})


class UserPreferenceCreate(UserPreferenceBase):
    pass


class UserPreferenceOut(UserPreferenceBase):
    user_id: UUID
    model_config = ConfigDict(from_attributes=True)
