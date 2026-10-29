import React, { useState } from 'react';
import { 
  X, 
  Handshake, 
  Sparkles, 
  Check, 
  RotateCcw, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Edit3, 
  Crown, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { AppPartner, DEFAULT_MOCK_PARTNERS, partnerService } from '../services/partnerService';

interface PartnerAdminEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: AppPartner[];
  onSavePartners: (updatedPartners: AppPartner[]) => void;
}

export const PartnerAdminEditorModal: React.FC<PartnerAdminEditorModalProps> = ({
  isOpen,
  onClose,
  partners,
  onSavePartners,
}) => {
  const [partnerList, setPartnerList] = useState<AppPartner[]>([...partners]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(
    partners.length > 0 ? partners[0].id : DEFAULT_MOCK_PARTNERS[0].id
  );
  const [activeTab, setActiveTab] = useState<'list' | 'info' | 'contacts' | 'preview'>('list');

  if (!isOpen) return null;

  const currentPartner = partnerList.find(p => p.id === selectedPartnerId) || partnerList[0] || DEFAULT_MOCK_PARTNERS[0];

  const handleUpdateCurrentField = (field: keyof AppPartner, value: any) => {
    setPartnerList(prev =>
      prev.map(p => (p.id === currentPartner.id ? { ...p, [field]: value } : p))
    );
  };

  const handleAddNewPartner = () => {
    const newPartner: AppPartner = {
      id: `partner-${Date.now()}`,
      business_name: 'New Valencia Partner',
      job: 'Expat & Exclusivity Services',
      tagline: 'Your trusted partner in Valencia',
      logo_url: 'https://images.unsplash.com/photo-1560179704-619285907453?w=240&auto=format&fit=crop&q=80',
      banner_image_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1000&auto=format&fit=crop&q=80',
      badge_label: 'Official Partner',
      badge_color: 'emerald',
      summary: 'Comprehensive services for expats and residents in Valencia.',
      detailed_description: 'Full support for legal, relocation, property, and administrative settlement in Valencia.',
      perks: 'Exclusive Unlocked Member Benefit: 10% discount on initial consultation.',
      phone: '+34 960 00 00 00',
      email: 'contact@partner.es',
      website: 'https://partner.es',
      address: 'Valencia City Center, Spain',
      city: 'Valencia Region',
      whatsapp: '+34600000000',
      is_active: true,
      updated_at: new Date().toISOString()
    };
    setPartnerList(prev => [...prev, newPartner]);
    setSelectedPartnerId(newPartner.id);
    setActiveTab('info');
  };

  const handleDeletePartner = (id: string) => {
    if (partnerList.length <= 1) {
      alert('You must keep at least one partner in the system.');
      return;
    }
    if (confirm('Are you sure you want to delete this partner?')) {
      const filtered = partnerList.filter(p => p.id !== id);
      setPartnerList(filtered);
      setSelectedPartnerId(filtered[0].id);
    }
  };

  const handleTogglePartnerActive = (id: string) => {
    setPartnerList(prev =>
      prev.map(p => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
  };

  const handleResetAllToMockups = () => {
    if (confirm('Reset all partners to the 3 default Valencia region sample mockups?')) {
      setPartnerList([...DEFAULT_MOCK_PARTNERS]);
      setSelectedPartnerId(DEFAULT_MOCK_PARTNERS[0].id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    partnerList.forEach(p => partnerService.savePartner(p));
    onSavePartners(partnerList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        role="dialog"
        aria-modal="true"
        className="bg-white rounded-[28px] max-w-4xl w-full border border-slate-100 shadow-2xl overflow-hidden my-6 text-left animate-in fade-in zoom-in-95 duration-200 modal-container [font-variant-numeric:lining-nums_proportional-nums]"
      >
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-xs">
              <Handshake className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base font-display">
                Manage Multi-Partner Carousel & Highlights
              </h3>
              <p className="text-xs text-slate-400">
                Add, edit, or toggle multiple partners featured on the landing page Discover carousel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span>Currently Managing:</span>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-emerald-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {partnerList.map(p => (
                <option key={p.id} value={p.id}>
                  {p.is_active ? '🟢' : '⚪'} {p.business_name} ({p.job})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddNewPartner}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Partner</span>
            </button>
            <button
              type="button"
              onClick={handleResetAllToMockups}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset 3 Valencia Mockups</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-6 gap-6 text-xs font-bold text-slate-400 bg-slate-50/30">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'list'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent hover:text-slate-700'
            }`}
          >
            📋 Partner Carousel List ({partnerList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'info'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent hover:text-slate-700'
            }`}
          >
            ✏️ Edit Selected Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contacts')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'contacts'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent hover:text-slate-700'
            }`}
          >
            📞 Contact Details & Links
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent hover:text-slate-700'
            }`}
          >
            👁️ Live Preview
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          
          {/* List Tab: View & Manage All Partners */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Active partners will rotate smoothly in the Discover Carousel on the landing page.
              </p>

              <div className="grid grid-cols-1 gap-3">
                {partnerList.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      p.id === selectedPartnerId
                        ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs p-1">
                        <img
                          src={p.logo_url}
                          alt=""
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                          <h5 className="font-bold text-slate-900 text-sm truncate">{p.business_name}</h5>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {p.badge_label || 'Partner'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate">{p.job}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleTogglePartnerActive(p.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          p.is_active
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {p.is_active ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{p.is_active ? 'Active' : 'Hidden'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPartnerId(p.id);
                          setActiveTab('info');
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="Edit Partner"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePartner(p.id)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                        title="Delete Partner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-semibold flex items-center justify-between">
                <span>Editing: <strong>{currentPartner.business_name}</strong></span>
                <span className="text-[11px] text-emerald-700">ID: {currentPartner.id}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={currentPartner.business_name}
                    onChange={(e) => handleUpdateCurrentField('business_name', e.target.value)}
                    placeholder="e.g. Valencia Expat Hub & Legal"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Job / Specialty *
                  </label>
                  <input
                    type="text"
                    required
                    value={currentPartner.job}
                    onChange={(e) => handleUpdateCurrentField('job', e.target.value)}
                    placeholder="e.g. Relocation, NIE & Expat Tax Advisory"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Header Badge
                  </label>
                  <input
                    type="text"
                    value={currentPartner.badge_label}
                    onChange={(e) => handleUpdateCurrentField('badge_label', e.target.value)}
                    placeholder="e.g. Gold Partner"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Badge Style
                  </label>
                  <select
                    value={currentPartner.badge_color || 'emerald'}
                    onChange={(e) => handleUpdateCurrentField('badge_color', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  >
                    <option value="emerald">Emerald Green</option>
                    <option value="amber">Amber Gold</option>
                    <option value="indigo">Indigo Blue</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    City / Area
                  </label>
                  <input
                    type="text"
                    value={currentPartner.city || ''}
                    onChange={(e) => handleUpdateCurrentField('city', e.target.value)}
                    placeholder="e.g. Valencia Region"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Logo URL *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required
                      value={currentPartner.logo_url}
                      onChange={(e) => handleUpdateCurrentField('logo_url', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-xs"
                    />
                    {currentPartner.logo_url && (
                      <img
                        src={currentPartner.logo_url}
                        alt="Logo preview"
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Banner Cover Image URL
                  </label>
                  <input
                    type="url"
                    value={currentPartner.banner_image_url || ''}
                    onChange={(e) => handleUpdateCurrentField('banner_image_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Short Tagline
                </label>
                <input
                  type="text"
                  value={currentPartner.tagline || ''}
                  onChange={(e) => handleUpdateCurrentField('tagline', e.target.value)}
                  placeholder="e.g. Your official relocation & legal settlement partner in Valencia"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Business Summary *
                </label>
                <textarea
                  required
                  rows={2}
                  value={currentPartner.summary}
                  onChange={(e) => handleUpdateCurrentField('summary', e.target.value)}
                  placeholder="Concise pitch for the expanded card..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Detailed Services Presentation
                </label>
                <textarea
                  rows={3}
                  value={currentPartner.detailed_description || ''}
                  onChange={(e) => handleUpdateCurrentField('detailed_description', e.target.value)}
                  placeholder="Full services breakdown..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  🎁 Exclusive Unlocked Member Perk
                </label>
                <input
                  type="text"
                  value={currentPartner.perks || ''}
                  onChange={(e) => handleUpdateCurrentField('perks', e.target.value)}
                  placeholder="e.g. Free 30-min consultation + 10% discount"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> Phone
                  </label>
                  <input
                    type="text"
                    value={currentPartner.phone || ''}
                    onChange={(e) => handleUpdateCurrentField('phone', e.target.value)}
                    placeholder="+34 960 12 34 56"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" /> Email
                  </label>
                  <input
                    type="email"
                    value={currentPartner.email || ''}
                    onChange={(e) => handleUpdateCurrentField('email', e.target.value)}
                    placeholder="contact@valenciaexpathub.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" /> Website
                  </label>
                  <input
                    type="url"
                    value={currentPartner.website || ''}
                    onChange={(e) => handleUpdateCurrentField('website', e.target.value)}
                    placeholder="https://valenciaexpathub.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp (Country code)
                  </label>
                  <input
                    type="text"
                    value={currentPartner.whatsapp || ''}
                    onChange={(e) => handleUpdateCurrentField('whatsapp', e.target.value)}
                    placeholder="+34612345678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Physical Address
                </label>
                <input
                  type="text"
                  value={currentPartner.address || ''}
                  onChange={(e) => handleUpdateCurrentField('address', e.target.value)}
                  placeholder="Carrer de Colón 22, 46004 València"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={currentPartner.linkedin || ''}
                    onChange={(e) => handleUpdateCurrentField('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/company/..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    value={currentPartner.instagram || ''}
                    onChange={(e) => handleUpdateCurrentField('instagram', e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Live card preview for <strong>{currentPartner.business_name}</strong>:
              </p>
              <div className="max-w-md mx-auto p-4 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="p-6 rounded-3xl bg-gradient-to-b from-white to-emerald-50/20 border border-emerald-200 shadow-sm text-center space-y-3">
                  <div className="flex items-center justify-between w-full">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-widest">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      {currentPartner.badge_label || "Official Partner"}
                    </span>
                  </div>

                  <div className="w-20 h-20 rounded-2xl mx-auto overflow-hidden bg-white p-1 shadow ring-2 ring-emerald-100">
                    <img
                      src={currentPartner.logo_url}
                      alt=""
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{currentPartner.business_name}</h4>
                    <p className="text-xs font-bold text-emerald-700 uppercase">{currentPartner.job}</p>
                    {currentPartner.city && <p className="text-[11px] text-slate-400 font-medium">📍 {currentPartner.city}</p>}
                  </div>

                  {currentPartner.tagline && (
                    <p className="text-xs text-slate-600 italic">"{currentPartner.tagline}"</p>
                  )}

                  {currentPartner.perks && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>{currentPartner.perks}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save All Partner Changes</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
