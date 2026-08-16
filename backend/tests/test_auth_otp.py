"""
SmartReach AI — Authentication OTP & Password Reset Test Suite
"""

import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app, lifespan
from app.core.database import get_collection

pytestmark = pytest.mark.asyncio
TRANSPORT = ASGITransport(app=app)


async def test_otp_login_and_password_reset_flow():
    """Test 2FA OTP login, password reset via OTP, and re-login with new credentials."""
    async with lifespan(app):
        async with AsyncClient(transport=TRANSPORT, base_url="http://test") as client:
            unique_id = uuid.uuid4().hex[:6]
            email = f"test_otp_{unique_id}@example.com"
            password = "InitialPassword123!"

            # 1. Register user
            reg_res = await client.post(
                "/api/auth/register",
                json={
                    "email": email,
                    "password": password,
                    "full_name": f"OTP Tester {unique_id}",
                },
            )
            assert reg_res.status_code == 201

            # 2. Step 1 of Login: Initiate login (generates OTP)
            login_init_res = await client.post(
                "/api/auth/login",
                json={"email": email, "password": password},
            )
            assert login_init_res.status_code == 200
            init_data = login_init_res.json()
            assert init_data["require_otp"] is True
            assert init_data["email"] == email

            # Retrieve OTP from database
            otp_col = get_collection("otp_codes")
            otp_doc = await otp_col.find_one({"email": email, "purpose": "login"})
            assert otp_doc is not None
            login_otp = otp_doc["otp"]

            # 3. Step 2 of Login: Test invalid OTP
            bad_otp_res = await client.post(
                "/api/auth/verify-login-otp",
                json={"email": email, "otp": "000000"},
            )
            assert bad_otp_res.status_code == 400

            # 4. Step 2 of Login: Test valid OTP
            good_otp_res = await client.post(
                "/api/auth/verify-login-otp",
                json={"email": email, "otp": login_otp},
            )
            assert good_otp_res.status_code == 200
            token_data = good_otp_res.json()
            assert "access_token" in token_data
            assert token_data["user"]["email"] == email

            # 5. Test Forgot Password Request
            forgot_res = await client.post(
                "/api/auth/forgot-password",
                json={"email": email},
            )
            assert forgot_res.status_code == 200

            reset_otp_doc = await otp_col.find_one({"email": email, "purpose": "reset_password"})
            assert reset_otp_doc is not None
            reset_otp = reset_otp_doc["otp"]

            # 6. Test Reset Password with Invalid OTP
            bad_reset_res = await client.post(
                "/api/auth/reset-password",
                json={
                    "email": email,
                    "otp": "999999",
                    "new_password": "NewSecurePassword456!",
                },
            )
            assert bad_reset_res.status_code == 400

            # 7. Test Reset Password with Valid OTP
            new_password = "NewSecurePassword456!"
            good_reset_res = await client.post(
                "/api/auth/reset-password",
                json={
                    "email": email,
                    "otp": reset_otp,
                    "new_password": new_password,
                },
            )
            assert good_reset_res.status_code == 200
            assert "successfully reset" in good_reset_res.json()["message"]

            # 8. Verify old password no longer works
            old_login_res = await client.post(
                "/api/auth/login",
                json={"email": email, "password": password},
            )
            assert old_login_res.status_code == 401

            # 9. Verify new password initiates login successfully
            new_login_res = await client.post(
                "/api/auth/login",
                json={"email": email, "password": new_password},
            )
            assert new_login_res.status_code == 200
            assert new_login_res.json()["require_otp"] is True
