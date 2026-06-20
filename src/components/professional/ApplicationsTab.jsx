import React, { useState, useEffect, Suspense, lazy } from 'react';
import api from '../../api';
import socket from '../../socket';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  IconClipboardText, IconBuildingSkyscraper, IconMapPin, 
  IconCalendarTime, IconCurrencyRupee, IconCircleCheck, 
  IconX, IconClock, IconEye, IconUserCircle, IconMapRoute, 
  IconAlertCircle, IconHandStop, IconPlayerPlay, IconRefresh,
  IconBriefcase, IconDoorExit, IconAlertTriangle
} from '@tabler/icons-react';
import LeaveContractorReviewModal from './LeaveContractorReviewModal';
import FileDisputeModal from '../FileDisputeModal';

const RouteMap = lazy(() => import('./RouteMap'));

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1);
};

const STATUS_COLORS = {
  'Applied': 'bg-blue-100 text-blue-600 border-blue-200',
  'Viewed': 'bg-purple-100 text-purple-600 border-purple-200',
  'Shortlisted': 'bg-orange-100 text-orange-600 border-orange-200',
  'Hired': 'bg-green-100 text-green-600 border-green-200',
  'Rejected': 'bg-red-100 text-red-600 border-red-200',
  'Joined': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Withdrawn': 'bg-slate-100 text-slate-500 border-slate-200',
  'Position Filled': 'bg-amber-100 text-amber-600 border-amber-200',
  'Job Deleted': 'bg-red-100 text-red-600 border-red-200',
  'Position Cancelled': 'bg-red-100 text-red-600 border-red-200',
  'Expired': 'bg-slate-100 text-slate-500 border-slate-200'
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    {[1, 2, 3].map(i => (
      <div key={i} className="bg-white dark:bg-slate-900 rounded-[35px] border border-slate-200 dark:border-slate-800 p-8 animate-pulse">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-16 h-16 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-lg w-2/5" />
            <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-lg w-1/4" />
          </div>
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2"><div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2" /><div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" /></div>
          <div className="space-y-2"><div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2" /><div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" /></div>
          <div className="space-y-2"><div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2" /><div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" /></div>
        </div>
      </div>
    ))}
  </div>
);

const ApplicationsTab = ({ openMapJobId, setOpenMapJobId }) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [joinConfirm, setJoinConfirm] = useState(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [reviewModalData, setReviewModalData] = useState(null);
  const [disputeHiredWorkerId, setDisputeHiredWorkerId] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  // Real-time socket listener for status updates
  useEffect(() => {
    const handleStatusUpdate = (data) => {
      console.log('Received applicationStatusUpdate:', data);
      setApplications(prev => prev.map(app =>
        app._id === data.applicationId
          ? { ...app, status: data.newStatus }
          : app
      ));
      if (data.newStatus === 'Hired') {
        toast.success('🏆 You have been hired! Check your Applications tab.', { duration: 5000 });
      }
    };

    socket.on('applicationStatusUpdate', handleStatusUpdate);

    return () => {
      socket.off('applicationStatusUpdate', handleStatusUpdate);
    };
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get('/api/professional/applications');
      setApplications(res.data);
    } catch (err) {
      console.error(err);
      setFetchError('Failed to load your applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (applicationId) => {
    setJoinLoading(true);
    try {
      await api.post(`/api/professional/applications/${applicationId}/join`);
      toast.success('🎉 Successfully joined! Welcome aboard.', { duration: 4000 });
      setJoinConfirm(null);
      // Update local state: mark this app as Joined, withdraw others
      setApplications(prev => prev.map(app => {
        if (app._id === applicationId) return { ...app, status: 'Joined' };
        if (['Applied', 'Viewed', 'Shortlisted'].includes(app.status)) return { ...app, status: 'Withdrawn' };
        return app;
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleReject = async (applicationId, reason) => {
    try {
      await api.put(`/api/professional/applications/${applicationId}/reject`, { rejectionReason: reason });
      toast.success('Your response has been submitted.');
      setApplications(prev => prev.map(app => app._id === applicationId ? { ...app, status: 'Rejected' } : app));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject application');
      throw err;
    }
  };

  const handleResignSubmit = async (applicationId, resignData) => {
    try {
      await api.post('/api/professional/resign', { 
        reason: resignData.reason
      });
      const appObj = applications.find(a => a._id === applicationId);
      const noticeDays = appObj?.jobPostId?.noticePeriodDays !== undefined ? appObj.jobPostId.noticePeriodDays : 7;
      toast.success(`Resignation submitted. You are now serving a ${noticeDays}-day notice period.`);
      setApplications(prev => prev.map(app => app._id === applicationId ? { ...app, status: 'Resigned' } : app));
      // Force reload to get updated user state with isServingNotice
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit resignation');
      throw err;
    }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-black text-primary dark:text-white">Applied Jobs</h2>
          <p className="text-sm text-slate-400 font-medium tracking-tight">Track the progress of your job applications.</p>
        </div>
      </div>
      <LoadingSkeleton />
    </div>
  );

  if (fetchError) return (
    <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-red-200 dark:border-red-800">
      <IconAlertCircle size={60} className="mx-auto text-red-300 mb-4" />
      <h3 className="text-xl font-black text-primary dark:text-white mb-2">Something Went Wrong</h3>
      <p className="text-slate-400 font-medium mb-6 max-w-sm mx-auto">{fetchError}</p>
      <button 
        onClick={fetchApplications}
        className="bg-accent text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 mx-auto hover:bg-orange-600 transition-all"
      >
        <IconRefresh size={18} /> Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
         <div>
            <h2 className="text-2xl font-black text-primary dark:text-white">Applied Jobs</h2>
            <p className="text-sm text-slate-400 font-medium tracking-tight">Track the progress of your job applications.</p>
         </div>
         <div className="flex items-center gap-3">
            <button 
              onClick={fetchApplications}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-accent hover:bg-accent/10 transition-all"
              title="Refresh applications"
            >
              <IconRefresh size={18} />
            </button>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-2 rounded-2xl">
               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total: </span>
               <span className="text-lg font-black text-primary dark:text-white ml-2">{applications.length}</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {applications.length > 0 ? applications.map(app => (
          <ApplicationCard 
            key={app._id} 
            application={app} 
            user={user}
            openMapJobId={openMapJobId}
            setOpenMapJobId={setOpenMapJobId}
            onJoinClick={() => setJoinConfirm(app._id)}
            onReject={handleReject}
            onResign={handleResignSubmit}
            onLeaveReview={(appData) => setReviewModalData({
              contractorId: appData.contractorId?._id || appData.contractorId,
              contractorName: appData.contractorId?.name,
              companyName: appData.contractorId?.companyName,
              hiredWorkerId: appData.hiredWorkerId
            })}
            onFileDispute={(hiredWorkerId) => setDisputeHiredWorkerId(hiredWorkerId)}
          />
        )) : (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <IconBriefcase size={60} className="mx-auto text-slate-300 mb-4" />
             <h3 className="text-xl font-black text-primary dark:text-white mb-2">No Applications Yet</h3>
             <p className="text-slate-400 font-medium max-w-sm mx-auto">You haven't applied to any jobs yet. Browse the job feed to find opportunities matching your trade.</p>
          </div>
        )}
      </div>

      {/* Join Confirmation Modal */}
      <AnimatePresence>
        {joinConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !joinLoading && setJoinConfirm(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconPlayerPlay size={32} className="text-green-600" />
                </div>
                <h3 className="text-2xl font-black text-primary dark:text-white mb-2">Join This Job?</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  By joining, you confirm you are ready to start working. 
                  <span className="text-orange-500 font-bold block mt-2">
                    ⚠️ All your other pending applications will be automatically withdrawn.
                  </span>
                </p>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setJoinConfirm(null)}
                    disabled={joinLoading}
                    className="flex-1 py-3 px-6 rounded-2xl font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleJoin(joinConfirm)}
                    disabled={joinLoading}
                    className="flex-1 py-3 px-6 rounded-2xl font-black bg-green-500 text-white hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {joinLoading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <IconCircleCheck size={20} />
                    )}
                    {joinLoading ? 'Joining...' : 'Confirm & Join'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <LeaveContractorReviewModal
        isOpen={!!reviewModalData}
        onClose={() => setReviewModalData(null)}
        contractorId={reviewModalData?.contractorId}
        contractorName={reviewModalData?.contractorName}
        companyName={reviewModalData?.companyName}
        hiredWorkerId={reviewModalData?.hiredWorkerId}
        onSuccess={fetchApplications}
      />
      <FileDisputeModal
        isOpen={!!disputeHiredWorkerId}
        onClose={() => setDisputeHiredWorkerId(null)}
        hiredWorkerId={disputeHiredWorkerId}
        onSuccess={() => {}}
      />
    </div>
  );
};

const ApplicationCard = ({ application, user, openMapJobId, setOpenMapJobId, onJoinClick, onReject, onResign, onLeaveReview, onFileDispute }) => {
  const job = application.jobPostId;
  const contractor = application.contractorId;

  const displayStatus = (application.status === 'Hired' && (application.jobPostExists === false || job?._id === 'deleted')) 
    ? 'Position Filled' 
    : application.status;

  const daysLeft = (() => {
    if (job?.startDate) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const start = new Date(job.startDate);
      start.setHours(0,0,0,0);
      const diffMs = start.getTime() - today.getTime();
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    }
    return null;
  })();

  const isExpired = displayStatus === 'Hired' && daysLeft !== null && daysLeft < 0;
  const displayStatusVal = isExpired ? 'Expired' : displayStatus;

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const [isResignModalOpen, setIsResignModalOpen] = useState(false);
  const [resignData, setResignData] = useState({ reason: '' });
  const [resignLoading, setResignLoading] = useState(false);

  if (!job) return null;

  const hasCoordinates = job.workSiteLocation && job.workSiteLocation.coordinates && job.workSiteLocation.coordinates.length === 2;
  const userHasCoordinates = user?.location?.coordinates && user.location.coordinates.length === 2;
  const isMapOpen = openMapJobId === job._id;

  let distanceText = null;
  if (hasCoordinates && userHasCoordinates) {
    distanceText = calculateDistance(user.location.coordinates[1], user.location.coordinates[0], job.workSiteLocation.coordinates[1], job.workSiteLocation.coordinates[0]);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-white dark:bg-slate-900 rounded-[35px] border ${displayStatus === 'Rejected' ? 'border-red-200 dark:border-red-900/50 opacity-75' : 'border-slate-200 dark:border-slate-800'} p-8 hover:shadow-lg hover:border-accent transition-all relative overflow-hidden`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 ${
            displayStatus === 'Joined' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
          }`}>
             <IconBuildingSkyscraper size={32} />
          </div>
          <div>
             <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-xl font-black text-primary dark:text-white tracking-tight">{job.jobRole}</h3>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${STATUS_COLORS[displayStatusVal] || 'bg-slate-100'}`}>
                  {displayStatusVal}
                </span>
                {displayStatusVal === 'Hired' && daysLeft !== null && (
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                    daysLeft === 0 
                      ? 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' 
                      : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                  }`}>
                    <IconClock size={12} />
                    {daysLeft === 0 ? 'Starts today!' : `Join within ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`}
                  </span>
                )}
                {(displayStatusVal === 'Hired' || displayStatusVal === 'Joined') && distanceText && (
                  <span className="text-[10px] font-black text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded-md flex items-center gap-1">
                    <IconMapPin size={12} /> {distanceText} km away
                  </span>
                )}
             </div>
             <div className="flex flex-wrap items-center gap-2 mt-2">
                {contractor?.companyName && (
                  <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 ring-1 ring-slate-100 dark:ring-white/5 w-fit px-3 py-1 rounded-full">
                     <IconBuildingSkyscraper size={14} className="text-accent" /> {contractor.companyName}
                  </p>
                )}
                <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 ring-1 ring-slate-100 dark:ring-white/5 w-fit px-3 py-1 rounded-full">
                   <IconUserCircle size={14} className="text-blue-500" /> {contractor?.name || 'Unknown Contractor'}
                </p>
                {contractor?.email && (
                  <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5 ring-1 ring-slate-100 dark:ring-white/5 w-fit px-3 py-1 rounded-full">
                     <span className="text-[9px] font-black uppercase text-slate-400">Email:</span> {contractor.email}
                  </p>
                )}
                {contractor?.phone && (
                  <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5 ring-1 ring-slate-100 dark:ring-white/5 w-fit px-3 py-1 rounded-full">
                     <span className="text-[9px] font-black uppercase text-slate-400">Phone:</span> {contractor.phone}
                  </p>
                )}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-8">
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1"><IconCurrencyRupee size={10} /> Salary</span>
              <span className="text-base font-black text-accent leading-none">₹{job.salary}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{job.salaryType}</span>
           </div>
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1"><IconMapPin size={10} /> Location</span>
              <span className="text-sm font-bold text-primary dark:text-blue-100">{job.workLocation}</span>
           </div>
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1"><IconCalendarTime size={10} /> Start Date</span>
              <span className="text-sm font-bold text-primary dark:text-blue-100">
                {job.startDate ? new Date(job.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Immediate'}
              </span>
           </div>
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1"><IconCalendarTime size={10} /> Applied On</span>
              <span className="text-sm font-bold text-primary dark:text-blue-100">{new Date(application.appliedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
           </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pt-6 border-t border-slate-50 dark:border-white/5 mt-6 gap-4">
         <div className="flex items-center gap-2 flex-wrap">
            {hasCoordinates && (
              <button 
                onClick={() => setOpenMapJobId(isMapOpen ? null : job._id)}
                className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all ${isMapOpen ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'}`}
              >
                <IconMapRoute size={16} /> {isMapOpen ? 'Hide Route' : 'View Route'}
              </button>
            )}
             {displayStatusVal === 'Hired' && (
              <>
                <button 
                  onClick={onJoinClick}
                  className="flex items-center gap-2 text-xs font-black px-6 py-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  <IconPlayerPlay size={16} /> Join Now
                </button>
                <button 
                  onClick={() => setIsRejecting(!isRejecting)}
                  className="flex items-center gap-2 text-xs font-black px-6 py-2.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-all"
                >
                  <IconX size={16} /> Reject
                </button>
              </>
            )}

            {displayStatusVal === 'Joined' && !user?.isServingNotice && (
              <button 
                onClick={() => setIsResignModalOpen(true)}
                className="flex items-center gap-2 text-xs font-black px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 transition-all"
              >
                <IconDoorExit size={16} /> Resign from this Position
              </button>
            )}

            {(displayStatus === 'Joined' || displayStatus === 'Resigned') && application.hiredWorkerId && !application.hasReviewed && (
              <button 
                onClick={() => onLeaveReview(application)}
                className="flex items-center gap-2 text-xs font-black px-6 py-2.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                Leave Review
              </button>
            )}

            {(displayStatus === 'Joined' || displayStatus === 'Resigned') && application.hiredWorkerId && (
              <button 
                onClick={() => onFileDispute(application.hiredWorkerId._id || application.hiredWorkerId)}
                className="flex items-center gap-2 text-xs font-black px-6 py-2.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-all active:scale-95"
              >
                <IconAlertTriangle size={16} /> File a Dispute
              </button>
            )}
         </div>
         
         <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center min-w-[100px] gap-2">
                {displayStatusVal === 'Applied' && <IconClock size={16} className="text-slate-400" />}
                {displayStatusVal === 'Viewed' && <IconEye size={16} className="text-purple-500" />}
                {displayStatusVal === 'Shortlisted' && <IconCircleCheck size={16} className="text-orange-500 animate-bounce" />}
                {displayStatusVal === 'Hired' && <IconCircleCheck size={16} className="text-green-500" />}
                {displayStatusVal === 'Joined' && <IconCircleCheck size={16} className="text-emerald-600" />}
                {displayStatusVal === 'Rejected' && <IconX size={16} className="text-red-500" />}
                {displayStatusVal === 'Withdrawn' && <IconHandStop size={16} className="text-slate-400" />}
                {displayStatusVal === 'Position Filled' && <IconAlertCircle size={16} className="text-amber-500" />}
                {displayStatusVal === 'Job Deleted' && <IconX size={16} className="text-red-500" />}
                {displayStatusVal === 'Position Cancelled' && <IconX size={16} className="text-red-500" />}
                {displayStatusVal === 'Expired' && <IconX size={16} className="text-slate-400" />}
                <span className="text-[10px] font-black uppercase text-slate-400">{displayStatusVal}</span>
            </div>
         </div>
      </div>

      <AnimatePresence>
        {isRejecting && displayStatusVal === 'Hired' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-4"
          >
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value.slice(0, 300))}
                placeholder="Please mention your reason for rejection..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/50 resize-none h-24 mb-2"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{rejectionReason.length}/300</span>
                <div className="flex gap-2">
                  <button onClick={() => { setIsRejecting(false); setRejectionReason(''); }} className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                  <button 
                    onClick={async () => {
                      if (rejectionReason.length < 10) return toast.error('Please enter at least 10 characters.');
                      setRejectLoading(true);
                      try {
                        await onReject(application._id, rejectionReason);
                        setIsRejecting(false);
                      } catch (err) { }
                      finally { setRejectLoading(false); }
                    }}
                    disabled={rejectLoading || rejectionReason.length < 10}
                    className="px-4 py-1.5 rounded-lg text-xs font-black bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {rejectLoading ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resignation Modal */}
      <AnimatePresence>
        {isResignModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-[32px] max-w-lg w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
              <h2 className="text-2xl font-black text-primary dark:text-white mb-2">Submit Resignation</h2>
              
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 mb-6">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{contractor?.companyName || contractor?.name}</p>
                <p className="text-sm font-medium text-slate-500">{job.jobRole}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><IconMapPin size={12}/>{job.workLocation}</p>
              </div>

              <div className="bg-orange-100 border border-orange-200 p-4 rounded-2xl mb-6">
                <p className="text-orange-800 font-bold text-sm">
                  ⚠️ You will serve a mandatory {job.noticePeriodDays !== undefined ? job.noticePeriodDays : 7}-day notice period. During this time you cannot apply to or accept any new jobs.
                </p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-400 mb-2">Reason for Resignation</label>
                  <textarea 
                    value={resignData.reason} 
                    onChange={(e) => setResignData({ reason: e.target.value.slice(0, 300) })}
                    placeholder="Please provide your reason for resigning (minimum 20 characters)..."
                    className={`w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl p-4 focus:ring-accent transition-all dark:text-white font-medium resize-none h-32 ${resignData.reason.length > 0 && resignData.reason.length < 20 ? 'border-red-400' : 'border-transparent'}`}
                  />
                  <div className={`text-right text-xs font-bold mt-1 ${resignData.reason.length < 20 ? 'text-red-400' : 'text-slate-400'}`}>
                    {resignData.reason.length}/300 characters
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setIsResignModalOpen(false)} className="flex-1 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-100 border border-slate-200 transition-all">Cancel</button>
                <button 
                  onClick={async () => {
                    setResignLoading(true);
                    try {
                      await onResign(application._id, resignData);
                      setIsResignModalOpen(false);
                    } catch (err) { }
                    finally { setResignLoading(false); }
                  }} 
                  disabled={resignLoading || resignData.reason.length < 20} 
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resignLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Confirm Resignation'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Route Map */}
      <AnimatePresence>
        {isMapOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden w-full"
          >
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 relative w-full">
              <button 
                onClick={() => setOpenMapJobId(null)}
                className="absolute top-8 right-2 z-20 bg-white dark:bg-slate-800 p-1 rounded-full shadow-md text-slate-400 hover:text-slate-600"
              >
                <IconX size={16} />
              </button>
              
              {!userHasCoordinates ? (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-6 text-center">
                  <IconAlertCircle size={32} className="mx-auto text-orange-400 mb-2" />
                  <p className="text-orange-800 dark:text-orange-400 font-bold text-sm">Please update your location in Profile Settings to see route information.</p>
                </div>
              ) : (
                <Suspense fallback={<div className="h-[320px] bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>}>
                  <RouteMap 
                    profLocation={user.location.coordinates}
                    siteLocation={job.workSiteLocation.coordinates}
                    profName={user.name}
                    siteName={contractor?.companyName || contractor?.name || 'Contractor'}
                    siteAddress={job.workLocation}
                  />
                </Suspense>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ApplicationsTab;
