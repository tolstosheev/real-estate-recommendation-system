from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional
from uuid import UUID

class UserBase(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")
    full_name: str = Field(..., example="John Doe")

class UserCreate(UserBase):
    password: str = Field(..., example="SecurePassword123!")

class UserOut(UserBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
