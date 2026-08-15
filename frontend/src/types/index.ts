// ============================================
// SmartReach AI — Shared Type Definitions
// ============================================

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  outreachObjective?: string;
  customInstructions?: string;
  resumeUploaded: boolean;
  resumeFilename?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExperienceItem {
  title: string;
  company: string;
  duration?: string;
  location?: string;
  description?: string;
}

export interface EducationItem {
  degree: string;
  institution: string;
  year?: string;
  grade?: string;
}

export interface ProjectItem {
  title: string;
  tech_stack?: string;
  description?: string;
  url?: string;
}

export interface ExtractedProfile {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  summary?: string | null;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  projects: ProjectItem[];
  raw_text?: string | null;
}

export interface ResumeUploadResponse {
  message: string;
  filename: string;
  resume_uploaded: boolean;
  extracted_profile: ExtractedProfile;
}

export interface ContactUploadStats {
  total_rows: number;
  valid_count: number;
  invalid_count: number;
  duplicates_count: number;
}

export interface ContactUploadResponse {
  message: string;
  filename: string;
  stats: ContactUploadStats;
  contacts: Contact[];
}

export interface Contact {
  id: string;
  campaign_id?: string | null;
  campaignId?: string | null;
  sno: number;
  name: string;
  email: string;
  title: string;
  company: string;
  location?: string | null;
  linkedin_url?: string | null;
  is_valid: boolean;
  validation_errors: string[];
  email_status: EmailStatus;
  isValid?: boolean;
  validationErrors?: string[];
  emailStatus?: EmailStatus;
}

export type EmailStatus =
  | 'draft'
  | 'generated'
  | 'approved'
  | 'rejected'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed';

export type OutreachType =
  | 'internship'
  | 'fulltime'
  | 'referral'
  | 'general'
  | 'custom';

export type EmailTone =
  | 'professional'
  | 'friendly_professional'
  | 'concise'
  | 'formal';

export type EmailLength = 'short' | 'medium' | 'detailed';

export interface Campaign {
  id: string;
  user_id?: string;
  userId?: string;
  name: string;
  target_role?: string;
  targetRole?: string;
  outreachType?: OutreachType;
  tone: string;
  emailLength?: EmailLength;
  custom_instructions?: string | null;
  customInstructions?: string | null;
  subject_line_style?: string;
  total_contacts?: number;
  totalContacts?: number;
  emails_generated?: number;
  generated?: number;
  emails_approved?: number;
  approved?: number;
  emails_sent?: number;
  sent?: number;
  emails_failed?: number;
  failed?: number;
  rejected?: number;
  pending?: number;
  status: string;
  contact_ids?: string[];
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export type CampaignStatus =
  | 'draft'
  | 'generating'
  | 'ready'
  | 'generated'
  | 'sending'
  | 'paused'
  | 'completed'
  | 'failed';

export interface GeneratedEmail {
  id: string;
  campaign_id?: string;
  campaignId?: string;
  contact_id?: string;
  contactId?: string;
  user_id?: string;
  recipient_name?: string;
  contactName?: string;
  recipient_email?: string;
  contactEmail?: string;
  recipient_title?: string;
  contactTitle?: string;
  recipient_company?: string;
  contactCompany?: string;
  subject: string;
  body: string;
  greeting?: string;
  signature?: string;
  personalizationPoints?: string[];
  relevanceScore?: number;
  relevanceReasons?: string[];
  status: string;
  error_message?: string | null;
  errorMessage?: string;
  generated_at?: string;
  generatedAt?: string;
  approvedAt?: string;
  sentAt?: string;
  updated_at?: string;
}

export interface CampaignStats {
  total: number;
  generated: number;
  approved: number;
  rejected: number;
  sent: number;
  failed: number;
  pending: number;
}

export interface DashboardStats {
  totalContacts: number;
  emailsGenerated: number;
  emailsApproved: number;
  emailsSent: number;
  emailsFailed: number;
  totalCampaigns: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  database: string;
  demoMode: boolean;
}

export interface ApiError {
  detail: string;
  code?: string;
}

export interface SMTPSettings {
  provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password?: string;
  sender_name: string;
  sender_email: string;
  use_tls: boolean;
  use_ssl: boolean;
  daily_limit: number;
  delay_seconds: number;
  simulation_mode: boolean;
  attach_resume?: boolean;
  is_configured?: boolean;
  has_password?: boolean;
  connection_status?: string;
  last_tested_at?: string;
  updated_at?: string;
}

export interface SMTPTestResponse {
  success: boolean;
  message: string;
  latency_ms?: number;
}

export interface SendLog {
  id: string;
  user_id: string;
  campaign_id: string;
  campaign_name: string;
  email_id: string;
  contact_id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_company: string;
  recipient_title: string;
  subject: string;
  body_snippet: string;
  status: string;
  resume_attached?: boolean;
  resume_filename?: string;
  error_message?: string | null;
  sent_at: string;
}

export interface HistoryStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_campaigns: number;
}
