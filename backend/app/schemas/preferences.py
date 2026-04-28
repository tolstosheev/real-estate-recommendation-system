from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from decimal import Decimal
from uuid import UUID

class UserPreferenceBase(BaseModel):
    min_price: Optional[Decimal] = Field(None, example=100000.0)
    max_price: Optional[Decimal] = Field(None, example=500000.0)
    min_area: Optional[Decimal] = Field(None, example=50.0)
    preferred_rooms: Optional[List[int]] = Field(None, example=[2, 3])
    tags: Optional[List[str]] = Field(None, example=["modern", "center"])
    priority_weight: Optional[dict] = Field(None, example={"price": 0.5, "area": 0.3, "rooms": 0.2})

class UserPreferenceCreate(UserPreferenceBase):
    pass

class UserPreferenceOut(UserPreferenceBase):
    user_id: UUID
    model_config = ConfigDict(from_attributes=True)
