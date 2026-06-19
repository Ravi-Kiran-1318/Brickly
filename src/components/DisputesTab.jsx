import React, { useState, useEffect } from 'react';
import { IconAlertTriangle, IconCircleCheck, IconClock, IconLink, IconInfoCircle } from '@tabler/icons-react';
import api from '../api';
import toast from 'react-hot-toast';

const DisputesTab = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = async () => {
    try {
      const res = await api.get('/api/disputes');
      if (res.data?.success) {
        setDisputes(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolve = async (disputeId) => {
    try {
      const res = await api.put(`/api/disputes/${disputeId}/resolve`);
      if (res.data?.success) {
        toast.success('Dispute resolved successfully!');
        fetchDisputes();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to resolve dispute');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="flex items-center gap-1 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400">
            <IconCircleCheck size={12} /> Resolved
          </span>
        );
      case 'under_review':
        return (
          <span className="flex items-center gap-1 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400">
            <IconInfoCircle size={12} /> Under Review
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400">
            <IconClock size={12} /> Open
          </span>
        );
    }
  };

  const formatCategory = (cat) => {
    return cat.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase">Loading disputes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-primary dark:text-white uppercase tracking-tight">Disputes & Incident Reports</h2>
        <p className="text-slate-500 text-sm">Review incidents or file requests regarding your work engagements.</p>
      </div>

      <div className="space-y-4">
        {disputes.length > 0 ? (
          disputes.map((d) => {
            const initiatorName = d.initiatorId?.companyName || d.initiatorId?.name || 'Unknown';
            const recipientName = d.recipientId?.companyName || d.recipientId?.name || 'Unknown';
            
            return (
              <div 
                key={d._id} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[32px] hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
              >
                <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-accent tracking-widest">{formatCategory(d.category)}</span>
                    <h3 className="font-black text-lg text-primary dark:text-white mt-0.5">
                      Engagement: {d.hiredWorkerId?.jobRole || 'Professional'}
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Filed on: {new Date(d.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(d.status)}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl mb-4 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="text-slate-400 uppercase text-[9px] block">Initiator</span>
                      <span className="text-primary dark:text-white font-black">{initiatorName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase text-[9px] block">Recipient</span>
                      <span className="text-primary dark:text-white font-black">{recipientName}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Details</h4>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                      {d.description}
                    </p>
                  </div>

                  {d.evidenceUrl && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <IconLink size={14} className="text-slate-400" />
                      <span className="text-slate-400 font-semibold">Evidence:</span>
                      <a 
                        href={d.evidenceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-accent font-black hover:underline"
                      >
                        View Attachment
                      </a>
                    </div>
                  )}
                </div>

                {d.status !== 'resolved' && (
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={() => handleResolve(d._id)}
                      className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-green-500/10"
                    >
                      <IconCircleCheck size={16} /> Mark as Resolved
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center bg-slate-50 dark:bg-slate-900/40 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <IconAlertTriangle size={40} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-400 font-bold">No disputes filed or received.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisputesTab;
