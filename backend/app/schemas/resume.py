"""
SmartReach AI — Resume & Extracted Profile Schemas
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ExperienceItem(BaseModel):
    """A past work or internship experience entry."""
    title: str = Field(..., description="Job or internship title")
    company: str = Field(..., description="Company or organization name")
    duration: Optional[str] = Field(None, description="E.g., Jun 2023 - Aug 2023")
    location: Optional[str] = Field(None, description="City, Country or Remote")
    description: Optional[str] = Field(None, description="Key achievements and responsibilities")


class EducationItem(BaseModel):
    """An educational degree or qualification entry."""
    degree: str = Field(..., description="E.g., B.Tech in Computer Science")
    institution: str = Field(..., description="University or college name")
    year: Optional[str] = Field(None, description="Graduation year or date range, e.g., 2021 - 2025")
    grade: Optional[str] = Field(None, description="GPA or percentage, e.g., 8.9 CGPA")


class ProjectItem(BaseModel):
    """A portfolio or academic project entry."""
    title: str = Field(..., description="Project name")
    tech_stack: Optional[str] = Field(None, description="Technologies used, e.g., React, FastAPI, MongoDB")
    description: Optional[str] = Field(None, description="Summary of project features and impact")
    url: Optional[str] = Field(None, description="GitHub repository or live demo link")


class ExtractedProfile(BaseModel):
    """Structured data extracted from a user's resume."""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = Field(default_factory=list, description="Extracted technical and soft skills")
    experience: List[ExperienceItem] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    raw_text: Optional[str] = Field(None, description="Raw extracted plain text from the resume")


class ResumeUploadResponse(BaseModel):
    """Response returned upon successful resume upload and parsing."""
    message: str
    filename: str
    resume_uploaded: bool = True
    extracted_profile: ExtractedProfile


class ResumeUpdateRequest(BaseModel):
    """Payload to manually update the extracted profile."""
    extracted_profile: ExtractedProfile
