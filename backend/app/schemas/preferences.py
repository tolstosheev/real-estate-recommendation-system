from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from decimal import Decimal
from uuid import UUID


class UserPreferenceBase(BaseModel):
    min_price: Optional[Decimal] = Field(None, json_schema_extra={"example": 100000.0})
    max_price: Optional[Decimal] = Field(None, json_schema_extra={"example": 500000.0})
    min_area: Optional[Decimal] = Field(None, json_schema_extra={"example": 50.0})
    preferred_rooms: Optional[List[int]] = Field(None, json_schema_extra={"example": [2, 3]})
    district: Optional[str] = Field(None, json_schema_extra={"example": "CAO"})
    metro: Optional[str] = Field(None, json_schema_extra={"example": "Tverskaya"})
    material: Optional[str] = Field(None, json_schema_extra={"example": "Brick"})
    repair_type: Optional[str] = Field(None, json_schema_extra={"example": "Euro"})
    min_build_year: Optional[int] = Field(None, json_schema_extra={"example": 2000})
    max_build_year: Optional[int] = Field(None, json_schema_extra={"example": 2023})


class UserPreferenceCreate(UserPreferenceBase):
    pass


class UserPreferenceOut(UserPreferenceBase):
    user_id: UUID
    model_config = ConfigDict(from_attributes=True)
