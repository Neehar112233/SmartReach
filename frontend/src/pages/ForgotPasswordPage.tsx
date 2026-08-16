import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, AlertCircle, Eye, EyeOff, CheckCircle2, ArrowLeft, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

export default function ForgotPasswordPage() {
  const { forgotPassword, verifyResetOTP, resetPassword, resendOTP } = useAuth();
  const navigate = useNavigate();

  // Multi-step flow: 'email' (Step 1) -> 'otp' (Step 2) -> 'new_password' (Step 3) -> 'success' (Step 4)
  const [step, setStep] = useState<'email' | 'otp' | 'new_password' | 'success'>('email');

  // Form inputs
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP inputs (6 separate digit boxes)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // State feedback & countdown
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password requirements check
  const passwordChecks = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(newPassword) },
    { label: 'Contains a letter', met: /[a-zA-Z]/.test(newPassword) },
  ];

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const allChecksMet = passwordChecks.every((c) => c.met) && passwordsMatch;

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus first OTP box on entering Step 2
  useEffect(() => {
    if (step === 'otp') {
      otpInputRefs.current[0]?.focus();
    }
  }, [step]);

  // ================= Step 1: Send Recovery OTP =================
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await forgotPassword(email);
      setStep('otp');
      setResendCooldown(30);
      setSuccessMessage(res.message || 'A 6-digit recovery code has been sent to your email inbox.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Could not find an account with that email address.'
      );
    } finally {
      setLoading(false);
    }
  };

  // OTP inputs handling
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

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

  // ================= Step 2: Verify OTP Code =================
  const handleVerifyOtpOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const enteredOtp = otpDigits.join('');

    if (enteredOtp.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      await verifyResetOTP(email, enteredOtp);
      // Valid! Transition to Step 3 (Set New Password)
      setStep('new_password');
      setSuccessMessage('Code verified successfully. Now create your new password.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Invalid or expired code. Please check your email or request a new code.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ================= Step 3: Set New Password =================
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const enteredOtp = otpDigits.join('');

    if (!allChecksMet) {
      setError('Please ensure your password satisfies all criteria.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, enteredOtp, newPassword);
      setStep('success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Failed to update password. Please try requesting a new recovery code.'
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
      await resendOTP(email, 'forgot_password');
      setResendCooldown(30);
      setSuccessMessage('A fresh 6-digit code has been dispatched to your email inbox.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Failed to resend code. Please try again.'
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
          {/* ================= STEP 1: Enter Email ================= */}
          {step === 'email' && (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Forgot your password?
                </h1>
                <p className="text-sm text-text-secondary mt-1">
                  Enter your email address and we&apos;ll send a 6-digit recovery code directly to your inbox.
                </p>
              </div>

              {error && (
                <div className="mb-5 bg-error-light border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-error shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSendResetCode} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-sm font-medium text-text-primary mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                    <input
                      id="reset-email"
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

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full mt-2"
                  size="md"
                >
                  Send Recovery Code
                </Button>
              </form>
            </>
          )}

          {/* ================= STEP 2: Enter & Verify OTP ================= */}
          {step === 'otp' && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setError('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Email
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Enter verification code
                </h1>
                <p className="text-sm text-text-secondary mt-1.5">
                  Enter the 6-digit security code sent to <br />
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

              <form onSubmit={handleVerifyOtpOnly} className="space-y-6">
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
                  Verify Code
                </Button>
              </form>

              {/* Resend Code */}
              <div className="mt-6 text-center">
                <p className="text-xs text-text-secondary">
                  Didn&apos;t receive the code? Check Spam folder or{' '}
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

          {/* ================= STEP 3: Enter New Password & Confirm ================= */}
          {step === 'new_password' && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setStep('otp');
                  setError('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Code
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Set New Password
                </h1>
                <p className="text-sm text-text-secondary mt-1">
                  Create a new password for <span className="font-semibold text-text-primary">{email}</span>
                </p>
              </div>

              {error && (
                <div className="mb-5 bg-error-light border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-error shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSetNewPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="block text-sm font-medium text-text-primary mb-1.5"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                    <input
                      id="reset-new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                      placeholder="Enter new strong password"
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

                  {/* Password requirement badges */}
                  {newPassword.length > 0 && (
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

                {/* Confirm New Password */}
                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-sm font-medium text-text-primary mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                    <input
                      id="reset-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-lg border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow ${
                        confirmPassword.length > 0 && !passwordsMatch
                          ? 'border-error'
                          : 'border-border'
                      }`}
                      placeholder="Confirm new password"
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
                  className="w-full mt-2"
                  size="md"
                >
                  Reset Password
                </Button>
              </form>
            </div>
          )}

          {/* ================= STEP 4: Success Screen ================= */}
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full mx-auto flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                Password Reset Successfully!
              </h2>
              <p className="text-sm text-text-secondary mb-6">
                Your password has been updated. You can now sign in to your SmartReach AI account with your new credentials.
              </p>
              <Button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full"
                size="md"
              >
                Go to Sign In
              </Button>
            </div>
          )}

          {step !== 'success' && (
            <p className="mt-6 text-center text-sm text-text-secondary">
              Remember your password?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
