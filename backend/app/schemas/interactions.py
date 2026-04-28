from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from typing import Literal

class InteractionCreate(BaseModel):
    property_id: UUID = Field(..., example="550e8400-e29b-41d4-a716-446655440000")
    interaction_type: Literal["view", "like", "dislike"] = Field(..., example="like")

class InteractionOut(BaseModel):
    id: int
    user_id: UUID
    property_id: UUID
    interaction_type: str
    weight: int
    
    model_config = ConfigDict(from_attributes=True)
