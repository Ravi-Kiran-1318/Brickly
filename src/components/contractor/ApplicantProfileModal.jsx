import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconX, IconUserCircle, IconMapPin, IconBriefcase, 
  IconPhone, IconMail, IconAward, IconFileText, 
  IconCertificate, IconStarFilled 
} from '@tabler/icons-react';

const NoticeTimer = ({ endDate }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const diff = new Date(endDate) - new Date();
      if (diff <= 0) return 'Completed';
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  return <span className="text-[10px] font-black text-yellow-600 font-mono tracking-tighter bg-yellow-50 dark:bg-yellow-950 px-1.5 py-0.5 rounded border border-yellow-100 dark:border-yellow-900 shadow-sm ml-1.5 inline-block">{timeLeft}</span>;
};

const ApplicantProfileModal = ({ isOpen, onClose, applicant, jobId, onHire, onShortlist }) => {
  const [loadingAction, setLoadingAction] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [availability, setAvailability] = useState(null);

  const prof = applicant?.professionalId;
  const isHired = applicant?.status === 'Hired';
  const isShortlisted = applicant?.status === 'Shortlisted';
  const isServingNotice = prof?.isServingNotice;
  const isEmployed = prof?.isEmployed;
  const noticeEndDate = prof?.noticeEndDate;

  useEffect(() => {
    if (isOpen && prof?._id) {
      setHistoryLoading(true);
      api.get(`/api/professional/${prof._id}/employment-history`)
        .then(res => {
          setHistory(res.data || []);
        })
        .catch(err => {
          console.error("Failed to fetch employment history", err);
        })
        .finally(() => {
          setHistoryLoading(false);
        });

      api.get(`/api/contractor/professionals/${prof._id}/availability`)
        .then(res => {
          setAvailability(res.data || null);
        })
        .catch(err => {
          console.error("Failed to fetch availability details", err);
        });
    } else {
      setHistory([]);
      setAvailability(null);
    }
  }, [isOpen, prof?._id]);

  if (!isOpen || !applicant) return null;

  const handleAction = async (actionFn, actionName) => {
    setLoadingAction(actionName);
    try {
      await actionFn(jobId, prof._id);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between shrink-0">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-accent/10 text-accent font-black text-3xl flex items-center justify-center shrink-0 shadow-inner">
                {prof?.name?.charAt(0) || 'P'}
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-primary dark:text-white capitalize tracking-tight mb-1 flex items-center gap-2 flex-wrap">
                  {prof?.name || 'Unknown Professional'}
                  {prof?.isTrustedProfessional && (
                    <span className="bg-yellow-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-md shadow-yellow-500/20 shrink-0" title="Trusted Professional Badge">
                      ★ Trusted
                    </span>
                  )}
                </h2>
                <p className="text-accent font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                  <IconBriefcase size={14} /> {prof?.jobRole || 'Professional'}
                </p>
                <div className="flex items-center gap-1 mt-2 text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-2.5 py-1 rounded-full w-fit">
                  <IconStarFilled size={12} />
                  <span className="text-xs font-black">{prof?.averageRating || '0'}</span>
                  <span className="text-[10px] font-bold text-slate-400 ml-1">({prof?.totalReviews || 0} Reviews)</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white shadow-sm transition-colors"
            >
              <IconX size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                <IconAward size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Experience</p>
                <p className="font-bold text-primary dark:text-white">{prof?.yearsOfExperience || 0} Years</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                <IconMapPin size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Pref. Location</p>
                <p className="font-bold text-primary dark:text-white truncate" title={prof?.locationPreference}>{prof?.locationPreference || 'Any'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                <IconPhone size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Phone</p>
                <p className="font-bold text-primary dark:text-white">{prof?.phone || 'N/A'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                <IconMail size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Email</p>
                <p className="font-bold text-primary dark:text-white truncate" title={prof?.email}>{prof?.email || 'N/A'}</p>
              </div>
            </div>

            {/* About */}
            {prof?.about && (
              <div>
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-3">About Professional</h3>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    {prof.about}
                  </p>
                </div>
              </div>
            )}

            {/* Documents */}
            <div>
              <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-3">Documents</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all group text-left">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                    <IconFileText size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-primary dark:text-white text-sm">Resume / CV</p>
                    <p className="text-xs text-slate-400">PDF Document</p>
                  </div>
                </button>
                <button className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl hover:border-purple-500 hover:shadow-md transition-all group text-left">
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-xl group-hover:scale-110 transition-transform">
                    <IconCertificate size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-primary dark:text-white text-sm">Trade Certificate</p>
                    <p className="text-xs text-slate-400">PDF / Image</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Crew Details */}
            {availability && availability.isCrewPost && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-3 flex items-center gap-1.5">
                   👥 Crew Members <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-black px-2 py-0.5 rounded-lg">Lead Post</span>
                </h3>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <p className="text-xs font-bold text-slate-500 mb-2">This professional is a Crew Lead with {availability.crewMembers?.length || 0} crew members available to join:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availability.crewMembers?.map((member, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="font-black text-primary dark:text-white text-sm">{member.name}</p>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">{member.role} · {member.yearsOfExperience} yrs exp</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Employment History Timeline */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4">Past Employment History</h3>
              {historyLoading ? (
                <div className="text-center py-6 text-xs text-slate-400 font-bold animate-pulse">Loading history...</div>
              ) : history && history.length > 0 ? (
                <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6">
                  {history.map((item, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-accent border-4 border-white dark:border-slate-900" />
                      
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <h4 className="font-black text-primary dark:text-white text-sm">{item.jobRole}</h4>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            item.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-150 text-slate-650 border-slate-200'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-550 dark:text-slate-400 font-bold mb-1">{item.contractorName}</p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()} · {item.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-455 dark:text-slate-500 font-medium italic">No past employment history registered.</p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-4 shrink-0">
            <button 
              onClick={onClose}
              className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            
            {onShortlist && !isHired && (
              <button 
                onClick={() => handleAction(onShortlist, 'shortlist')}
                disabled={loadingAction !== null || isShortlisted}
                className={`px-8 py-3 rounded-2xl font-black transition-all flex items-center gap-2 ${
                  isShortlisted 
                    ? 'bg-orange-100 text-orange-600 cursor-not-allowed'
                    : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'
                }`}
              >
                {loadingAction === 'shortlist' ? <span className="w-5 h-5 border-2 border-orange-600/30 border-t-orange-600 rounded-full animate-spin"></span> : null}
                {isShortlisted ? 'Shortlisted' : 'Shortlist'}
              </button>
            )}

            {isServingNotice && !isHired && (
              <div className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-2xl flex items-center gap-2">
                <span className="text-yellow-600">⚠️</span>
                <p className="text-xs font-bold text-yellow-600 flex items-center flex-wrap">
                  Notice period ends {new Date(noticeEndDate).toLocaleDateString()}. Hire unavailable.
                  {noticeEndDate && <NoticeTimer endDate={noticeEndDate} />}
                </p>
              </div>
            )}
            
            {isEmployed && !isServingNotice && !isHired && (
              <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl flex items-center gap-2">
                <span className="text-slate-400"><IconBriefcase size={16} /></span>
                <p className="text-xs font-bold text-slate-500">
                  Candidate is currently employed by another contractor. Hire unavailable.
                </p>
              </div>
            )}

            {!isHired && (
              <button 
                onClick={() => handleAction(onHire, 'hire')}
                disabled={loadingAction !== null || isServingNotice || isEmployed}
                title={isServingNotice ? `Serving notice until ${new Date(noticeEndDate).toLocaleDateString()}. Cannot hire until complete.` : isEmployed ? "Candidate is already employed elsewhere." : ""}
                className={`px-8 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-lg ${
                  (isServingNotice || isEmployed)
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none' 
                    : 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/20'
                }`}
              >
                {loadingAction === 'hire' ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : null}
                Hire Professional
              </button>
            )}
            
            {isHired && (
              <div className="px-8 py-3 rounded-2xl font-black bg-green-100 text-green-700 border border-green-200">
                Already Hired
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ApplicantProfileModal;
