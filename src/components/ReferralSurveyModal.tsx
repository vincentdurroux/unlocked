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
  Loader2
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
    id: 'word_of_mouth',
    label: 'Word of mouth',
    icon: Users,
    description: 'A friend, colleague, or family member told me'
  },
  {
    id: 'social_media',
    label: 'Social media (Instagram, Facebook, LinkedIn...)',
    icon: Share2,
    description: 'Instagram, Facebook, LinkedIn, TikTok, etc.'
  },
  {
    id: 'local_business',
    label: 'Recommended by a local business',
    icon: Store,
    description: 'A shop, café, real estate agency, clinic, etc.',
    requiresDetail: true,
    detailLabel: 'Which business recommended us?',
    detailPlaceholder: 'e.g., English Bookshop, Café Ruzafa, Gym...'
  },
  {
    id: 'search_engine',
    label: 'Search engine (Google, Bing)',
    icon: Search,
    description: 'Searched for Valencia guides, services, or events'
  },
  {
    id: 'local_event',
    label: 'Local event or meetup',
    icon: Calendar,
    description: 'Met someone or saw MyCityUnlocked at an event'
  },
  {
    id: 'expat_group',
    label: 'Online expat group or forum',
    icon: MessageSquare,
    description: 'Reddit, Facebook Expat Group, WhatsApp, Telegram'
  },
  {
    id: 'print_material',
    label: 'Flyer / Poster / Print material',
    icon: FileText,
    description: 'Saw a poster, sticker, or flyer around Valencia'
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
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          onClick={handleDismiss}
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Banner */}
          <div className="relative bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-6 sm:p-7 text-white">
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-[11px] font-bold text-emerald-200 uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Welcome to MyCityUnlocked!</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight leading-snug">
              How did you hear about us?
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-sm leading-relaxed">
              Help us understand how you found our community so we can welcome more people like you.
            </p>
          </div>

          {/* Form Content */}
          {isSuccess ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 sm:p-10 text-center space-y-3"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Thank you for sharing!</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Your feedback helps us grow. Welcome to Valencia's international community!
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              {/* Options List */}
              <div className="max-h-[300px] sm:max-h-[340px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {REFERRAL_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedOption === opt.id;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedOption(opt.id);
                        if (!opt.requiresDetail) {
                          setDetailText('');
                        }
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50/80 border-emerald-400/80 shadow-xs ring-1 ring-emerald-400/40' 
                          : 'bg-white hover:bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      {/* Radio Circle */}
                      <div className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected 
                          ? 'border-emerald-600 bg-emerald-600 text-white' 
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>

                      {/* Icon */}
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-emerald-600/10 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      {/* Labels */}
                      <div className="flex-1 min-w-0 pr-1">
                        <p className={`text-xs sm:text-sm font-bold leading-snug ${
                          isSelected ? 'text-slate-950' : 'text-slate-800'
                        }`}>
                          {opt.label}
                        </p>
                        {opt.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {opt.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Detail Input for Business Name or Other */}
              <AnimatePresence>
                {isDetailRequired && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pt-1"
                  >
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {currentOptionObj?.detailLabel || 'Please specify:'} <span className="text-emerald-600">*</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      required
                      value={detailText}
                      onChange={(e) => setDetailText(e.target.value)}
                      placeholder={currentOptionObj?.detailPlaceholder || 'Type your answer here...'}
                      className="w-full px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50/30 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 border-t border-slate-150/60">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors text-center cursor-pointer"
                >
                  Skip for now
                </button>

                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                    isSubmitDisabled
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-98'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit</span>
                      <ArrowRight className="w-4 h-4" />
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
