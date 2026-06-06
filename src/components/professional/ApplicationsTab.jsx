import React, { useState, useEffect, Suspense, lazy } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  IconClipboardText, IconBuildingSkyscraper, IconMapPin, 
  IconCalendarTime, IconCurrencyRupee, IconCircleCheck, 
  IconX, IconClock, IconEye, IconUserCircle, IconMapRoute, 
  IconAlertCircle, IconHandStop, IconPlayerPlay
} from '@tabler/icons-react';

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
  'Position Filled': 'bg-amber-100 text-amber-600 border-amber-200'
};

const ApplicationsTab = ({ openMapJobId, setOpenMapJobId }) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinConfirm, setJoinConfirm] = useState(null); // applicationId being confirmed
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const res = await api.get('/api/professional/applications');
      setApplications(res.data);
    } catch (err) {
      console.error(err);
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

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading your applications...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
         <div>
            <h2 className="text-2xl font-black text-primary dark:text-white">Applied Jobs</h2>
            <p className="text-sm text-slate-400 font-medium tracking-tight">Track the progress of your job applications.</p>
         </div>
         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-6 py-2 rounded-2xl">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total: </span>
            <span className="text-lg font-black text-primary dark:text-white ml-2">{applications.length}</span>
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
          />
        )) : (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <IconClipboardText size={60} className="mx-auto text-slate-300 mb-4" />
             <p className="text-slate-400 font-bold">You haven't applied to any jobs yet.</p>
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
    </div>
  );
};

const ApplicationCard = ({ application, user, openMapJobId, setOpenMapJobId, onJoinClick }) => {
  const job = application.jobPostId;
  const contractor = application.contractorId;

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
      className="bg-white dark:bg-slate-900 rounded-[35px] border border-slate-200 dark:border-slate-800 p-8 hover:shadow-lg hover:border-accent transition-all relative overflow-hidden"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 ${
            application.status === 'Joined' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
          }`}>
             <IconBuildingSkyscraper size={32} />
          </div>
          <div>
             <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-xl font-black text-primary dark:text-white tracking-tight">{job.jobRole}</h3>
                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${STATUS_COLORS[application.status] || 'bg-slate-100'}`}>
                  {application.status}
                </span>
                {(application.status === 'Hired' || application.status === 'Joined') && distanceText && (
                  <span className="text-[10px] font-black text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded-md flex items-center gap-1">
                    <IconMapPin size={12} /> {distanceText} km away
                  </span>
                )}
             </div>
             <p className="text-sm font-bold text-slate-500 flex items-center gap-1.5 ring-1 ring-slate-100 dark:ring-white/5 w-fit px-3 py-0.5 rounded-full mt-1">
                <IconUserCircle size={16} /> {contractor?.companyName || contractor?.name}
             </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 lg:gap-8">
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1"><IconCurrencyRupee size={10} /> Salary</span>
              <span className="text-base font-black text-accent leading-none">₹{job.salary}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{job.salaryType}</span>
           </div>
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1"><IconMapPin size={10} /> Location</span>
              <span className="text-sm font-bold text-primary dark:text-blue-100">{job.workLocation}</span>
           </div>
           <div className="flex flex-col sm:col-span-1 col-span-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-1"><IconCalendarTime size={10} /> Applied On</span>
              <span className="text-sm font-bold text-primary dark:text-blue-100">{new Date(application.appliedAt).toLocaleDateString()}</span>
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
            
            {application.status === 'Hired' && (
              <button 
                onClick={onJoinClick}
                className="flex items-center gap-2 text-xs font-black px-6 py-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                <IconPlayerPlay size={16} /> Join Now
              </button>
            )}
         </div>
         
         <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center min-w-[100px] gap-2">
                {application.status === 'Applied' && <IconClock size={16} className="text-slate-400" />}
                {application.status === 'Viewed' && <IconEye size={16} className="text-purple-500" />}
                {application.status === 'Shortlisted' && <IconCircleCheck size={16} className="text-orange-500 animate-bounce" />}
                {application.status === 'Hired' && <IconCircleCheck size={16} className="text-green-500" />}
                {application.status === 'Joined' && <IconCircleCheck size={16} className="text-emerald-600" />}
                {application.status === 'Rejected' && <IconX size={16} className="text-red-500" />}
                {application.status === 'Withdrawn' && <IconHandStop size={16} className="text-slate-400" />}
                {application.status === 'Position Filled' && <IconAlertCircle size={16} className="text-amber-500" />}
                <span className="text-[10px] font-black uppercase text-slate-400">{application.status}</span>
            </div>
         </div>
      </div>

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
