import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, Key, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ForgotPasswordOTPProps {
  onBackToLogin: () => void;
  onSuccess: () => void;
  initialEmail?: string;
}

export function ForgotPasswordOTP({ onBackToLogin, onSuccess, initialEmail = '' }: ForgotPasswordOTPProps) {
  // Local active step: 1 (Request OTP) or 2 (Verify OTP + Update Password)
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Step 1: Request OTP by Email
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setMessage(null);

    try {
      // Trigger reset via Supabase resetPasswordForEmail (sends dynamic 6 digit OTP/recovery token)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'A 6-digit verification code has been sent to your email address.'
      });
      
      // Proceed to step 2 without reloads to preserve the secure application state
      setStep(2);
    } catch (err: any) {
      console.error('Error requesting recovery OTP:', err);
      setMessage({
        type: 'error',
        text: err.message || 'Unable to send recovery code. Please verify your email.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Validate 6-digit OTP and instantly update the user password
  const handleVerifyAndUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code || !newPassword) return;

    if (code.trim().length !== 6) {
      setMessage({
        type: 'error',
        text: 'The verification code must be exactly 6 digits.'
      });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({
        type: 'error',
        text: 'The password must be at least 6 characters long.'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'The passwords you entered do not match.'
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // 1. Validate OTP token with type recovery (generates secure active session)
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'recovery'
      });

      if (verifyError) throw verifyError;

      // 2. Chained immediately with updateUser to update the password securely
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setMessage({
        type: 'success',
        text: 'Your password has been successfully updated! Signing you in...'
      });

      // Smooth programmatic success redirection
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Error verifying OTP and updating password:', err);
      setMessage({
        type: 'error',
        text: err.message || 'The code entered is invalid or expired. Please check and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="password-recovery-otp-container">
      {/* Alert Messaging System */}
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl text-sm font-normal flex items-start gap-3 border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-650 border-emerald-100'
                : 'bg-rose-50 text-rose-650 border-rose-100'
            }`}
            id="recovery-feedback-message"
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            )}
            <span className="text-xs sm:text-sm leading-relaxed">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          /* ================= STEP 1: REQUEST OTP ================= */
          <motion.form
            key="step1"
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 15 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSendCode}
            className="space-y-5"
            id="recovery-step1-form"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400 px-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 group-focus-within:bg-brand-blue/5 transition-colors">
                  <Mail className={`w-5 h-5 transition-colors ${email ? 'text-blue-600' : 'text-slate-300'}`} />
                </div>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-4 font-normal text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue/20 transition-all placeholder:text-slate-300 text-sm"
                  id="recovery-email-input"
                />
              </div>
            </div>

            <button
              disabled={isLoading || !email}
              type="submit"
              className="w-full h-14 bg-brand-blue border border-transparent text-white rounded-[24px] font-medium text-sm sm:text-base shadow-lg shadow-brand-blue/15 hover:brightness-110 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2.5 cursor-pointer mt-4"
              id="send-code-button"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Send Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center border-t border-slate-100/80 pt-4 mt-2">
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-xs font-semibold text-brand-blue hover:underline cursor-pointer flex items-center justify-center gap-2 mx-auto"
                id="back-to-login-button"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </div>
          </motion.form>
        ) : (
          /* ================= STEP 2: VERIFY AND UPDATE PASSWORD ================= */
          <motion.form
            key="step2"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleVerifyAndUpdate}
            className="space-y-5"
            id="recovery-step2-form"
          >
            {/* Target Account Reference */}
            <div className="space-y-1.5 opacity-80">
              <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400 px-1">
                Target Account E-mail
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  disabled
                  type="email"
                  value={email}
                  className="w-full h-14 bg-slate-100 border border-slate-100 rounded-2xl pl-16 pr-4 font-normal text-slate-500 cursor-not-allowed text-sm"
                  id="recovery-disabled-email-input"
                />
              </div>
            </div>

            {/* 6-Digit OTP */}
            <div className="space-y-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400 px-1">
                6-Digit Verification Code
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 group-focus-within:bg-brand-blue/5 transition-colors">
                  <Key className={`w-5 h-5 transition-colors ${code ? 'text-blue-600' : 'text-slate-300'}`} />
                </div>
                <input
                  required
                  type="text"
                  maxLength={6}
                  pattern="\d{6}"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-4 font-mono font-bold text-slate-850 tracking-[0.3em] text-center focus:outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue/20 transition-all placeholder:text-slate-300 placeholder:font-sans placeholder:font-normal placeholder:tracking-normal text-sm"
                  id="recovery-otp-code-input"
                />
              </div>
              <p className="text-[10px] text-slate-400 px-1">Please enter the 6-digit verification code sent to your inbox.</p>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400 px-1">
                New Password
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 group-focus-within:bg-brand-blue/5 transition-colors">
                  <Lock className={`w-5 h-5 transition-colors ${newPassword ? 'text-blue-600' : 'text-slate-300'}`} />
                </div>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-14 font-normal text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue/20 transition-all placeholder:text-slate-300 text-sm"
                  id="recovery-new-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                  id="toggle-password-visibility"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Confirmation */}
            <div className="space-y-2">
              <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400 px-1">
                Confirm New Password
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 group-focus-within:bg-brand-blue/5 transition-colors">
                  <Lock className={`w-5 h-5 transition-colors ${confirmPassword ? 'text-blue-600' : 'text-slate-300'}`} />
                </div>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl pl-16 pr-4 font-normal text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-blue/5 focus:border-brand-blue/20 transition-all placeholder:text-slate-300 text-sm"
                  id="recovery-confirm-password-input"
                />
              </div>
            </div>

            <button
              disabled={isLoading || !code || !newPassword || !confirmPassword}
              type="submit"
              className="w-full h-14 bg-brand-blue border border-transparent text-white rounded-[24px] font-medium text-sm sm:text-base shadow-lg shadow-brand-blue/15 hover:brightness-110 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2.5 cursor-pointer mt-4"
              id="submit-otp-update-button"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Update Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-center border-t border-slate-100/80 pt-4 mt-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setMessage(null);
                  setCode('');
                }}
                className="text-xs font-normal text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                id="back-to-step1-button"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change Email Address
              </button>
              
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-xs font-semibold text-brand-blue hover:underline cursor-pointer"
                id="back-to-login-step2-button"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
