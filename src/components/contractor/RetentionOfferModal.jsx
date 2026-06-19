import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconBriefcase, IconCurrencyRupee, IconMapPin, IconMessage } from '@tabler/icons-react';
import api from '../../api';
import toast from 'react-hot-toast';

const RetentionOfferModal = ({ isOpen, onClose, member, onSuccess }) => {
  const [offerType, setOfferType] = useState('salary_raise');
  const [newSalary, setNewSalary] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newSite, setNewSite] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!member) return;

    setLoading(true);
    try {
      const payload = {
        offerType,
        message: message.trim() || undefined,
      };

      if (offerType === 'salary_raise') {
        if (!newSalary || isNaN(newSalary) || parseFloat(newSalary) <= 0) {
          throw new Error('Please enter a valid positive salary amount');
        }
        payload.newSalary = parseFloat(newSalary);
      } else if (offerType === 'role_change') {
        if (!newRole.trim()) {
          throw new Error('Please enter a valid job role');
        }
        payload.newRole = newRole.trim();
      } else if (offerType === 'site_change') {
        if (!newSite.trim()) {
          throw new Error('Please enter a valid site location');
        }
        payload.newSite = newSite.trim();
      }

      await api.post(`/api/contractor/hired-worker/${member.hiredWorkerId}/retention-offer`, payload);
      toast.success('Retention offer sent successfully!');
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      toast.error(err.message || err.response?.data?.message || 'Failed to send retention offer');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewSalary('');
    setNewRole('');
    setNewSite('');
    setMessage('');
    setOfferType('salary_raise');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-8 relative z-10 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-primary dark:text-white uppercase tracking-tight">Retention Offer</h3>
              <button onClick={handleClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <IconX size={18} />
              </button>
            </div>

            <p className="text-slate-500 text-sm mb-6">
              Reconsider resignation for <strong className="text-primary dark:text-white">{member.name || member.professionalId?.name}</strong> by offering revised terms:
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Offer Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'salary_raise', label: 'Salary Raise', icon: IconCurrencyRupee },
                    { id: 'role_change', label: 'Role Change', icon: IconBriefcase },
                    { id: 'site_change', label: 'Site Change', icon: IconMapPin },
                    { id: 'custom', label: 'Custom Message', icon: IconMessage },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setOfferType(type.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                        offerType === type.id
                          ? 'border-accent bg-accent/5 text-accent font-extrabold shadow-sm'
                          : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <type.icon size={16} />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {offerType === 'salary_raise' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">New Monthly Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 25000"
                    value={newSalary}
                    onChange={(e) => setNewSalary(e.target.value)}
                    className="w-full p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all text-sm"
                  />
                </div>
              )}

              {offerType === 'role_change' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">New Job Role *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Mason"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all text-sm"
                  />
                </div>
              )}

              {offerType === 'site_change' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">New Work Site Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metro Station Phase 2"
                    value={newSite}
                    onChange={(e) => setNewSite(e.target.value)}
                    className="w-full p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all text-sm"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Message to Employee</label>
                <textarea
                  placeholder="Tell them why you value them or add details about your offer..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  className="w-full p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium text-primary dark:text-white outline-none focus:ring-4 focus:ring-accent/10 transition-all text-sm h-24 resize-none"
                />
                <div className="text-right text-[10px] font-bold text-slate-400">
                  {message.length} / 500 characters
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-accent hover:bg-orange-600 text-white rounded-2xl font-black text-xs transition-all uppercase tracking-wider shadow-lg shadow-orange-500/20 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Offer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RetentionOfferModal;
