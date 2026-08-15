"""
SmartReach AI — AI Cold Email Generation Service

Composes hyper-personalized cold outreach emails matching Candidate Profile + Recruiter Profile + Target Role + Tone.
"""

import asyncio
import json
import logging
import re
from typing import Dict, List, Optional, Tuple
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Fallback heuristic templates when AI API is unavailable
TEMPLATE_OPENINGS = {
    "professional": "I hope you are having a productive week.",
    "casual": "Hope things are going great with you and the team at {company}!",
    "enthusiastic": "I have been closely following {company}'s exciting engineering initiatives!",
    "concise": "Reaching out regarding {role} opportunities at {company}.",
}

TEMPLATE_CTAS = {
    "professional": "Would you have 10-15 minutes for a brief introductory call next week?",
    "casual": "Would love to jump on a quick 10-minute chat if you're open to it!",
    "enthusiastic": "I would be thrilled to connect for a quick 10-minute intro this week!",
    "concise": "Are you open to a brief chat next Tuesday?",
}


def _build_fallback_email(
    candidate_name: str,
    candidate_skills: List[str],
    candidate_experience: List[dict],
    candidate_projects: List[dict],
    portfolio_url: Optional[str],
    recipient_name: str,
    recipient_company: str,
    target_role: str,
    tone: str = "professional",
    subject_style: str = "direct",
) -> Tuple[str, str]:
    """Generate a high-converting email using deterministic heuristic templates."""
    rec_first_name = recipient_name.split()[0] if recipient_name else "there"
    cand_first_name = candidate_name.split()[0] if candidate_name else "Candidate"

    top_skills = ", ".join(candidate_skills[:3]) if candidate_skills else "modern software engineering"
    
    # Highlight recent project or experience
    highlight_text = ""
    if candidate_projects:
        proj = candidate_projects[0]
        p_name = proj.get("title") or proj.get("name", "recent projects")
        highlight_text = f"Recently, I built {p_name}, leveraging {top_skills} to solve high-impact workflows."
    elif candidate_experience:
        exp = candidate_experience[0]
        comp = exp.get("company", "previous teams")
        highlight_text = f"In my recent role at {comp}, I worked extensively with {top_skills}."
    else:
        highlight_text = f"My background specializes in {top_skills}."

    links_text = f"\nPortfolio / Work: {portfolio_url}" if portfolio_url else ""

    opening = TEMPLATE_OPENINGS.get(tone, TEMPLATE_OPENINGS["professional"]).format(
        company=recipient_company, role=target_role
    )
    cta = TEMPLATE_CTAS.get(tone, TEMPLATE_CTAS["professional"])

    # Subject line
    if subject_style == "value":
        subject = f"Value for {recipient_company}'s engineering team — {candidate_name}"
    elif subject_style == "curious":
        subject = f"Question regarding {target_role} roles at {recipient_company}"
    elif subject_style == "referral":
        subject = f"{target_role} inquiry — {candidate_name}"
    else:
        subject = f"Application for {target_role} — {candidate_name}"

    body = (
        f"Hi {rec_first_name},\n\n"
        f"{opening} I am writing to express my strong interest in {target_role} opportunities at {recipient_company}.\n\n"
        f"{highlight_text} Given {recipient_company}'s focus on innovation, I believe my technical background aligns well with your team's goals.\n\n"
        f"I have attached my resume for your convenience. {cta}{links_text}\n\n"
        f"Best regards,\n"
        f"{candidate_name}"
    )

    return subject, body


async def generate_single_email(
    candidate_profile: dict,
    recipient: dict,
    target_role: str,
    tone: str = "professional",
    custom_instructions: Optional[str] = None,
    subject_style: str = "direct",
) -> Tuple[str, str]:
    """
    Generate a tailored cold outreach email via AI (Gemini / OpenAI), with automatic fallback.
    """
    candidate_name = candidate_profile.get("full_name") or candidate_profile.get("name", "Candidate")
    skills = candidate_profile.get("skills", [])
    experience = candidate_profile.get("experience", [])
    projects = candidate_profile.get("projects", [])
    portfolio = (
        candidate_profile.get("portfolio_url")
        or candidate_profile.get("github_url")
        or candidate_profile.get("linkedin_url")
    )

    recipient_name = recipient.get("name", "Hiring Manager")
    recipient_company = recipient.get("company", "Your Company")
    recipient_title = recipient.get("title", "Recruiter")

    if not settings.AI_API_KEY:
        logger.info("AI_API_KEY not configured — using intelligent template engine.")
        return _build_fallback_email(
            candidate_name=candidate_name,
            candidate_skills=skills,
            candidate_experience=experience,
            candidate_projects=projects,
            portfolio_url=portfolio,
            recipient_name=recipient_name,
            recipient_company=recipient_company,
            target_role=target_role,
            tone=tone,
            subject_style=subject_style,
        )

    # Construct prompt
    prompt = f"""
You are an expert executive cold email copywriter. Write a hyper-personalized, high-converting cold outreach email from a job candidate to a recruiter/hiring manager.

### Candidate Profile:
- Name: {candidate_name}
- Target Role: {target_role}
- Skills: {", ".join(skills[:8]) if skills else "Full Stack Development"}
- Notable Experience: {json.dumps(experience[:2]) if experience else "N/A"}
- Notable Projects: {json.dumps(projects[:2]) if projects else "N/A"}
- Portfolio / Links: {portfolio or "N/A"}

### Recruiter & Company:
- Recruiter Name: {recipient_name}
- Recruiter Role: {recipient_title}
- Company: {recipient_company}

### Outreach Parameters:
- Desired Tone: {tone} (professional, casual, enthusiastic, or concise)
- Subject Line Style: {subject_style} (direct, value, curious, or referral)
- Custom User Instructions: {custom_instructions or "None"}

### Strict Writing Guidelines:
1. Length: 100 - 160 words max. Keep it crisp, skimmable, and impactful.
2. Hook: Address the recruiter by first name. Reference {recipient_company} and why the candidate is reaching out specifically.
3. Proof Points: Mention 1-2 concrete achievements or skills matching {target_role}.
4. Call to Action (CTA): Low friction (e.g. asking for 10 minutes next week).
5. Output MUST be ONLY a valid JSON object with EXACTLY keys 'subject' and 'body'. No markdown formatting or code fences outside JSON.

JSON format:
{{
  "subject": "Subject line text",
  "body": "Email body text"
}}
"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if "gemini" in settings.AI_MODEL.lower():
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.AI_MODEL}:generateContent?key={settings.AI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.4, "maxOutputTokens": 600},
                }
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip())
                    cleaned = re.sub(r"\s*```$", "", cleaned)
                    parsed = json.loads(cleaned)
                    return parsed["subject"].strip(), parsed["body"].strip()
            else:
                # OpenAI compatible endpoint
                url = "https://api.openai.com/v1/chat/completions"
                payload = {
                    "model": settings.AI_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are a professional email outreach copywriter."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.4,
                }
                resp = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {settings.AI_API_KEY}"},
                    json=payload,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    raw_text = data["choices"][0]["message"]["content"]
                    cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip())
                    cleaned = re.sub(r"\s*```$", "", cleaned)
                    parsed = json.loads(cleaned)
                    return parsed["subject"].strip(), parsed["body"].strip()

    except Exception as e:
        logger.warning("AI generation failed (%s), falling back to template engine: %s", settings.AI_MODEL, e)

    return _build_fallback_email(
        candidate_name=candidate_name,
        candidate_skills=skills,
        candidate_experience=experience,
        candidate_projects=projects,
        portfolio_url=portfolio,
        recipient_name=recipient_name,
        recipient_company=recipient_company,
        target_role=target_role,
        tone=tone,
        subject_style=subject_style,
    )
