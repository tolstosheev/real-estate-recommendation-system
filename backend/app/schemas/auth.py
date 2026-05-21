from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr = Field(..., json_schema_extra={"example": "user@example.com"})
    full_name: str = Field(..., json_schema_extra={"example": "John Doe"})
    phone_number: str | None = Field(None, json_schema_extra={"example": "+79991234567"})
    telegram_handle: str | None = Field(None, json_schema_extra={"example": "@username"})


class UserCreate(UserBase):
    password: str = Field(..., json_schema_extra={"example": "SecurePassword123!"})


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, json_schema_extra={"example": "John Doe"})
    phone_number: str | None = Field(None, json_schema_extra={"example": "+79991234567"})
    telegram_handle: str | None = Field(None, json_schema_extra={"example": "@username"})
    model_config = ConfigDict(from_attributes=True)


class UserOut(UserBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserOut
