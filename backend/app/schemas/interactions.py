from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Literal

class InteractionCreate(BaseModel):
    property_id: UUID
    interaction_type: Literal["view", "like", "dislike"]

class InteractionOut(BaseModel):
    id: int
    user_id: UUID
    property_id: UUID
    interaction_type: str
    weight: int
    
    model_config = ConfigDict(from_attributes=True)
