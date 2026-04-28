from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional
from uuid import UUID

class UserBase(BaseModel):
    email: EmailStr = Field(..., json_schema_extra={"example": "user@example.com"})
    full_name: str = Field(..., json_schema_extra={"example": "John Doe"})

class UserCreate(UserBase):
    password: str = Field(..., json_schema_extra={"example": "SecurePassword123!"})

class UserOut(UserBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
