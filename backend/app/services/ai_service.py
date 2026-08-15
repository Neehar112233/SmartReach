"""
SmartReach AI — AI Service

Provides structured resume parsing and AI-driven personalization using Gemini or OpenAI models.
Supports async execution with automatic fallback to heuristic parsing.
"""

import json
import logging
import re
from typing import Optional
import httpx

from app.core.config import settings
from app.schemas.resume import (
    ExtractedProfile,
    EducationItem,
    ExperienceItem,
    ProjectItem,
)
from app.services.resume_parser import parse_resume_heuristics

logger = logging.getLogger(__name__)

RESUME_EXTRACTION_SYSTEM_PROMPT = """You are an expert ATS and HR resume parser.
Extract the candidate's professional profile from the raw resume text into a strict JSON structure.

Return ONLY a valid JSON object with the following fields:
{
  "name": "Full Name or null",
  "email": "Email or null",
  "phone": "Phone number or null",
  "linkedin_url": "LinkedIn profile URL or null",
  "github_url": "GitHub URL or null",
  "portfolio_url": "Portfolio or personal website URL or null",
  "summary": "Brief 2-3 sentence professional summary highlighting their strongest skills and career goals",
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "experience": [
    {
      "title": "Role Title",
      "company": "Company Name",
      "duration": "e.g. Jun 2023 - Present",
      "location": "Location or Remote",
      "description": "Concise summary of achievements and technologies used"
    }
  ],
  "education": [
    {
      "degree": "Degree and Major",
      "institution": "University or College Name",
      "year": "Graduation year or date range",
      "grade": "GPA/Grade or null"
    }
  ],
  "projects": [
    {
      "title": "Project Name",
      "tech_stack": "Technologies used (e.g. React, FastAPI, Docker)",
      "description": "1-2 sentence description of what the project does and key features",
      "url": "Project URL or GitHub link or null"
    }
  ]
}

Ensure all extracted skills are normalized (e.g. 'React.js' -> 'React', 'python' -> 'Python'). Do not wrap in markdown quotes if possible, output pure JSON."""


async def _call_gemini(prompt: str, system_instruction: str) -> Optional[str]:
    """Call Google Gemini REST API using httpx."""
    model = settings.AI_MODEL or "gemini-2.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.AI_API_KEY}"

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{system_instruction}\n\nCandidate Resume:\n{prompt}"}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload)
        if response.status_code != 200:
            logger.warning("Gemini API returned status %d: %s", response.status_code, response.text)
            return None
        data = response.json()
        candidates = data.get("candidates", [])
        if candidates and "content" in candidates[0]:
            parts = candidates[0]["content"].get("parts", [])
            if parts:
                return parts[0].get("text", "")
    return None


async def _call_openai(prompt: str, system_instruction: str) -> Optional[str]:
    """Call OpenAI compatible Chat Completions API."""
    model = settings.AI_MODEL or "gpt-4o-mini"
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": f"Candidate Resume:\n{prompt}"},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            logger.warning("OpenAI API returned status %d: %s", response.status_code, response.text)
            return None
        data = response.json()
        choices = data.get("choices", [])
        if choices:
            return choices[0]["message"].get("content", "")
    return None


async def enrich_resume_with_ai(raw_text: str) -> ExtractedProfile:
    """
    Attempt to parse structured resume profile using AI.
    Falls back gracefully to heuristic parsing if API key is not configured or request fails.
    """
    # Fallback baseline
    heuristic_profile = parse_resume_heuristics(raw_text)

    if not settings.AI_API_KEY or settings.AI_API_KEY.strip() == "":
        logger.info("AI_API_KEY not configured. Using rule-based heuristic parser.")
        return heuristic_profile

    try:
        raw_json_str = None
        if "gemini" in settings.AI_MODEL.lower():
            raw_json_str = await _call_gemini(raw_text, RESUME_EXTRACTION_SYSTEM_PROMPT)
        else:
            raw_json_str = await _call_openai(raw_text, RESUME_EXTRACTION_SYSTEM_PROMPT)

        if not raw_json_str:
            logger.warning("AI model returned empty response. Falling back to heuristic profile.")
            return heuristic_profile

        # Clean markdown codeblocks if present
        clean_json_str = re.sub(r'^```json\s*', '', raw_json_str.strip())
        clean_json_str = re.sub(r'\s*```$', '', clean_json_str)

        parsed_dict = json.loads(clean_json_str)

        # Merge with heuristic fallbacks for contact fields if AI missed them
        name = parsed_dict.get("name") or heuristic_profile.name
        email = parsed_dict.get("email") or heuristic_profile.email
        phone = parsed_dict.get("phone") or heuristic_profile.phone
        linkedin = parsed_dict.get("linkedin_url") or heuristic_profile.linkedin_url
        github = parsed_dict.get("github_url") or heuristic_profile.github_url
        portfolio = parsed_dict.get("portfolio_url") or heuristic_profile.portfolio_url
        summary = parsed_dict.get("summary") or heuristic_profile.summary

        # Skills list
        skills = parsed_dict.get("skills", [])
        if not skills:
            skills = heuristic_profile.skills

        # Experience list
        experience = [
            ExperienceItem(
                title=exp.get("title", "Role"),
                company=exp.get("company", "Company"),
                duration=exp.get("duration"),
                location=exp.get("location"),
                description=exp.get("description"),
            )
            for exp in parsed_dict.get("experience", [])
            if isinstance(exp, dict) and exp.get("title")
        ]
        if not experience:
            experience = heuristic_profile.experience

        # Education list
        education = [
            EducationItem(
                degree=edu.get("degree", "Degree"),
                institution=edu.get("institution", "Institution"),
                year=edu.get("year"),
                grade=edu.get("grade"),
            )
            for edu in parsed_dict.get("education", [])
            if isinstance(edu, dict) and edu.get("degree")
        ]
        if not education:
            education = heuristic_profile.education

        # Projects list
        projects = [
            ProjectItem(
                title=proj.get("title", "Project"),
                tech_stack=proj.get("tech_stack"),
                description=proj.get("description"),
                url=proj.get("url"),
            )
            for proj in parsed_dict.get("projects", [])
            if isinstance(proj, dict) and proj.get("title")
        ]
        if not projects:
            projects = heuristic_profile.projects

        logger.info("AI structured resume parsing successful for: %s", name or email or "User")

        return ExtractedProfile(
            name=name,
            email=email,
            phone=phone,
            linkedin_url=linkedin,
            github_url=github,
            portfolio_url=portfolio,
            summary=summary,
            skills=skills,
            experience=experience,
            education=education,
            projects=projects,
            raw_text=raw_text,
        )

    except Exception as e:
        logger.warning("AI resume enrichment encountered an error: %s. Using heuristic profile.", e)
        return heuristic_profile
