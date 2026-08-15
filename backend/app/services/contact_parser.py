"""
SmartReach AI — HR Contact Parser & Validator

Parses CSV/Excel files with smart column header auto-detection, strict email validation, and duplicate detection.
"""

import io
import re
import logging
from typing import Dict, List, Optional, Set, Tuple
import pandas as pd

logger = logging.getLogger(__name__)

# Column aliases for smart matching (all lowercase, trimmed)
NAME_ALIASES = ["name", "full name", "fullname", "hr name", "recruiter", "recruiter name", "contact name", "contact", "person"]
FIRST_NAME_ALIASES = ["first name", "firstname", "first", "fname"]
LAST_NAME_ALIASES = ["last name", "lastname", "last", "lname"]
EMAIL_ALIASES = ["email", "email address", "work email", "hr email", "contact email", "e-mail", "mail", "corporate email"]
COMPANY_ALIASES = ["company", "company name", "organization", "org", "firm", "employer", "workplace", "business"]
TITLE_ALIASES = ["title", "designation", "role", "job title", "position", "hr title", "designation/role", "headline"]
LOCATION_ALIASES = ["location", "city", "region", "country", "state", "office location"]
LINKEDIN_ALIASES = ["linkedin", "linkedin url", "linkedin profile", "profile url", "social profile", "linkedin link"]

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')


def _find_matching_column(columns: List[str], aliases: List[str]) -> Optional[str]:
    """Find column that best matches any of the given aliases."""
    for col in columns:
        cleaned = re.sub(r'[^a-z0-9]', '', str(col).lower())
        for alias in aliases:
            cleaned_alias = re.sub(r'[^a-z0-9]', '', alias.lower())
            if cleaned == cleaned_alias:
                return col
    return None


def validate_email(email_str: str) -> Tuple[bool, Optional[str]]:
    """
    Validate email address format.
    Returns: (is_valid, error_message)
    """
    if not email_str:
        return False, "Email is missing"

    cleaned = str(email_str).strip()
    if len(cleaned) < 5 or len(cleaned) > 150:
        return False, "Email length invalid (must be 5-150 characters)"

    if not EMAIL_REGEX.match(cleaned):
        return False, "Invalid email address format"

    # Disallow known placeholder domains
    domain = cleaned.split("@")[-1].lower()
    if domain in ["example.com", "test.com", "placeholder.com", "sample.com"]:
        return False, f"Placeholder email domain '@{domain}' is not allowed"

    return True, None


def parse_contacts_data(
    file_bytes: bytes,
    filename: str,
    existing_emails: Optional[Set[str]] = None,
) -> Tuple[List[Dict], Dict[str, int]]:
    """
    Parse a CSV or Excel file of HR contacts into a validated, standardized structure.
    """
    existing_emails = existing_emails or set()
    fn_lower = filename.lower()

    # 1. Load DataFrame
    try:
        if fn_lower.endswith('.csv'):
            # Try multiple encodings
            for encoding in ['utf-8', 'utf-8-sig', 'latin1', 'cp1252']:
                try:
                    df = pd.read_csv(io.BytesIO(file_bytes), encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                df = pd.read_csv(io.BytesIO(file_bytes))
        elif fn_lower.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file_bytes), engine='openpyxl')
        else:
            raise ValueError("Unsupported file format. Please upload a .csv or .xlsx file.")
    except Exception as e:
        logger.error("Failed to read contact spreadsheet %s: %s", filename, e)
        raise ValueError(f"Could not read spreadsheet: {str(e)}")

    if df.empty:
        raise ValueError("The uploaded spreadsheet is empty.")

    # 2. Identify column mappings
    columns = list(df.columns)
    name_col = _find_matching_column(columns, NAME_ALIASES)
    first_name_col = _find_matching_column(columns, FIRST_NAME_ALIASES)
    last_name_col = _find_matching_column(columns, LAST_NAME_ALIASES)
    email_col = _find_matching_column(columns, EMAIL_ALIASES)
    company_col = _find_matching_column(columns, COMPANY_ALIASES)
    title_col = _find_matching_column(columns, TITLE_ALIASES)
    location_col = _find_matching_column(columns, LOCATION_ALIASES)
    linkedin_col = _find_matching_column(columns, LINKEDIN_ALIASES)

    if not email_col:
        raise ValueError(
            f"Could not detect an 'Email' column. Found columns: {', '.join(str(c) for c in columns)}"
        )

    # 3. Process each row
    parsed_contacts: List[Dict] = []
    seen_in_file: Set[str] = set()

    total_rows = 0
    valid_count = 0
    invalid_count = 0
    duplicates_count = 0

    for idx, row in df.iterrows():
        total_rows += 1
        errors: List[str] = []

        # --- Name ---
        name = ""
        if name_col and pd.notna(row[name_col]):
            name = str(row[name_col]).strip()
        elif first_name_col and pd.notna(row[first_name_col]):
            first_name = str(row[first_name_col]).strip()
            last_name = str(row[last_name_col]).strip() if last_name_col and pd.notna(row[last_name_col]) else ""
            name = f"{first_name} {last_name}".strip()

        if not name:
            errors.append("Missing contact name")
        elif len(name) < 2:
            errors.append("Contact name is too short")

        # --- Email ---
        raw_email = str(row[email_col]).strip() if pd.notna(row[email_col]) else ""
        email_clean = raw_email.lower().strip()

        email_valid, email_err = validate_email(email_clean)
        if not email_valid:
            errors.append(email_err or "Invalid email format")
        else:
            # Check duplicate within this file
            if email_clean in seen_in_file:
                errors.append("Duplicate email in this file")
                duplicates_count += 1
            # Check duplicate against existing database contacts
            elif email_clean in existing_emails:
                errors.append("Duplicate: Contact with this email already exists")
                duplicates_count += 1
            else:
                seen_in_file.add(email_clean)

        # --- Company ---
        company = ""
        if company_col and pd.notna(row[company_col]):
            company = str(row[company_col]).strip()
        if not company:
            errors.append("Missing company name")

        # --- Optional fields ---
        title = "HR / Recruiter"
        if title_col and pd.notna(row[title_col]):
            t_val = str(row[title_col]).strip()
            if t_val:
                title = t_val

        location = None
        if location_col and pd.notna(row[location_col]):
            loc_val = str(row[location_col]).strip()
            if loc_val:
                location = loc_val

        linkedin_url = None
        if linkedin_col and pd.notna(row[linkedin_col]):
            li_val = str(row[linkedin_col]).strip()
            if li_val:
                linkedin_url = li_val

        is_valid = len(errors) == 0
        if is_valid:
            valid_count += 1
        else:
            invalid_count += 1

        parsed_contacts.append({
            "sno": idx + 1,
            "name": name or "Unnamed Contact",
            "email": email_clean or raw_email,
            "company": company or "Unknown Company",
            "title": title,
            "location": location,
            "linkedin_url": linkedin_url,
            "is_valid": is_valid,
            "validation_errors": errors,
            "email_status": "draft",
        })

    stats = {
        "total_rows": total_rows,
        "valid_count": valid_count,
        "invalid_count": invalid_count,
        "duplicates_count": duplicates_count,
    }

    return parsed_contacts, stats
