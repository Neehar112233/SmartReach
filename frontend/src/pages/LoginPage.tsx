import { useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Zap, Mail, Lock, AlertCircle, Eye, EyeOff, RotateCw, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { getCaptcha, resetPassword } from '../services/api';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // --- Sign In State ---
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Reset Password & CAPTCHA State ---
  const [resetEmail, setResetEmail] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Fetch a new CAPTCHA challenge
  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const data = await getCaptcha();
      setCaptchaId(data.captcha_id);
      setCaptchaSvg(data.captcha_svg);
      setCaptchaInput('');
    } catch {
      setError('Failed to load CAPTCHA challenge. Please refresh.');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  // When switching to forgot mode, pre-populate email and load captcha
  const handleOpenForgotMode = () => {
    setIsForgotMode(true);
    setError('');
    setSuccessMessage('');
    setResetEmail(email);
    fetchCaptcha();
  };

  const handleBackToLogin = () => {
    setIsForgotMode(false);
    setError('');
    setCaptchaInput('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Sign In Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset Password Handler
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!resetEmail.trim()) {
      setError('Please enter your account email address.');
      return;
    }
    if (!captchaInput.trim()) {
      setError('Please enter the CAPTCHA code shown.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setResetLoading(true);

    try {
      const res = await resetPassword({
        email: resetEmail.trim(),
        captcha_id: captchaId,
        captcha_code: captchaInput.trim().toUpperCase(),
        new_password: newPassword,
      });

      setSuccessMessage(res.message || 'Password reset successfully. You can now sign in.');
      setEmail(resetEmail.trim());
      setIsForgotMode(false);
      setPassword('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Failed to reset password. Please check the code and try again.'
      );
      // Auto refresh captcha on failure
      fetchCaptcha();
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center group-hover:bg-primary-700 transition-colors shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-text-primary tracking-tight">
              SmartReach <span className="text-primary-600">AI</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl border border-border shadow-lg p-8 transition-all">
          {!isForgotMode ? (
            /* ================= SIGN IN VIEW ================= */
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
                <p className="text-sm text-text-secondary mt-1">
                  Sign in to your account to continue.
                </p>
              </div>

              {successMessage && (
                <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-800">{successMessage}</p>
                </div>
              )}

              {error && (
                <div className="mb-5 bg-error-light border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-error shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-medium text-text-primary mb-1.5"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                    <input
                      id="login-email"
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-medium text-text-primary"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenForgotMode}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                      placeholder="Enter your password"
                      autoComplete="current-password"
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
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full"
                  size="md"
                >
                  Sign In
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-text-secondary">
                Don&apos;t have an account?{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary-600 hover:text-primary-700"
                >
                  Create one
                </Link>
              </p>
            </>
          ) : (
            /* ================= FORGOT PASSWORD VIEW ================= */
            <>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary mb-3 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-text-primary">Reset Password</h1>
                    <p className="text-xs text-text-secondary">
                      Solve the security CAPTCHA to update your password.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-5 bg-error-light border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2.5">
                  <AlertCircle className="w-4.5 h-4.5 text-error shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="space-y-4">
                {/* Account Email */}
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-sm font-medium text-text-primary mb-1.5"
                  >
                    Account Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Visual CAPTCHA Box */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Security Verification
                  </label>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 bg-surface-secondary border border-border rounded-lg p-1.5 flex items-center justify-center min-h-[60px] overflow-hidden shadow-inner">
                      {captchaSvg ? (
                        <div
                          className="w-full flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: captchaSvg }}
                        />
                      ) : (
                        <div className="text-xs text-text-tertiary">Loading challenge...</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={fetchCaptcha}
                      disabled={captchaLoading}
                      title="Generate new CAPTCHA challenge"
                      className="p-3 bg-surface border border-border hover:bg-surface-secondary text-text-secondary hover:text-text-primary rounded-lg transition-colors flex items-center justify-center shadow-sm"
                    >
                      <RotateCw
                        className={`w-4.5 h-4.5 ${captchaLoading ? 'animate-spin text-primary-600' : ''}`}
                      />
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary font-mono tracking-widest uppercase placeholder:text-text-tertiary placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                    placeholder="Enter the 6-character code"
                    autoComplete="off"
                    spellCheck="false"
                  />
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
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4.5 h-4.5" />
                      ) : (
                        <Eye className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </div>
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
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4.5 h-4.5" />
                      ) : (
                        <Eye className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  loading={resetLoading}
                  className="w-full"
                  size="md"
                >
                  Confirm & Reset Password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

