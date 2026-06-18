import React, { useState, useEffect, Suspense, lazy } from 'react';
import api from '../../api';
import socket from '../../socket';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  IconBriefcase, IconMapPin, IconClock, IconCurrencyRupee,
  IconFilter, IconSearch, IconChevronRight, IconCircleCheck,
  IconAlertCircle, IconMapRoute, IconX, IconDoorExit, IconRefresh
} from '@tabler/icons-react';
import ResignationModal from './ResignationModal';

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

const JobsFeedTab = ({ openMapJobId, setOpenMapJobId, directHireRequests = [], setDirectHireRequests }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('Default');
  const [filters, setFilters] = useState({
    minSalary: '',
    duration: '',
    location: '',
    maxDistance: 'Any Distance'
  });

  const [workingStatus, setWorkingStatus] = useState({
    isWorking: false,
    isInNoticePeriod: false,
    currentJob: null,
    lastWorkingDate: null,
    contractorName: null,
    contractorId: null
  });
  const [isResignModalOpen, setIsResignModalOpen] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchWorkingStatus();

    const handleNewJob = (data) => {
      if (data.job) {
        setJobs(prev => {
          // Avoid duplicate items
          if (prev.some(j => j._id === data.job._id)) return prev;
          return [data.job, ...prev];
        });
      }
    };

    const handleStatusRefresh = () => {
      fetchWorkingStatus();
      fetchJobs();
    };

    socket.on('professional:newJob', handleNewJob);
    socket.on('resignationAccepted', handleStatusRefresh);
    socket.on('resignationComplete', handleStatusRefresh);

    return () => {
      socket.off('professional:newJob', handleNewJob);
      socket.off('resignationAccepted', handleStatusRefresh);
      socket.off('resignationComplete', handleStatusRefresh);
    };
  }, [filters]);

  const fetchWorkingStatus = async () => {
    try {
      const res = await api.get('/api/professional/working-status');
      setWorkingStatus(res.data);
    } catch (err) {
      console.error('Error fetching working status:', err);
      setWorkingStatus({
        isWorking: false,
        isInNoticePeriod: false,
        currentJob: null,
        lastWorkingDate: null,
        contractorName: null,
        contractorId: null
      });
    }
  };

  const fetchJobs = async () => {
    try {
      const params = { ...filters };
      if (user?.location?.coordinates) {
        params.professionalLng = user.location.coordinates[0];
        params.professionalLat = user.location.coordinates[1];
      }
      const res = await api.get('/api/professional/jobs', { params });
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (jobId) => {
    try {
      await api.post(`/api/professional/jobs/${jobId}/apply`);
      setJobs(jobs.map(j => j._id === jobId ? { ...j, hasApplied: true } : j));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to apply');
    }
  };

  const handleJoinDirectHire = async (requestId) => {
    if (!window.confirm("Are you sure you want to join this position? This will withdraw your other pending applications.")) return;
    try {
      await api.put(`/api/professional/direct-hire-requests/${requestId}/join`);
      alert('Successfully joined position!');
      setDirectHireRequests(prev => prev.map(req => {
        if (req._id === requestId) return { ...req, status: 'Joined' };
        if (req.status === 'Pending') return { ...req, status: 'Withdrawn' };
        return req;
      }));
      fetchJobs();
      fetchWorkingStatus();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join');
    }
  };

  const handleRejectDirectHire = async (requestId) => {
    const reason = window.prompt("Please enter a reason for rejection (min 10 characters):");
    if (!reason || reason.length < 10) return alert('Please provide at least 10 characters.');
    try {
      await api.put(`/api/professional/direct-hire-requests/${requestId}/reject`, { rejectionReason: reason });
      alert('Your response has been submitted.');
      setDirectHireRequests(prev => prev.map(req => 
        req._id === requestId ? { ...req, status: 'Rejected' } : req
      ));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  if (loading && jobs.length === 0) return <div className="p-8 text-center text-slate-400 font-bold tracking-widest uppercase text-xs">Scanning for opportunities...</div>;

  const sortedJobs = [...jobs];
  if (sortBy === 'Nearest First' && user?.location?.coordinates) {
    sortedJobs.sort((a, b) => {
      const dA = a.workSiteLocation?.coordinates ? calculateDistance(user.location.coordinates[1], user.location.coordinates[0], a.workSiteLocation.coordinates[1], a.workSiteLocation.coordinates[0]) : Infinity;
      const dB = b.workSiteLocation?.coordinates ? calculateDistance(user.location.coordinates[1], user.location.coordinates[0], b.workSiteLocation.coordinates[1], b.workSiteLocation.coordinates[0]) : Infinity;
      return parseFloat(dA) - parseFloat(dB);
    });
  } else if (sortBy === 'Latest First') {
    sortedJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return (
    <div className="space-y-8">
      {/* Search & Filter */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[35px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text" placeholder="Search by location..."
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
            value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          />
        </div>
        <div className="relative w-full md:w-48">
          <IconCurrencyRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="number" placeholder="Min Salary"
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
            value={filters.minSalary} onChange={(e) => setFilters({ ...filters, minSalary: e.target.value })}
          />
        </div>
        <div className="relative w-full md:w-48">
          <IconClock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent transition-all dark:text-white appearance-none"
            value={filters.duration} onChange={(e) => setFilters({ ...filters, duration: e.target.value })}
          >
            <option value="">Any Duration</option>
            <option value="Short term">Short term</option>
            <option value="Long term">Long term</option>
            <option value="Daily basis">Daily basis</option>
          </select>
        </div>
        <div className="relative w-full md:w-48">
          <IconMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent transition-all dark:text-white appearance-none"
            value={filters.maxDistance} onChange={(e) => setFilters({ ...filters, maxDistance: e.target.value })}
          >
            <option value="Any Distance">Any Distance</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
            <option value="25">Within 25 km</option>
            <option value="50">Within 50 km</option>
          </select>
        </div>
        <button
          onClick={() => {
            fetchWorkingStatus();
            fetchJobs();
          }}
          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 p-3 rounded-2xl transition-all"
          title="Refresh Feed"
        >
          <IconRefresh size={20} className={loading ? 'animate-spin text-accent' : ''} />
        </button>
        <div className="relative w-full md:w-48">
          <IconFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <select
            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent transition-all dark:text-white appearance-none"
            value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="Default">Sort: Default</option>
            <option value="Nearest First">Nearest First</option>
            <option value="Latest First">Latest First</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedJobs.map(job => (
          <JobCard 
            key={job._id} 
            job={job} 
            user={user}
            workingStatus={workingStatus}
            directHireRequests={directHireRequests}
            onApply={() => handleApply(job._id)} 
            onJoin={handleJoinDirectHire}
            onReject={handleRejectDirectHire}
            openMapJobId={openMapJobId}
            setOpenMapJobId={setOpenMapJobId}
            setIsResignModalOpen={setIsResignModalOpen}
          />
        ))}
        {sortedJobs.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <IconBriefcase size={60} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-400 font-bold">No matching jobs found right now.</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or check back later.</p>
          </div>
        )}
      </div>

      <ResignationModal
        isOpen={isResignModalOpen}
        onClose={() => setIsResignModalOpen(false)}
        contractorName={workingStatus.contractorName}
        jobRole={user?.jobRole || 'Professional'}
        onSuccess={() => {
          fetchWorkingStatus();
          fetchJobs();
        }}
      />
    </div>
  );
};

const JobCard = ({ job, user, workingStatus, directHireRequests, onApply, onJoin, onReject, openMapJobId, setOpenMapJobId, setIsResignModalOpen }) => {
  const hasCoordinates = job.workSiteLocation && job.workSiteLocation.coordinates && job.workSiteLocation.coordinates.length === 2;
  const userHasCoordinates = user?.location?.coordinates && user.location.coordinates.length === 2;
  const isMapOpen = openMapJobId === job._id;
  const matchingDirectHire = directHireRequests?.find(req => (req.jobPostId?._id || req.jobPostId) === job._id);

  let distanceBadge = null;
  if (hasCoordinates && userHasCoordinates) {
    const dist = calculateDistance(user.location.coordinates[1], user.location.coordinates[0], job.workSiteLocation.coordinates[1], job.workSiteLocation.coordinates[0]);
    distanceBadge = <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1"><IconMapPin size={12}/> {dist} km away</span>;
  }

  let noticeDaysRemaining = 0;
  if (user?.isServingNotice && user?.noticeEndDate) {
    const distance = new Date(user.noticeEndDate).getTime() - new Date().getTime();
    noticeDaysRemaining = Math.max(0, Math.ceil(distance / (1000 * 60 * 60 * 24)));
  }

  return (
    <motion.div
      id={`job-${job._id}`}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-slate-900 rounded-[35px] border ${matchingDirectHire && matchingDirectHire.status === 'Pending' ? 'border-orange-500 shadow-xl shadow-orange-500/10' : 'border-slate-200 dark:border-slate-800'} p-6 shadow-sm hover:shadow-xl hover:border-accent transition-all group overflow-hidden relative flex flex-col pt-8`}
    >
      {matchingDirectHire && matchingDirectHire.status === 'Pending' && (
        <div className="absolute top-0 left-0 right-0 bg-orange-500 text-white text-[10px] font-black uppercase text-center py-1 tracking-widest z-10">
          Direct Hire Request
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform shrink-0">
              <IconBriefcase size={28} />
            </div>
            <div>
              <h4 className="text-xl font-black text-primary dark:text-white leading-tight">{job.jobRole}</h4>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{job.duration}</p>
                {distanceBadge}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase">Offering</p>
            <p className="text-xl font-black text-accent leading-none">₹{job.salary}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Per {job.salaryType === 'monthly' ? 'Month' : 'Contract'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-3">
            <IconMapPin size={20} className="text-slate-400" />
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 leading-tight">Location</p>
              <p className="text-sm font-bold text-primary dark:text-blue-100">{job.workLocation}</p>
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-3">
            <IconClock size={20} className="text-slate-400" />
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 leading-tight">Posted</p>
              <p className="text-sm font-bold text-primary dark:text-blue-100">{new Date(job.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Required Skills</p>
          <div className="flex flex-wrap gap-2">
            {job.requiredSkills?.map((skill, i) => (
              <span key={i} className="text-[10px] font-black uppercase px-3 py-1.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 rounded-lg border border-blue-100/20">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-auto border-t border-slate-50 dark:border-white/5 pt-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            {hasCoordinates && (
              <button 
                onClick={() => setOpenMapJobId(isMapOpen ? null : job._id)}
                className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all ${isMapOpen ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'}`}
              >
                <IconMapRoute size={16} /> {isMapOpen ? 'Hide Route' : 'View Route'}
              </button>
            )}
          </div>

          {matchingDirectHire && matchingDirectHire.status === 'Pending' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onJoin(matchingDirectHire._id)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg shadow-green-500/20"
              >
                Join Now
              </button>
              <button
                onClick={() => onReject(matchingDirectHire._id)}
                className="bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 px-6 py-3 rounded-2xl font-black text-sm transition-all"
              >
                Reject
              </button>
            </div>
          ) : job.hasApplied ? (
            <div className="flex items-center gap-2 text-green-500 font-black text-sm uppercase tracking-widest px-6 py-3 bg-green-500/10 rounded-2xl border border-green-500/20">
              <IconCircleCheck size={20} /> Applied
            </div>
          ) : workingStatus.isWorking && !workingStatus.isInNoticePeriod ? (
            <button disabled className="bg-slate-200 dark:bg-slate-800 text-slate-400 px-8 py-3 rounded-2xl font-black text-sm cursor-not-allowed">
              Currently Working
            </button>
          ) : (
            <button
              onClick={onApply}
              className="bg-accent text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-orange-500/20 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              Apply Now <IconChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Working Status Banners */}
        {workingStatus.isWorking && !workingStatus.isInNoticePeriod && !job.hasApplied && (
          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <IconAlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-orange-800 dark:text-orange-300 leading-snug">
                You are currently working with {workingStatus.contractorName}. You must resign before applying to new positions.
              </p>
            </div>
            <button 
              onClick={() => setIsResignModalOpen(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <IconDoorExit size={16} /> Resign from Current Job
            </button>
          </div>
        )}

        {workingStatus.isWorking && workingStatus.isInNoticePeriod && !job.hasApplied && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <IconAlertCircle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-yellow-800 dark:text-yellow-300 leading-snug">
                Your resignation is pending with {workingStatus.contractorName}. You can apply but cannot join until your notice period ends{workingStatus.lastWorkingDate ? ` on ${new Date(workingStatus.lastWorkingDate).toLocaleDateString()}` : ''}.
              </p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isMapOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6 relative">
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
                    siteName={job.contractorId?.companyName || job.contractorId?.name || 'Contractor'}
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

export default JobsFeedTab;
