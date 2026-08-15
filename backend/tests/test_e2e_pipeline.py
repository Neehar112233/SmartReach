"""
SmartReach AI — Complete End-to-End Lifecycle Integration Test Suite

Covers the full pipeline:
1. Health check & system diagnostics
2. User registration, authentication & JWT verification
3. Candidate profile setup
4. Recruiter contact upload, validation & CSV export
5. Campaign creation & AI email generation
6. Email preview, editing & approval
7. SMTP configuration & connectivity testing
8. Background dispatch execution (Sandbox mode)
9. Outreach history logs, stats & audit CSV export
"""

import io
import uuid
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app, lifespan

pytestmark = pytest.mark.asyncio

TRANSPORT = ASGITransport(app=app)


async def test_full_smartreach_e2e_pipeline():
    """Executes the entire lifecycle flow sequentially."""
    async with lifespan(app):
        async with AsyncClient(transport=TRANSPORT, base_url="http://test") as client:
            # 1. Health check
            health_res = await client.get("/api/health")
            assert health_res.status_code == 200
            health_data = health_res.json()
            assert health_data["status"] in ["healthy", "ok"]
            assert health_data.get("database") in ["connected", "ok"]

            # 2. Register a unique test user
            unique_id = uuid.uuid4().hex[:6]
            user_email = f"e2e_user_{unique_id}@example.com"
            user_password = "E2EPassword123!"

            reg_res = await client.post(
                "/api/auth/register",
                json={
                    "email": user_email,
                    "password": user_password,
                    "full_name": f"E2E Candidate {unique_id}",
                },
            )
            assert reg_res.status_code == 201
            auth_data = reg_res.json()
            assert "access_token" in auth_data
            token = auth_data["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 3. Update candidate profile
            profile_res = await client.put(
                "/api/profile",
                headers=headers,
                json={
                    "full_name": f"E2E Candidate {unique_id}",
                    "linkedin_url": f"https://linkedin.com/in/e2e-{unique_id}",
                    "github_url": f"https://github.com/e2e-{unique_id}",
                    "outreach_objective": "Seeking Senior Cloud & AI Architect roles.",
                    "custom_instructions": "Highlight distributed systems and LLM orchestration.",
                },
            )
            assert profile_res.status_code == 200
            profile_data = profile_res.json()
            assert profile_data["outreach_objective"] == "Seeking Senior Cloud & AI Architect roles."
            assert profile_data["github_url"] == f"https://github.com/e2e-{unique_id}"

            # 4. Download sample template & upload contacts CSV
            sample_res = await client.get("/api/contacts/sample-template")
            assert sample_res.status_code == 200
            assert "text/csv" in sample_res.headers.get("content-type", "")

            csv_content = (
                "Name,Email,Title,Company,Location,LinkedIn\n"
                f"Alice Recruiter,alice_{unique_id}@techcorp.com,Lead Talent Partner,TechCorp,San Francisco,https://linkedin.com/in/alice\n"
                f"Bob Hiring,bob_{unique_id}@innovatelabs.io,Engineering Manager,InnovateLabs,New York,https://linkedin.com/in/bob\n"
                f"Charlie Search,charlie_{unique_id}@nextgenai.co,Head of Talent,NextGen AI,Remote,https://linkedin.com/in/charlie\n"
            )

            upload_res = await client.post(
                "/api/contacts/upload",
                headers=headers,
                files={"file": ("test_contacts.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")},
            )
            assert upload_res.status_code == 201
            upload_data = upload_res.json()
            assert upload_data["stats"]["total_rows"] == 3
            assert upload_data["stats"]["valid_count"] == 3

            # 5. Export contacts CSV
            export_contacts_res = await client.get("/api/contacts/export", headers=headers)
            assert export_contacts_res.status_code == 200
            assert "text/csv" in export_contacts_res.headers.get("content-type", "")
            assert f"alice_{unique_id}@techcorp.com" in export_contacts_res.text

            # 6. Create a Campaign
            camp_res = await client.post(
                "/api/campaigns",
                headers=headers,
                json={
                    "name": f"E2E AI Outreach Campaign {unique_id}",
                    "target_role": "Senior Cloud & AI Architect",
                    "tone": "conversational",
                    "custom_prompt": "Highlight distributed systems and full-stack AI orchestration experience.",
                },
            )
            assert camp_res.status_code == 201
            campaign = camp_res.json()
            campaign_id = campaign["id"]
            assert campaign["name"] == f"E2E AI Outreach Campaign {unique_id}"

            # 7. Generate AI Emails for Campaign
            gen_res = await client.post(
                f"/api/campaigns/{campaign_id}/generate",
                headers=headers,
                json={"count": 3},
            )
            assert gen_res.status_code == 200
            gen_data = gen_res.json()
            assert gen_data["generated_count"] >= 1

            # 8. List Campaign Emails & Approve
            emails_res = await client.get(f"/api/emails/campaign/{campaign_id}", headers=headers)
            assert emails_res.status_code == 200
            emails_data = emails_res.json()
            emails = emails_data["emails"]
            assert len(emails) >= 1

            first_email_id = emails[0]["id"]
            approve_res = await client.put(
                f"/api/emails/{first_email_id}",
                headers=headers,
                json={"status": "approved"},
            )
            assert approve_res.status_code == 200
            assert approve_res.json()["status"] == "approved"

            # 9. Configure SMTP Settings (Sandbox Simulation Mode)
            smtp_save_res = await client.put(
                "/api/settings/smtp",
                headers=headers,
                json={
                    "provider": "gmail",
                    "smtp_host": "smtp.gmail.com",
                    "smtp_port": 587,
                    "smtp_user": f"e2e.test.{unique_id}@gmail.com",
                    "smtp_password": "fake_app_password_for_testing",
                    "sender_name": f"E2E Candidate {unique_id}",
                    "sender_email": f"e2e.test.{unique_id}@gmail.com",
                    "use_tls": True,
                    "daily_limit": 50,
                    "delay_seconds": 1,
                    "simulation_mode": True,
                },
            )
            assert smtp_save_res.status_code == 200
            assert smtp_save_res.json()["simulation_mode"] is True

            # Test SMTP handshake endpoint
            test_smtp_res = await client.post(
                "/api/settings/smtp/test",
                headers=headers,
                json={
                    "provider": "gmail",
                    "smtp_host": "smtp.gmail.com",
                    "smtp_port": 587,
                    "smtp_user": f"e2e.test.{unique_id}@gmail.com",
                    "simulation_mode": True,
                },
            )
            assert test_smtp_res.status_code == 200
            assert test_smtp_res.json()["success"] is True

            # 10. Dispatch Campaign Batch
            dispatch_res = await client.post(
                f"/api/dispatch/campaign/{campaign_id}",
                headers=headers,
            )
            assert dispatch_res.status_code == 200
            dispatch_data = dispatch_res.json()
            assert dispatch_data["campaign_id"] == campaign_id
            assert dispatch_data["approved_count"] >= 1

            # Allow async dispatch background queue to process
            await asyncio.sleep(2.0)

            # 11. Check Outreach History Logs & Stats
            history_res = await client.get("/api/history", headers=headers)
            assert history_res.status_code == 200
            history_data = history_res.json()
            assert len(history_data["logs"]) >= 1

            stats_res = await client.get("/api/history/stats", headers=headers)
            assert stats_res.status_code == 200
            stats_data = stats_res.json()
            assert stats_data["total_sent"] >= 1
            assert stats_data["total_delivered"] >= 1

            # 12. Export Outreach History CSV
            export_history_res = await client.get("/api/history/export", headers=headers)
            assert export_history_res.status_code == 200
            assert "text/csv" in export_history_res.headers.get("content-type", "")
            assert "Recipient Name,Recipient Email" in export_history_res.text
