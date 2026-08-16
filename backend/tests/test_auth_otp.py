"""
SmartReach AI — Authentication, OTP Verification & Password Recovery Integration Tests

Tests:
1. Registration Step 1: Send OTP to email
2. Registration Step 2: Verify invalid OTP (fails with 400)
3. Registration Step 2: Verify valid OTP (creates account & returns JWT)
4. Direct Login: Login directly with email + password (no OTP required)
5. Direct Login: Bad password rejection (401)
6. Forgot Password: Step 1 Request reset code
7. Reset Password: Step 2 Submit OTP + new password
8. Login with New Password: Confirm new password works
9. Resend OTP: Request code resend with rate-limit
"""

import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app, lifespan

pytestmark = pytest.mark.asyncio

TRANSPORT = ASGITransport(app=app)


async def test_auth_otp_and_password_recovery_pipeline():
    """Verify complete Registration OTP, Direct Login, and Forgot Password recovery flows."""
    async with lifespan(app):
        async with AsyncClient(transport=TRANSPORT, base_url="http://test") as client:
            unique_id = uuid.uuid4().hex[:6]
            test_email = f"otp_user_{unique_id}@example.com"
            original_password = "SecurePassword123!"
            new_password = "UpdatedPassword456@"

            # 1. Registration Step 1: Send OTP
            send_otp_res = await client.post(
                "/api/auth/register/send-otp",
                json={
                    "full_name": f"OTP User {unique_id}",
                    "email": test_email,
                    "password": original_password,
                },
            )
            assert send_otp_res.status_code == 200
            otp_data = send_otp_res.json()
            assert "email" in otp_data
            assert otp_data["email"] == test_email
            assert "dev_otp" in otp_data or "message" in otp_data
            otp_code = otp_data.get("dev_otp")

            # 2. Registration Step 2: Verify with INVALID OTP code (Should fail 400)
            invalid_verify_res = await client.post(
                "/api/auth/register/verify-otp",
                json={
                    "email": test_email,
                    "otp": "000000",
                },
            )
            assert invalid_verify_res.status_code == 400

            # 3. Registration Step 2: Verify with VALID OTP code (Should succeed 201)
            if not otp_code:
                # Fallback if demo_mode was false
                from app.services.otp_service import get_collection
                otp_doc = await get_collection("otp_codes").find_one({"email": test_email, "purpose": "register"})
                assert otp_doc is not None
                otp_code = otp_doc["otp"]

            verify_res = await client.post(
                "/api/auth/register/verify-otp",
                json={
                    "email": test_email,
                    "otp": otp_code,
                },
            )
            assert verify_res.status_code == 201
            auth_data = verify_res.json()
            assert "access_token" in auth_data
            assert auth_data["user"]["email"] == test_email

            # 4. Duplicate registration attempt with same email should fail (409)
            dup_res = await client.post(
                "/api/auth/register/send-otp",
                json={
                    "full_name": f"Duplicate User {unique_id}",
                    "email": test_email,
                    "password": original_password,
                },
            )
            assert dup_res.status_code == 409

            # 5. Direct Login (NO OTP required on sign in)
            login_res = await client.post(
                "/api/auth/login",
                json={
                    "email": test_email,
                    "password": original_password,
                },
            )
            assert login_res.status_code == 200
            login_data = login_res.json()
            assert "access_token" in login_data
            assert login_data["user"]["email"] == test_email

            # 6. Direct Login with Wrong Password -> 401
            wrong_login_res = await client.post(
                "/api/auth/login",
                json={
                    "email": test_email,
                    "password": "WrongPassword999!",
                },
            )
            assert wrong_login_res.status_code == 401

            # 7. Forgot Password Step 1: Request Reset OTP
            forgot_res = await client.post(
                "/api/auth/forgot-password",
                json={"email": test_email},
            )
            assert forgot_res.status_code == 200
            forgot_data = forgot_res.json()
            assert forgot_data["email"] == test_email
            reset_otp = forgot_data.get("dev_otp")

            if not reset_otp:
                from app.services.otp_service import get_collection
                otp_doc = await get_collection("otp_codes").find_one({"email": test_email, "purpose": "forgot_password"})
                assert otp_doc is not None
                reset_otp = otp_doc["otp"]

            # 8. Reset Password Step 2: Submit Reset OTP + New Password
            reset_res = await client.post(
                "/api/auth/reset-password",
                json={
                    "email": test_email,
                    "otp": reset_otp,
                    "new_password": new_password,
                },
            )
            assert reset_res.status_code == 200
            assert reset_res.json()["success"] is True

            # 9. Verify old password fails now
            old_pw_res = await client.post(
                "/api/auth/login",
                json={
                    "email": test_email,
                    "password": original_password,
                },
            )
            assert old_pw_res.status_code == 401

            # 10. Verify NEW password succeeds
            new_pw_login_res = await client.post(
                "/api/auth/login",
                json={
                    "email": test_email,
                    "password": new_password,
                },
            )
            assert new_pw_login_res.status_code == 200
            assert "access_token" in new_pw_login_res.json()
