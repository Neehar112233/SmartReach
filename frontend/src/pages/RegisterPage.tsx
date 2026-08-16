import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, User, AlertCircle, Eye, EyeOff, CheckCircle2, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

export default function RegisterPage() {
  const { registerSendOTP, registerVerifyOTP, resendOTP } = useAuth();
  const navigate = useNavigate();

  // Step state: 'form' | 'otp'
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP inputs (6 individual digit boxes)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback & timing states
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password validation checks
  const passwordChecks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains a letter', met: /[a-zA-Z]/.test(password) },
  ];

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const allChecksMet = passwordChecks.every((c) => c.met) && passwordsMatch;

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus first OTP input when transitioning to OTP step
  useEffect(() => {
    if (step === 'otp') {
      otpInputRefs.current[0]?.focus();
    }
  }, [step]);

  // Step 1: Send registration OTP
  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!passwordChecks.every((c) => c.met)) {
      setError('Please satisfy all password security requirements.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerSendOTP(fullName, email, password);
      setStep('otp');
      setResendCooldown(30);
      setSuccessMessage(res.message || 'Verification code sent directly to your email inbox.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Failed to start registration. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // OTP digit handling
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(pasted.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Step 2: Verify OTP and activate account
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const enteredOtp = otpDigits.join('');

    if (enteredOtp.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await registerVerifyOTP(email, enteredOtp);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Invalid or expired verification code. Please check your email and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await resendOTP(email, 'register');
      setResendCooldown(30);
      setSuccessMessage('A fresh verification code has been dispatched to your email.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Could not resend verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center group-hover:bg-primary-700 transition-colors">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-text-primary tracking-tight">
              SmartReach <span className="text-primary-600">AI</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl border border-border shadow-lg p-8">
          {step === 'form' ? (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary">
                  Create your account
                </h1>
                <p className="text-sm text-text-secondary mt-1">
                  We will send a one-time verification code to your email.
                </p>
              </div>

              {error && (
                <div className="mb-5 bg-error-light border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-error shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleInitiateRegister} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-sm font-medium text-text-primary mb-1.5"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                    <input
                      id="reg-name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={100}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                      placeholder="Your full name"
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="reg-email"
                    className="block text-sm font-medium text-text-primary mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block text-sm font-medium text-text-primary mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4.5 h-4.5" />
                      ) : (
                        <Eye className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </div>

                  {/* Password requirements */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {passwordChecks.map((check) => (
                        <div
                          key={check.label}
                          className={`flex items-center gap-1.5 text-xs ${
                            check.met ? 'text-success' : 'text-text-tertiary'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {check.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="reg-confirm-password"
                    className="block text-sm font-medium text-text-primary mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                    <input
                      id="reg-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow ${
                        confirmPassword.length > 0 && !passwordsMatch
                          ? 'border-error'
                          : 'border-border'
                      }`}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                    />
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="mt-1 text-xs text-error">Passwords do not match.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  disabled={!allChecksMet}
                  className="w-full"
                  size="md"
                >
                  Send Verification Code
                </Button>
              </form>
            </>
          ) : (
            /* Step 2: 6-Digit Email OTP Verification Screen */
            <div>
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit Details
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Verify your email
                </h1>
                <p className="text-sm text-text-secondary mt-1.5">
                  Enter the 6-digit verification code sent directly to <br />
                  <span className="font-semibold text-text-primary">{email}</span>
                </p>
              </div>

              {error && (
                <div className="mb-5 bg-error-light border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-error shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-700">{successMessage}</p>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* 6-Digit OTP Boxes */}
                <div className="flex items-center justify-between gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm"
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  disabled={otpDigits.some((d) => !d)}
                  className="w-full"
                  size="md"
                >
                  Verify & Activate Account
                </Button>
              </form>

              {/* Resend OTP */}
              <div className="mt-6 text-center">
                <p className="text-xs text-text-secondary">
                  Didn&apos;t receive the email? Check your Spam folder or{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    className="font-medium text-primary-600 hover:text-primary-700 disabled:text-text-tertiary disabled:cursor-not-allowed inline-flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </p>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
