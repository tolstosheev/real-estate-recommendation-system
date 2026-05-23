from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class InteractionCreate(BaseModel):
    property_id: UUID = Field(..., json_schema_extra={"example": "550e8400-e29b-41d4-a716-446655440000"})
    interaction_type: Literal["view", "like"] = Field(..., json_schema_extra={"example": "like"})
