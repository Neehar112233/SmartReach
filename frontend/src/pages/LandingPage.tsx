import { Link } from 'react-router-dom';
import {
  Zap,
  Upload,
  Users,
  Sparkles,
  Send,
  Shield,
  BarChart3,
  Mail,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Button from '../components/ui/Button';

const steps = [
  {
    icon: Upload,
    title: 'Upload Profile',
    description: 'Add your resume and professional details to personalize outreach.',
  },
  {
    icon: Users,
    title: 'Upload HR Contacts',
    description: 'Import your Excel or CSV file with HR contact information.',
  },
  {
    icon: Sparkles,
    title: 'Generate Emails',
    description: 'AI crafts personalized, professional emails for each contact.',
  },
  {
    icon: Send,
    title: 'Review & Send',
    description: 'Preview, edit, approve, and send emails through your Gmail.',
  },
];

const features = [
  {
    icon: Sparkles,
    title: 'AI Personalization',
    description:
      'Each email is uniquely crafted using your profile and the HR contact\'s role, company, and designation.',
    color: 'text-primary-600 bg-primary-50',
  },
  {
    icon: Shield,
    title: 'Smart Validation',
    description:
      'Automatic duplicate detection, email validation, and data cleaning before any emails are generated.',
    color: 'text-success bg-success-light',
  },
  {
    icon: Mail,
    title: 'Secure Gmail OAuth',
    description:
      'Send emails directly from your Gmail account. No passwords stored — ever.',
    color: 'text-warning bg-warning-light',
  },
  {
    icon: BarChart3,
    title: 'Campaign Tracking',
    description:
      'Track every email\'s status — generated, approved, sent, or failed — in real time.',
    color: 'text-purple-600 bg-purple-50',
  },
];

export default function LandingPage() {
  return (
    <div className="bg-surface">
      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden">
        {/* Subtle background accent */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary-100/40 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-sm font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              AI-Powered Outreach Platform
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary tracking-tight leading-tight">
              Personalized HR outreach{' '}
              <span className="text-primary-600">powered by AI</span>
            </h1>

            <p className="mt-5 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Upload your resume and HR contact list. Let AI generate personalized
              outreach emails, review them, and send approved emails securely
              through your Gmail.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register">
                <Button size="lg" icon={<ArrowRight className="w-4.5 h-4.5" />}>
                  Get Started
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg">
                  How It Works
                </Button>
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-text-tertiary">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success" />
                No passwords stored
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Full email control
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Review before sending
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section id="how-it-works" className="bg-surface-secondary py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              How It Works
            </h2>
            <p className="mt-3 text-text-secondary text-lg max-w-xl mx-auto">
              Four simple steps to professional, personalized outreach.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                <div className="bg-surface rounded-xl border border-border p-6 shadow-card hover:shadow-md transition-shadow duration-200 h-full">
                  {/* Step number */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {index + 1}
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <step.icon className="w-4.5 h-4.5 text-primary-600" />
                    </div>
                  </div>

                  <h3 className="text-base font-semibold text-text-primary mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Connector arrow (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-4 h-4 text-text-tertiary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
              Built for Professional Outreach
            </h2>
            <p className="mt-3 text-text-secondary text-lg max-w-xl mx-auto">
              Everything you need to run effective, personalized email campaigns.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-surface rounded-xl border border-border p-6 shadow-card hover:shadow-md transition-shadow duration-200"
              >
                <div className={`w-10 h-10 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="bg-surface-secondary border-t border-border py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Ready to streamline your outreach?
          </h2>
          <p className="mt-3 text-text-secondary text-lg">
            Set up your profile, upload contacts, and let AI do the heavy lifting.
          </p>
          <div className="mt-6">
            <Link to="/register">
              <Button size="lg" icon={<ArrowRight className="w-4.5 h-4.5" />}>
                Start Your First Campaign
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-surface border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-text-primary">
                SmartReach AI
              </span>
            </div>
            <p className="text-sm text-text-tertiary">
              &copy; {new Date().getFullYear()} SmartReach AI. Built for professional outreach.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
