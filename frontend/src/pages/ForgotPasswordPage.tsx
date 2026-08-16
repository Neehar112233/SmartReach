import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, AlertCircle, Eye, EyeOff, CheckCircle2, ArrowLeft, RefreshCw, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

export default function ForgotPasswordPage() {
  const { forgotPassword, resetPassword, resendOTP } = useAuth();
  const navigate = useNavigate();

  // Step state: 'email' | 'reset' | 'success'
  const [step, setStep] = useState<'email' | 'reset' | 'success'>('email');

  // Form inputs
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP inputs (6 individual boxes)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Feedback states
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Password validation rules
  const passwordChecks = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(newPassword) },
    { label: 'Contains a letter', met: /[a-zA-Z]/.test(newPassword) },
  ];

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const allChecksMet = passwordChecks.every((c) => c.met) && passwordsMatch;

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus first OTP input when transitioning to reset step
  useEffect(() => {
    if (step === 'reset') {
      otpInputRefs.current[0]?.focus();
    }
  }, [step]);

  // Step 1: Send reset OTP
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await forgotPassword(email);
      setStep('reset');
      setResendCooldown(30);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
      }
      setSuccessMessage(res.message || 'Password reset code sent to your email.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Could not find an account with that email.'
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

  const fillDevOtp = () => {
    if (!devOtp || devOtp.length !== 6) return;
    const digits = devOtp.split('');
    setOtpDigits(digits);
    otpInputRefs.current[5]?.focus();
  };

  // Step 2: Submit OTP and new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const enteredOtp = otpDigits.join('');

    if (enteredOtp.length !== 6) {
      setError('Please enter the complete 6-digit reset code.');
      return;
    }

    if (!allChecksMet) {
      setError('Please ensure your new password satisfies all criteria.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, enteredOtp, newPassword);
      setStep('success');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Invalid or expired reset code. Please try again.'
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
      const res = await resendOTP(email, 'forgot_password');
      setResendCooldown(30);
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
      }
      setSuccessMessage('A fresh reset code has been sent to your email.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Failed to resend reset code. Please try again.'
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
                  Enter your email address and we&apos;ll send you a 6-digit recovery code.
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
                  Send Reset Code
                </Button>
              </form>
            </>
          )}

          {step === 'reset' && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setError('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">
                  Set new password
                </h1>
                <p className="text-sm text-text-secondary mt-1.5">
                  Enter the 6-digit code sent to <br />
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

              {devOtp && (
                <div className="mb-5 p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-indigo-700 font-medium">
                    Test Mode Code: <strong className="tracking-wider">{devOtp}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={fillDevOtp}
                    className="text-xs text-primary-600 font-semibold hover:underline"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* 6-Digit OTP Boxes */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2 text-center">
                    6-Digit Security Code
                  </label>
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
                </div>

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

                  {/* Password requirements */}
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
                  disabled={!allChecksMet || otpDigits.some((d) => !d)}
                  className="w-full mt-2"
                  size="md"
                >
                  Reset Password & Continue
                </Button>
              </form>

              {/* Resend */}
              <div className="mt-6 text-center">
                <p className="text-xs text-text-secondary">
                  Didn&apos;t receive code?{' '}
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

          {step === 'success' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full mx-auto flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
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
