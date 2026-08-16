"""
SmartReach AI — Authentication, OTP Verification & Password Recovery Integration Tests

Tests:
1. Registration Step 1: Send OTP directly to email (response does NOT leak OTP)
2. Registration Step 2: Verify invalid OTP (fails with 400)
3. Registration Step 2: Verify valid OTP (creates account & returns JWT)
4. Direct Login: Login directly with email + password (no OTP required)
5. Direct Login: Bad password rejection (401)
6. Forgot Password Step 1: Request reset code
7. Forgot Password Step 2: Validate reset OTP (/verify-reset-otp)
8. Forgot Password Step 3: Submit reset OTP + new password (/reset-password)
9. Login with New Password: Confirm new password works
10. Resend OTP: Request code resend with rate-limit
"""

import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app, lifespan
from app.services.otp_service import get_collection

pytestmark = pytest.mark.asyncio

TRANSPORT = ASGITransport(app=app)


async def test_auth_otp_and_password_recovery_pipeline():
    """Verify complete Registration OTP, Direct Login, and 3-step Forgot Password recovery flows."""
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
            # Ensure security: OTP is NEVER in the response body
            assert "dev_otp" not in otp_data

            # Retrieve OTP from database for test verification
            otp_doc = await get_collection("otp_codes").find_one({"email": test_email, "purpose": "register"})
            assert otp_doc is not None
            reg_otp = otp_doc["otp"]

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
            verify_res = await client.post(
                "/api/auth/register/verify-otp",
                json={
                    "email": test_email,
                    "otp": reg_otp,
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
            assert "dev_otp" not in forgot_data

            reset_otp_doc = await get_collection("otp_codes").find_one({"email": test_email, "purpose": "forgot_password"})
            assert reset_otp_doc is not None
            reset_otp = reset_otp_doc["otp"]

            # 8. Forgot Password Step 2: Validate Reset OTP Code (without consuming)
            # Test bad OTP
            bad_verify_res = await client.post(
                "/api/auth/verify-reset-otp",
                json={
                    "email": test_email,
                    "otp": "999999",
                },
            )
            assert bad_verify_res.status_code == 400

            # Test good OTP
            good_verify_res = await client.post(
                "/api/auth/verify-reset-otp",
                json={
                    "email": test_email,
                    "otp": reset_otp,
                },
            )
            assert good_verify_res.status_code == 200
            assert good_verify_res.json()["valid"] is True

            # 9. Forgot Password Step 3: Submit Reset OTP + New Password
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

            # 10. Verify old password fails now
            old_pw_res = await client.post(
                "/api/auth/login",
                json={
                    "email": test_email,
                    "password": original_password,
                },
            )
            assert old_pw_res.status_code == 401

            # 11. Verify NEW password succeeds
            new_pw_login_res = await client.post(
                "/api/auth/login",
                json={
                    "email": test_email,
                    "password": new_password,
                },
            )
            assert new_pw_login_res.status_code == 200
            assert "access_token" in new_pw_login_res.json()
