from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from decimal import Decimal
from uuid import UUID

class UserPreferenceBase(BaseModel):
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    min_area: Optional[Decimal] = None
    preferred_rooms: Optional[List[int]] = None
    tags: Optional[List[str]] = None
    priority_weight: Optional[dict] = None

class UserPreferenceCreate(UserPreferenceBase):
    pass

class UserPreferenceOut(UserPreferenceBase):
    user_id: UUID
    model_config = ConfigDict(from_attributes=True)
