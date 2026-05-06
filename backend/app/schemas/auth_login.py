from pydantic import BaseModel, EmailStr, Field


class UserLogin(BaseModel):
    email: EmailStr = Field(..., json_schema_extra={"example": "user@example.com"})
    password: str = Field(..., json_schema_extra={"example": "SecurePassword123!"})
