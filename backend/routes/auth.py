from __future__ import annotations

import hashlib
import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

try:
    from database import UserIdentity, get_db
except ModuleNotFoundError:
    from backend.database import UserIdentity, get_db

router = APIRouter()


# ─── Helpers ────────────────────────────────────────────────────────────────


def _hash_pin(pin: str, salt: str) -> str:
    """Return SHA-256 hex digest of salt + pin."""
    return hashlib.sha256((salt + pin).encode()).hexdigest()


def _generate_salt() -> str:
    """Generate a random 16-byte hex salt."""
    return secrets.token_hex(16)


def _validate_pin(pin: str) -> None:
    """Validate PIN is 4-6 digit numeric. Raise ValueError if invalid."""
    if not pin.isdigit() or not (4 <= len(pin) <= 6):
        raise ValueError("PIN must be 4-6 digit numeric")


# ─── Dependencies ───────────────────────────────────────────────────────────


def get_device_id(request: Request) -> str:
    device_id = request.headers.get("X-Device-Id")
    if not device_id:
        raise HTTPException(status_code=401, detail="X-Device-Id header required")
    return device_id


# ─── Pydantic models ────────────────────────────────────────────────────────


class RegisterResponse(BaseModel):
    device_id: str
    is_new: bool


class PinBody(BaseModel):
    pin: str


class PinChangeBody(BaseModel):
    pin: str
    new_pin: str | None = None


class MeResponse(BaseModel):
    device_id: str
    has_pin: bool
    nickname: str
    created_at: str | None


class NicknameBody(BaseModel):
    nickname: str = Field(min_length=1, max_length=50)


# ─── Endpoints ──────────────────────────────────────────────────────────────


@router.post("/api/auth/register", response_model=RegisterResponse)
def register_device(
    request: Request,
    db: Session = Depends(get_db),
):
    """Register a new device or return existing device info.

    If X-Device-Id header is present and the device exists, return it.
    Otherwise, generate a new device_id and create a fresh record.
    """
    existing_id = request.headers.get("X-Device-Id")
    if existing_id:
        identity = db.query(UserIdentity).filter(UserIdentity.device_id == existing_id).first()
        if identity:
            # Touch last_seen
            identity.last_seen = datetime.utcnow()
            db.commit()
            return RegisterResponse(device_id=identity.device_id, is_new=False)

    # Generate new device_id
    device_id = secrets.token_hex(16)  # 32-char hex string (UUID alternative)
    identity = UserIdentity(
        device_id=device_id,
        nickname="Trader",
        created_at=datetime.utcnow(),
        last_seen=datetime.utcnow(),
    )
    db.add(identity)
    db.commit()
    return RegisterResponse(device_id=device_id, is_new=True)


@router.post("/api/auth/verify")
def verify_pin(
    body: PinBody,
    device_id: str = Depends(get_device_id),
    db: Session = Depends(get_db),
):
    """Verify a PIN for the given device."""
    identity = db.query(UserIdentity).filter(UserIdentity.device_id == device_id).first()
    if not identity:
        raise HTTPException(status_code=404, detail="Device not found")
    if not identity.pin_hash or not identity.pin_salt:
        return {"ok": False, "detail": "No PIN set"}

    hashed = _hash_pin(body.pin, identity.pin_salt)
    if hashed != identity.pin_hash:
        return {"ok": False}

    # Touch last_seen on successful verify
    identity.last_seen = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.post("/api/auth/pin")
def set_pin(
    body: PinChangeBody,
    device_id: str = Depends(get_device_id),
    db: Session = Depends(get_db),
):
    """Set or change a PIN for the device.

    If no PIN is currently set: just set {pin}.
    If a PIN is already set: must provide {pin} (current) + {new_pin} (new).
    PIN must be 4-6 digit numeric.
    """
    identity = db.query(UserIdentity).filter(UserIdentity.device_id == device_id).first()
    if not identity:
        raise HTTPException(status_code=404, detail="Device not found")

    # Validate PIN format
    current_pin = body.pin
    new_pin = body.new_pin

    if identity.pin_hash and identity.pin_salt:
        # Changing existing PIN
        if not new_pin:
            raise HTTPException(status_code=400, detail="new_pin is required when changing an existing PIN")
        # Verify current PIN
        if _hash_pin(current_pin, identity.pin_salt) != identity.pin_hash:
            raise HTTPException(status_code=403, detail="Current PIN is incorrect")
        target_pin = new_pin
    else:
        # Setting PIN for the first time
        if new_pin:
            raise HTTPException(status_code=400, detail="new_pin should not be provided when setting a first PIN")
        target_pin = current_pin

    # Validate the target PIN
    try:
        _validate_pin(target_pin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Hash and store
    salt = _generate_salt()
    identity.pin_hash = _hash_pin(target_pin, salt)
    identity.pin_salt = salt
    identity.last_seen = datetime.utcnow()
    db.commit()

    return {"ok": True}


@router.get("/api/auth/me", response_model=MeResponse)
def get_me(
    device_id: str = Depends(get_device_id),
    db: Session = Depends(get_db),
):
    """Get current device identity info."""
    identity = db.query(UserIdentity).filter(UserIdentity.device_id == device_id).first()
    if not identity:
        raise HTTPException(status_code=404, detail="Device not found")

    return MeResponse(
        device_id=identity.device_id,
        has_pin=identity.pin_hash is not None,
        nickname=identity.nickname or "Trader",
        created_at=identity.created_at.isoformat() if identity.created_at else None,
    )


@router.put("/api/auth/nickname")
def update_nickname(
    body: NicknameBody,
    device_id: str = Depends(get_device_id),
    db: Session = Depends(get_db),
):
    """Update the device nickname."""
    identity = db.query(UserIdentity).filter(UserIdentity.device_id == device_id).first()
    if not identity:
        raise HTTPException(status_code=404, detail="Device not found")

    identity.nickname = body.nickname.strip()
    identity.last_seen = datetime.utcnow()
    db.commit()

    return {"ok": True, "nickname": identity.nickname}
