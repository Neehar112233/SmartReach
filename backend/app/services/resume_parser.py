"""
SmartReach AI — Resume Text Extraction & Rule-Based Parser

Uses PyMuPDF for fast, robust PDF text extraction and regex/heuristics for structured metadata.
"""

import io
import re
import logging
from typing import Dict, List, Optional, Tuple
import pymupdf

from app.schemas.resume import (
    ExtractedProfile,
    EducationItem,
    ExperienceItem,
    ProjectItem,
)

logger = logging.getLogger(__name__)

# Standard skill keywords for heuristic extraction
COMMON_SKILLS_LEXICON = [
    # Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "Go", "Golang",
    "Rust", "Ruby", "PHP", "Kotlin", "Swift", "Dart", "SQL", "HTML", "CSS", "R", "Scala",
    # Frontend
    "React", "React.js", "Next.js", "Vue", "Vue.js", "Angular", "Svelte", "Redux",
    "Tailwind CSS", "Bootstrap", "Material UI", "Chakra UI", "HTML5", "CSS3", "Vite", "Webpack",
    # Backend
    "Node.js", "Express", "Express.js", "FastAPI", "Django", "Flask", "Spring Boot",
    "ASP.NET", "GraphQL", "REST API", "gRPC", "NestJS",
    # Databases & Storage
    "MongoDB", "PostgreSQL", "MySQL", "SQLite", "Redis", "Elasticsearch", "DynamoDB",
    "Firebase", "Supabase", "Cassandra", "Neo4j",
    # Cloud & DevOps
    "AWS", "Amazon Web Services", "Azure", "Google Cloud", "GCP", "Docker", "Kubernetes",
    "Terraform", "Ansible", "CI/CD", "GitHub Actions", "GitLab CI", "Jenkins", "Nginx", "Linux",
    # AI / ML / Data
    "Machine Learning", "Deep Learning", "Artificial Intelligence", "Natural Language Processing",
    "NLP", "Computer Vision", "LLMs", "Generative AI", "PyTorch", "TensorFlow", "Keras",
    "Scikit-Learn", "Pandas", "NumPy", "OpenCV", "HuggingFace", "LangChain", "RAG",
    # Tools & Concepts
    "Git", "GitHub", "GitLab", "Postman", "Jira", "Agile", "Scrum", "Microservices",
    "System Design", "Unit Testing", "PyTest", "Jest", "OAuth", "JWT",
]


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract all raw text from a PDF file using PyMuPDF.
    """
    try:
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        text_parts = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_text = page.get_text("text")
            if page_text:
                text_parts.append(page_text.strip())
        doc.close()
        return "\n\n".join(text_parts).strip()
    except Exception as e:
        logger.error("Failed to extract text from PDF: %s", e)
        raise ValueError(f"Could not parse PDF file: {str(e)}")


def extract_email(text: str) -> Optional[str]:
    """Extract first valid email address found in text."""
    match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
    return match.group(0) if match else None


def extract_phone(text: str) -> Optional[str]:
    """Extract phone number (international, US, or Indian format)."""
    # Match patterns like: +91 9876543210, +1 (123) 456-7890, 9876543210
    phone_pattern = r'(?:(?:\+|00)\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,5}[\s-]?\d{3,5}'
    matches = re.finditer(phone_pattern, text)
    for m in matches:
        raw = m.group(0).strip()
        # Clean digits to check length
        digits = re.sub(r'\D', '', raw)
        if 10 <= len(digits) <= 15:
            return raw
    return None


def extract_links(text: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Extract LinkedIn, GitHub, and Portfolio URLs from text.
    Returns: (linkedin_url, github_url, portfolio_url)
    """
    linkedin = None
    github = None
    portfolio = None

    # LinkedIn
    li_match = re.search(r'(?:https?://(?:www\.)?)?linkedin\.com/in/([a-zA-Z0-9_\-%]+)', text, re.IGNORECASE)
    if li_match:
        linkedin = f"https://linkedin.com/in/{li_match.group(1)}"

    # GitHub
    gh_match = re.search(r'(?:https?://(?:www\.)?)?github\.com/([a-zA-Z0-9_\-%]+)', text, re.IGNORECASE)
    if gh_match:
        # Ignore common non-profile paths
        user = gh_match.group(1)
        if user.lower() not in ["features", "pricing", "topics", "collections", "trending"]:
            github = f"https://github.com/{user}"

    # Portfolio / generic personal website (look for .dev, .io, .me, or explicit portfolio keywords)
    web_match = re.search(
        r'(?:https?://)?(?:www\.)?([a-zA-Z0-9_-]+\.(?:dev|me|io|tech|site|online|app|portfolio))',
        text,
        re.IGNORECASE
    )
    if web_match:
        portfolio = f"https://{web_match.group(1)}"

    return linkedin, github, portfolio


def extract_skills_heuristic(text: str) -> List[str]:
    """
    Match text against a curated list of popular software skills.
    Preserves original casing and returns unique matched skills.
    """
    found_skills = []
    text_lower = text.lower()

    for skill in COMMON_SKILLS_LEXICON:
        # Use word boundaries or clean matches
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            if skill not in found_skills:
                found_skills.append(skill)

    return found_skills


def segment_sections(text: str) -> Dict[str, str]:
    """
    Segment resume into standard sections based on typical headers.
    """
    headers = [
        ("EXPERIENCE", r'(?:work\s+experience|experience|employment\s+history|professional\s+experience)'),
        ("EDUCATION", r'(?:education|academic\s+background|academic\s+qualifications|qualification)'),
        ("PROJECTS", r'(?:projects|personal\s+projects|academic\s+projects|key\s+projects)'),
        ("SKILLS", r'(?:skills|technical\s+skills|core\s+competencies|technologies|skills\s+&\s+tools)'),
        ("SUMMARY", r'(?:summary|professional\s+summary|profile|about\s+me|objective)'),
    ]

    # Find start position of each section
    section_positions = []
    for section_name, regex in headers:
        for match in re.finditer(r'(?i)^\s*' + regex + r'\s*$', text, re.MULTILINE):
            section_positions.append((match.start(), section_name))

    section_positions.sort(key=lambda x: x[0])

    sections: Dict[str, str] = {}
    for i, (pos, name) in enumerate(section_positions):
        start_idx = pos
        end_idx = section_positions[i + 1][0] if i + 1 < len(section_positions) else len(text)
        sections[name] = text[start_idx:end_idx].strip()

    return sections


def parse_resume_heuristics(text: str) -> ExtractedProfile:
    """
    Deterministic rule-based parser as Tier 1 or offline fallback.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    candidate_name = lines[0] if lines and len(lines[0].split()) <= 4 else None

    email = extract_email(text)
    phone = extract_phone(text)
    linkedin, github, portfolio = extract_links(text)
    skills = extract_skills_heuristic(text)
    sections = segment_sections(text)

    # Heuristic project / experience / education items from segmented text
    projects: List[ProjectItem] = []
    if "PROJECTS" in sections:
        proj_text = sections["PROJECTS"]
        proj_lines = [l for l in proj_text.splitlines() if l.strip()][1:]  # skip header
        current_title = ""
        current_desc = []
        for line in proj_lines:
            if line.startswith(('-', '•', '*', '–')):
                current_desc.append(line.lstrip('-•*– '))
            else:
                if current_title:
                    projects.append(ProjectItem(
                        title=current_title,
                        description=" ".join(current_desc) if current_desc else None
                    ))
                    current_desc = []
                current_title = line
        if current_title:
            projects.append(ProjectItem(
                title=current_title,
                description=" ".join(current_desc) if current_desc else None
            ))

    education: List[EducationItem] = []
    if "EDUCATION" in sections:
        edu_text = sections["EDUCATION"]
        edu_lines = [l for l in edu_text.splitlines() if l.strip()][1:]
        if edu_lines:
            education.append(EducationItem(
                degree=edu_lines[0],
                institution=edu_lines[1] if len(edu_lines) > 1 else "University / Institution"
            ))

    experience: List[ExperienceItem] = []
    if "EXPERIENCE" in sections:
        exp_text = sections["EXPERIENCE"]
        exp_lines = [l for l in exp_text.splitlines() if l.strip()][1:]
        if exp_lines:
            experience.append(ExperienceItem(
                title=exp_lines[0],
                company=exp_lines[1] if len(exp_lines) > 1 else "Organization",
                description=" ".join(exp_lines[2:]) if len(exp_lines) > 2 else None
            ))

    summary = sections.get("SUMMARY")

    return ExtractedProfile(
        name=candidate_name,
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
        raw_text=text,
    )
