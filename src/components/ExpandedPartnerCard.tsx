import React from 'react';
import { 
  Handshake, 
  X, 
  ExternalLink, 
  Phone, 
  Mail, 
  MapPin, 
  MessageSquare, 
  Sparkles, 
  Globe, 
  Linkedin, 
  Instagram,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { AppPartner } from '../services/partnerService';

interface ExpandedPartnerCardProps {
  partner: AppPartner;
  onClose: () => void;
}

export const ExpandedPartnerCard: React.FC<ExpandedPartnerCardProps> = ({
  partner,
  onClose,
}) => {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${partner.business_name} - MyCityUnlocked Partner`,
        text: partner.summary,
        url: partner.website || window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(partner.website || window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div 
      id="landing-expanded-partner-section"
      className="w-full bg-white rounded-3xl border-2 border-emerald-500/30 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 relative text-left"
    >
      {/* Banner / Cover Header */}
      <div className="relative h-36 sm:h-48 md:h-56 w-full bg-slate-900 overflow-hidden">
        {partner.banner_image_url ? (
          <img
            src={partner.banner_image_url}
            alt=""
            className="w-full h-full object-cover opacity-85"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />

        {/* Top Floating Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-500 text-white shadow-md uppercase tracking-wider backdrop-blur-md">
            <Handshake className="w-4 h-4" />
            {partner.badge_label || "Official Partner"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              title="Share"
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom banner details */}
        <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4 text-white">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-white p-1.5 shadow-xl shrink-0 -mb-8 z-10 border-2 border-white">
            <img
              src={partner.logo_url}
              alt={partner.business_name}
              className="w-full h-full object-cover rounded-xl md:rounded-2xl"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=240&auto=format&fit=crop&q=80";
              }}
            />
          </div>
          <div className="min-w-0 pb-1">
            <h3 className="text-xl md:text-2xl font-black text-white truncate drop-shadow-sm">
              {partner.business_name}
            </h3>
            <p className="text-xs md:text-sm text-emerald-200 font-bold uppercase tracking-wide truncate">
              {partner.job}
            </p>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="pt-12 px-6 md:px-10 pb-8 space-y-8">
        
        {/* Partner Perk / Community Benefit */}
        {partner.perks && (
          <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 shadow-xs flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h5 className="font-extrabold text-amber-950 text-xs md:text-sm uppercase tracking-wider">
                Exclusive Unlocked Member Benefit
              </h5>
              <p className="text-xs md:text-sm text-amber-900 leading-relaxed font-medium">
                {partner.perks}
              </p>
            </div>
          </div>
        )}

        {/* Business Summary & Detailed Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Summary & Description */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">
                About Our Partner
              </h4>
              <p className="text-base md:text-lg font-semibold text-slate-800 leading-relaxed">
                {partner.summary}
              </p>
            </div>

            {partner.detailed_description && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Services Overview
                </h5>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {partner.detailed_description}
                </p>
              </div>
            )}

            {/* Trust badge guarantee */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-900 font-medium">
                Verified and recommended partner by the <strong>MyCityUnlocked</strong> team for outstanding service quality and expat support in Valencia.
              </p>
            </div>
          </div>

          {/* Right Column: Detailed Contact Information */}
          <div className="lg:col-span-1 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-150">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200">
              Detailed Contact Information
            </h4>

            <div className="space-y-3 text-xs">
              {partner.phone && (
                <a
                  href={`tel:${partner.phone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-100 transition-all font-semibold"
                >
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{partner.phone}</span>
                </a>
              )}

              {partner.email && (
                <a
                  href={`mailto:${partner.email}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-100 transition-all font-semibold"
                >
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{partner.email}</span>
                </a>
              )}

              {partner.website && (
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-100 transition-all font-semibold"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{partner.website.replace(/^https?:\/\//, '')}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </a>
              )}

              {partner.whatsapp && (
                <a
                  href={`https://wa.me/${partner.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all font-semibold shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="truncate">Chat on WhatsApp</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
                </a>
              )}

              {partner.address && (
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white text-slate-700 border border-slate-100 font-medium">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-snug">{partner.address}</span>
                </div>
              )}

              {/* Social links */}
              {(partner.linkedin || partner.instagram) && (
                <div className="pt-2 flex items-center gap-2">
                  {partner.linkedin && (
                    <a
                      href={partner.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white hover:bg-blue-50 text-blue-600 border border-slate-100 transition-all"
                      title="LinkedIn"
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {partner.instagram && (
                    <a
                      href={partner.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white hover:bg-pink-50 text-pink-600 border border-slate-100 transition-all"
                      title="Instagram"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            {partner.website && (
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
              >
                <span>Visit Official Website</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Bottom close button */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Close Expanded Card
          </button>
        </div>

      </div>
    </div>
  );
};
