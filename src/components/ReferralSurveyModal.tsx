import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Share2, 
  Store, 
  Search, 
  Calendar, 
  MessageSquare, 
  FileText, 
  HelpCircle, 
  X, 
  Check, 
  Sparkles,
  ArrowRight,
  Loader2,
  Building2,
  HeartHandshake,
  Globe
} from 'lucide-react';
import { authService } from '../services/authService';

export interface ReferralSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSubmitted?: (source: string, detail?: string) => void;
}

export interface ReferralOption {
  id: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  requiresDetail?: boolean;
  detailPlaceholder?: string;
  detailLabel?: string;
}

export const REFERRAL_OPTIONS: ReferralOption[] = [
  {
    id: 'relocation_agency',
    label: 'Relocation agency',
    icon: Building2,
    description: 'Relocation service or advisor',
    requiresDetail: true,
    detailLabel: 'Who? (Which relocation agency?)',
    detailPlaceholder: 'Specify who (agency or consultant name)...'
  },
  {
    id: 'expat_organization',
    label: 'Expat organization',
    icon: Globe,
    description: 'Community, club, group, or forum',
    requiresDetail: true,
    detailLabel: 'Who? (Which expat organization?)',
    detailPlaceholder: 'Specify who (organization or group name)...'
  },
  {
    id: 'word_of_mouth',
    label: 'Word of mouth',
    icon: Users,
    description: 'Friend, colleague, or family member'
  },
  {
    id: 'social_media',
    label: 'Social media',
    icon: Share2,
    description: 'Instagram, Facebook, LinkedIn...'
  },
  {
    id: 'other',
    label: 'Other',
    icon: HelpCircle,
    description: 'Something else',
    requiresDetail: true,
    detailLabel: 'How did you hear about us?',
    detailPlaceholder: 'Please specify...'
  }
];

export function ReferralSurveyModal({
  isOpen,
  onClose,
  userId,
  onSubmitted
}: ReferralSurveyModalProps) {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [detailText, setDetailText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const currentOptionObj = REFERRAL_OPTIONS.find(o => o.id === selectedOption);
  const isDetailRequired = !!currentOptionObj?.requiresDetail;
  const isSubmitDisabled = !selectedOption || (isDetailRequired && !detailText.trim()) || isSubmitting;

  const handleDismiss = () => {
    try {
      localStorage.setItem('referral_survey_dismissed_' + userId, 'true');
      sessionStorage.removeItem('mycity_just_signed_up');
    } catch (_) {}
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption || isSubmitting) return;

    setIsSubmitting(true);
    const sourceLabel = currentOptionObj?.label || selectedOption;
    const trimmedDetail = detailText.trim() || undefined;

    try {
      await authService.saveReferralSource(userId, sourceLabel, trimmedDetail);
      
      try {
        localStorage.setItem('referral_survey_done_' + userId, 'true');
        localStorage.removeItem('mycity_new_signup_' + userId);
        sessionStorage.removeItem('mycity_just_signed_up');
      } catch (_) {}

      setIsSuccess(true);
      onSubmitted?.(sourceLabel, trimmedDetail);

      // Auto close after showing thank you animation
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Failed to submit referral survey:', err);
      // Still close smoothly so user isn't blocked
      try {
        localStorage.setItem('referral_survey_done_' + userId, 'true');
      } catch (_) {}
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/75"
          onClick={handleDismiss}
        />

        {/* Modal Window */}
        <motion.div 
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-auto will-change-transform transform-gpu modal-container [font-variant-numeric:lining-nums_proportional-nums]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Banner */}
          <div className="relative bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 px-5 py-3.5 sm:px-6 sm:py-4 text-white">
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-[10px] font-bold text-emerald-200 uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Quick Question</span>
            </div>

            <h3 className="text-lg sm:text-xl font-black font-display tracking-tight leading-snug">
              How did you hear about us?
            </h3>
            <p className="text-[11px] sm:text-xs text-emerald-100/85 mt-0.5 leading-tight">
              Help us know how you found our community.
            </p>
          </div>

          {/* Form Content */}
          {isSuccess ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center space-y-2.5"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Thank you for sharing!</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Welcome to Valencia's international community!
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 space-y-2">
              {/* Options List */}
              <div className="space-y-1.5 overflow-y-auto max-h-[62vh] sm:max-h-none pr-0.5 custom-scrollbar">
                {REFERRAL_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedOption === opt.id;

                  return (
                    <div key={opt.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOption(opt.id);
                          if (!opt.requiresDetail) {
                            setDetailText('');
                          }
                        }}
                        className={`w-full text-left py-2 px-2.5 sm:px-3 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-50/90 border-emerald-400 shadow-xs ring-1 ring-emerald-400/30' 
                            : 'bg-white hover:bg-slate-50 border-slate-200/70'
                        }`}
                      >
                        {/* Radio Circle */}
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                          isSelected 
                            ? 'border-emerald-600 bg-emerald-600 text-white' 
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>

                        {/* Icon */}
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-emerald-600/10 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>

                        {/* Labels */}
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <p className={`text-xs sm:text-[13px] font-bold truncate leading-tight ${
                            isSelected ? 'text-slate-950' : 'text-slate-800'
                          }`}>
                            {opt.label}
                          </p>
                          {opt.description && (
                            <span className="hidden sm:inline text-[10px] text-slate-400 truncate font-normal">
                              {opt.description}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Dynamic Detail Input appearing directly underneath this selected card */}
                      <AnimatePresence>
                        {isSelected && opt.requiresDetail && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -4 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -4 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                            className="overflow-hidden px-0.5 pt-0.5"
                          >
                            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 space-y-1.5 shadow-2xs">
                              <label className="block text-[11px] font-bold text-emerald-950">
                                {opt.detailLabel || 'Please specify:'} <span className="text-emerald-600">*</span>
                              </label>
                              <input
                                type="text"
                                autoFocus
                                required
                                value={detailText}
                                onChange={(e) => setDetailText(e.target.value)}
                                placeholder={opt.detailPlaceholder || 'Type your answer here...'}
                                className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium shadow-2xs"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Skip
                </button>

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                    isSubmitDisabled
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-98'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ReferralSurveyModal;
