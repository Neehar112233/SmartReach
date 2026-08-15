# SmartReach AI 🚀

<div align="center">

**Autonomous AI-Powered HR Cold Outreach, Resume Attachment & Email Dispatch Platform**

[![Python Version](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-47A248.svg?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

*Automate personalized cold emails to recruiters with resume parsing, contact deduplication, multi-tone AI copy synthesis, human-in-the-loop review, and rate-limited background SMTP dispatch with attached PDF resumes.*

[Architecture](#-system-architecture) • [ER Diagram](#-database-entity-relationship-er-diagram) • [Automation Pipelines](#-automation--pipeline-diagrams) • [Screenshots](#-platform-walkthrough--screenshots) • [Quick Start](#-quick-start-guide) • [SMTP Setup](#-smtp-configuration-guide) • [API Reference](#-api-endpoints-reference)

---

</div>

## 📌 Overview

**SmartReach AI** automates job candidate outreach from resume ingestion to live email delivery:

- 📄 **Resume Ingestion**: Parses candidate profile, skills, projects, and work history from PDF/DOCX files.
- 👥 **Recruiter Data Engine**: Imports CSV/Excel contacts, validates email syntax, and filters duplicates.
- ⚡ **AI Personalization**: Dynamically synthesizes high-converting email copy matched to recruiter title and company.
- ✍️ **Human Review Workspace**: Inline editor with reading time estimates, word counts, and bulk approvals.
- 📬 **Live SMTP Engine with Resume Attachments**: Dispatches emails with attached PDF resumes using anti-spam human jitter delays (0.2s–0.8s) and configurable daily caps.
- 🧪 **Zero-Risk Sandbox**: Test full campaigns safely in simulation mode before going live.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Client ["Frontend Layer (React 19 + TypeScript + Tailwind)"]
        UI["Modern Responsive SPA"]
        State["Client State & JWT Auth"]
    end

    subgraph Backend ["Backend Layer (FastAPI Asynchronous Framework)"]
        Router["REST API Endpoints"]
        AuthSvc["JWT Auth & Security"]
        ResumeSvc["PyPDF / DOCX Resume Parser"]
        ContactSvc["CSV/Excel Ingestion & Cleanser"]
        AISvc["AI Prompt & Email Synthesizer"]
        QueueSvc["Rate-Limited SMTP Dispatcher"]
    end

    subgraph Storage ["Persistence Layer"]
        DB[("MongoDB (Collections: users, contacts, campaigns, emails, send_logs)")]
        Disk[("Local Uploads Storage (uploads/resumes/*.pdf)")]
    end

    subgraph Outbound ["Email Delivery Layer"]
        SMTPHost["SMTP Server (Gmail / Outlook / SendGrid / Custom)"]
        Inbox["Recruiter Inbox (Receives Email + Attached PDF Resume)"]
    end

    UI <-->|JSON / REST| Router
    Router --> AuthSvc
    Router --> ResumeSvc
    Router --> ContactSvc
    Router --> AISvc
    Router --> QueueSvc
    
    ResumeSvc --> Disk
    Router <--> DB
    QueueSvc --> Disk
    QueueSvc -->|MIME Multipart Mixed + Attachment| SMTPHost
    SMTPHost --> Inbox
```

---

## 🗄️ Database Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USERS ||--o{ CONTACTS : owns
    USERS ||--o{ CAMPAIGNS : creates
    USERS ||--o{ SEND_LOGS : records
    CAMPAIGNS ||--o{ EMAILS : contains
    CONTACTS ||--o{ EMAILS : targets
    EMAILS ||--o| SEND_LOGS : logs_to

    USERS {
        string id PK
        string email UK
        string hashed_password
        string full_name
        string resume_path
        string resume_filename
        object candidate_profile
        object smtp_settings
        datetime created_at
    }

    CONTACTS {
        string id PK
        string user_id FK
        string name
        string email
        string company
        string title
        string location
        string linkedin_url
        string status
        datetime created_at
    }

    CAMPAIGNS {
        string id PK
        string user_id FK
        string name
        string target_role
        string tone
        string subject_style
        string custom_instructions
        string status
        int total_contacts
        int generated_count
        int approved_count
        int sent_count
        datetime created_at
    }

    EMAILS {
        string id PK
        string campaign_id FK
        string user_id FK
        string contact_id FK
        string recipient_name
        string recipient_email
        string recipient_company
        string subject
        string body
        string status
        datetime created_at
        datetime updated_at
    }

    SEND_LOGS {
        string id PK
        string user_id FK
        string campaign_id FK
        string email_id FK
        string contact_id FK
        string recipient_name
        string recipient_email
        string recipient_company
        string subject
        string status
        boolean resume_attached
        string resume_filename
        string error_message
        datetime sent_at
    }
```

---

## 🔄 Automation & Pipeline Diagrams

### 1. End-to-End Campaign Outreach Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as User (Candidate)
    participant UI as React Frontend
    participant API as FastAPI Backend
    participant DB as MongoDB
    participant AI as AI Engine (LLM)
    participant SMTP as SMTP Dispatcher
    actor Recruiter as Recruiter's Mailbox

    Candidate->>UI: Upload PDF Resume & Set Goals
    UI->>API: POST /api/resume/upload
    API->>API: Parse Text, Skills, Work History (PyPDF)
    API->>DB: Save Resume PDF Path & Extracted Profile

    Candidate->>UI: Upload Recruiter CSV / Excel List
    UI->>API: POST /api/contacts/upload
    API->>API: Deduplicate & Validate Email Syntax
    API->>DB: Persist Validated Contacts

    Candidate->>UI: Create Campaign & Click "Generate AI Emails"
    UI->>API: POST /api/campaigns/{id}/generate
    API->>AI: Synthesize (Candidate Profile + Target Role + Recruiter Context)
    AI-->>API: Generated JSON (Subject, Body)
    API->>DB: Insert Draft Emails (status: draft)

    Candidate->>UI: Review & Approve Drafts
    UI->>API: PUT /api/emails/{id} (status: approved)

    Candidate->>UI: Trigger Campaign Dispatch
    UI->>API: POST /api/dispatch/campaign/{id}
    
    loop For Every Approved Email
        API->>SMTP: Fetch Resume File from Disk
        SMTP->>SMTP: Construct MIME Multipart/Mixed (Body + PDF Attachment)
        SMTP->>Recruiter: Send Email via Authenticated SMTP (with Human Jitter Delay)
        SMTP->>DB: Insert Audit Log in send_logs
        SMTP->>UI: Push Real-Time Progress %
    end

    UI-->>Candidate: Completed Campaign Delivery Summary
```

---

### 2. Campaign State Machine & Lifecycle Flow

```mermaid
stateDiagram-v2
    [*] --> DraftCreated: Create Campaign
    DraftCreated --> Generating: Request AI Generation
    Generating --> ReviewPending: Draft Emails Synthesized
    ReviewPending --> Approved: User Approves Emails
    ReviewPending --> Editing: Inline Body/Subject Edit
    Editing --> ReviewPending: Save Changes
    Approved --> Dispatching: Click Dispatch Campaign
    Dispatching --> RateLimiting: Apply Daily Cap & Jitter (0.2s-0.8s)
    RateLimiting --> Delivered: SMTP Transmitted with Attached PDF
    RateLimiting --> Failed: Connection / Auth Error
    Delivered --> [*]
    Failed --> ReviewPending: Retry Failed Delivery
```

---

### 3. Contact Ingestion & Data Cleansing Pipeline

```mermaid
flowchart TD
    A[Upload CSV / Excel File] --> B[Detect Column Headers Automatically]
    B --> C{Verify Required Fields<br/>Name, Email, Company}
    C -- Missing --> D[Prompt User or Skip Record]
    C -- Valid --> E[Email Regex Syntax Validation]
    E -- Invalid --> F[Flag Record as 'syntax_error']
    E -- Valid --> G{Check User Database for Existing Email}
    G -- Duplicate --> H[Flag as 'duplicate' / Skip]
    G -- Unique --> I[Insert into Contacts Collection]
    I --> J[Ready for Campaign Assignment]
```

---

### 4. Background SMTP Dispatch & Resume Attachment Pipeline

```mermaid
flowchart LR
    A([Start Batch Dispatch]) --> B{Sandbox Simulation?}
    
    B -- Yes --> C[Simulate Sending<br/>Log Event to DB]
    B -- No --> D{User Uploaded Resume?}
    
    D -- Yes & Enabled --> E[Build MIME Mixed<br/>• Text/HTML Body<br/>• Attach PDF Resume]
    D -- No / Disabled --> F[Build MIME Alternative<br/>• Text/HTML Body Only]
    
    E --> G[Apply Daily Limit & Randomized Jitter]
    F --> G
    
    G --> H[Transmit via TLS/SSL to Outbound Host]
    H --> I[(Write Delivery Log to send_logs)]
    C --> I
    
    I --> J{Remaining Approved Emails?}
    J -- Yes --> G
    J -- No --> K([Batch Dispatch Completed])
```

---

## 📸 Platform Walkthrough & Screenshots

### 1. Landing Page
Modern hero section introducing automated outreach capabilities.
![Landing Page](screenshots/landing-page.png)

---

### 2. Analytics Dashboard
Live metrics tracking total contacts, active campaigns, generated drafts, approval ratios, and delivery rates.
![Dashboard Overview](screenshots/dashboard-overview.png)

---

### 3. Recruiter Contacts Management
Spreadsheet upload zone with automated header detection, email syntax validation, and duplicate filtering.
![Contacts Management](screenshots/contacts-management.png)

---

### 4. Outreach Campaigns Hub
Create targeted outreach campaigns, select customized tones, track generation progress, and launch review workspaces.
![Campaigns Hub](screenshots/campaigns-hub.png)

---

### 5. SMTP Settings & Inbox Safeguards
Configure outbound email servers (Gmail, Outlook 365, SendGrid, Custom SMTP), set daily rate limits, and toggle Sandbox Simulation Mode.
![SMTP Settings](screenshots/smtp-settings.png)

---

### 6. Outreach History & Delivery Audit Trail
Audit all outbound messages with exact timestamps, recruiter information, delivery statuses (*Delivered, Simulated, Failed*), and exportable CSV reports.
![Outreach History](screenshots/outreach-history.png)

---

## ⚡ Core Features

| Feature | Description |
|---|---|
| 📄 **Resume Parser** | Ingests `.pdf` / `.docx` resumes and structures candidate profile, skills, experience, and links. |
| 📎 **PDF Resume Attachments** | Automatically attaches the candidate's PDF resume to outgoing emails during live SMTP delivery. |
| 👥 **Contact Management** | Smart CSV/Excel import with automated header mapping, regex validation, and deduplication. |
| 🤖 **Multi-Tone AI Engine** | Writes tailored cold emails matching candidate qualifications to company needs across 4 tones. |
| ✍️ **Review Workspace** | Full rich editor with live word count, reading time estimates, inline editing, and 1-click approvals. |
| 🛡️ **Anti-Spam Controls** | Configurable daily limits (5–250/day) and humanized random jitter (0.2s–0.8s) to protect sender reputation. |
| 🧪 **Sandbox Simulation** | Zero-risk testing mode to rehearse campaign workflows without sending real emails. |
| 📊 **History & Audit Logs** | Complete delivery logs with timestamps, recipient avatars, company tags, and one-click CSV export. |

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios |
| **Backend** | Python 3.10+, FastAPI, Pydantic v2, Uvicorn |
| **Database** | MongoDB (Motor Async Client) |
| **Document Processing** | PyPDF, python-docx, Pandas, OpenPyXL |
| **Email Protocol** | Python `smtplib`, `email.mime` (Multipart Mixed + Application) |
| **Containerization** | Docker, Docker Compose, Nginx |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python**: 3.10+
- **Node.js**: 18+ & npm
- **MongoDB**: Local instance running on port `27017` or MongoDB Atlas URI

---

### Method 1: Local Development Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/smartreach-ai.git
cd smartreach-ai
```

#### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows (Git Bash / PowerShell):
source venv/Scripts/activate     # or .\venv\Scripts\activate

# macOS / Linux:
source venv/bin/activate

# Install Python packages
pip install -r requirements.txt

# Configure environment variables
cp ../.env.example .env
```

#### 3. Frontend Setup
```bash
# In a new terminal window:
cd frontend
npm install
npm run dev
```

#### 4. Start the Backend Server
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

- **Frontend App**: `http://localhost:5173` (or `http://localhost:5174`)
- **API Swagger Docs**: `http://localhost:8000/docs`

---

### Method 2: One-Click Windows Launcher
Double-click `run_dev.bat` in the project root:
```cmd
run_dev.bat
```

---

### Method 3: Docker Compose
```bash
docker-compose up --build -d
```
Access the application at `http://localhost:3000`.

---

## 📧 SMTP Configuration Guide

### Gmail / Google Workspace:
1. Open **Google Account Security**: `https://myaccount.google.com/security`
2. Enable **2-Step Verification**.
3. Generate an **App Password**: `https://myaccount.google.com/apppasswords`
4. Select App Name: `SmartReach` and copy the generated 16-character code.
5. In SmartReach AI (`/settings`):
   - **Provider**: `Gmail / Google Workspace`
   - **SMTP Host**: `smtp.gmail.com` | **Port**: `587`
   - **Username**: Your Gmail address
   - **App Password**: Paste your 16-character App Password
   - **Security**: Enable STARTTLS
6. Click **Test Connection** → **Save Settings**.

---

## 🔌 API Endpoints Reference

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Login and obtain JWT token |
| `GET` | `/api/profile` | Retrieve candidate profile |
| `PUT` | `/api/profile` | Update candidate profile & target roles |
| `POST` | `/api/resume/upload` | Upload and parse PDF/DOCX resume |
| `GET` | `/api/contacts` | List contacts with filtering & search |
| `POST` | `/api/contacts/upload` | Ingest contacts from CSV/Excel file |
| `DELETE`| `/api/contacts` | Delete all uploaded contacts |
| `GET` | `/api/campaigns` | List outreach campaigns |
| `POST` | `/api/campaigns` | Create new campaign |
| `POST` | `/api/campaigns/{id}/generate` | Generate AI email drafts |
| `GET` | `/api/emails/campaign/{id}` | Fetch generated emails for review |
| `PUT` | `/api/emails/{id}` | Edit email content or update approval status |
| `POST` | `/api/emails/campaign/{id}/approve-all` | Approve all drafts in campaign |
| `POST` | `/api/dispatch/campaign/{id}` | Trigger background SMTP email delivery |
| `GET` | `/api/dispatch/campaign/{id}/status` | Check real-time dispatch progress |
| `GET` | `/api/history` | Retrieve delivery audit logs |
| `GET` | `/api/history/export` | Export delivery logs as CSV |
| `GET` | `/api/settings/smtp` | Get current SMTP & dispatch settings |
| `PUT` | `/api/settings/smtp` | Update SMTP credentials & attachment settings |
| `POST` | `/api/settings/smtp/test` | Test live SMTP server connectivity |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
