from fastapi import APIRouter, HTTPException, status
from datetime import timedelta
from schemas import LoginRequest, TokenResponse
from auth import verify_admin_credentials, create_access_token
from config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Admin login endpoint with OTP verification"""
    # Verify admin credentials
    if not verify_admin_credentials(request.phone, request.otp):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or OTP",
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": request.phone},
        expires_delta=access_token_expires
    )

    return TokenResponse(access_token=access_token)
