from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Any, Union, List
from jose import jwt
from fastapi import HTTPException

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(
    data: dict, expires_delta: Union[timedelta, None] = None
) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def verify_role(user, allowed_roles: List[str]) -> bool:
    """Verify if user has one of the allowed roles"""
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Operation requires one of these roles: {', '.join(allowed_roles)}"
        )
    return True
