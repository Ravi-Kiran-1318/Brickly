import React, { useState, useEffect, Suspense, lazy } from 'react';
import api from '../../api';
import socket from '../../socket';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import {
  IconBriefcase, IconMapPin, IconClock, IconCurrencyRupee,
  IconFilter, IconSearch, IconChevronRight, IconCircleCheck,
  IconAlertCircle, IconMapRoute, IconX
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

const JobsFeedTab = ({ openMapJobId, setOpenMapJobId }) => {
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

  const [workingStatus, setWorkingStatus] = useState({ isWorking: false, contractorName: '', noticePeriodEnd: null });

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

    socket.on('professional:newJob', handleNewJob);

    return () => {
      socket.off('professional:newJob', handleNewJob);
    };
  }, [filters]);

  const fetchWorkingStatus = async () => {
    try {
      // Find out if the user has any 'Joined', 'ResignationPending', or 'ResignationAccepted'
      const resApps = await api.get('/api/professional/applications');
      const resDirect = await api.get('/api/professional/direct-hire-requests');
      
      let currentJob = null;
      // We will look for an active hired worker record, but since we don't have a direct endpoint for it easily right now,
      // we can deduce it from the joined status or just create a quick endpoint, but checking applications is faster since we have the data.
      // Wait, we can fetch from HiredWorker if needed. Since we only have the application, we don't know the exact noticePeriodEnd without HiredWorker.
      // Let's use a quick fetch to profile stats or a new endpoint? Actually, I can just fetch it from the backend if I add a route.
      // Wait, I can just fetch from professional applications and direct hires, but notice period requires HiredWorker.
      // I'll make a direct API call to `/api/auth/profile/:id` and maybe backend populated it?
      // Let's fetch HiredWorker directly by a new route, but I don't have one.
      // I will add an endpoint in `professionalController.js` to get active work status, or just use what I have.
      // Actually, I can add a small GET route `/api/professional/active-work` in `professional.js` to get the `HiredWorker` record.
      // But let's just make it simpler for now without touching backend again if I can avoid it.
      // Wait, the requirement says "Fetch the professional's current joined status... Check if any application or direct hire request has status Joined."
      
      const apps = [...resApps.data, ...resDirect.data];
      const joinedApp = apps.find(a => ['Joined', 'ResignationPending', 'ResignationAccepted'].includes(a.status));
      
      if (joinedApp) {
        // Find if they are in notice period (we don't have lastWorkingDate directly on app, but we can guess or if we don't have it we just show the yellow banner without date until backend gives it, but the requirement says to show last working date)
        setWorkingStatus({
          isWorking: true,
          contractorName: joinedApp.contractorId?.companyName || joinedApp.contractorId?.name || 'Contractor',
          isResigning: joinedApp.status === 'ResignationPending' || joinedApp.status === 'ResignationAccepted'
        });
      }
    } catch (err) { console.error('Failed to fetch working status', err); }
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
            <option value="Within 10 km">Within 10 km</option>
            <option value="Within 25 km">Within 25 km</option>
            <option value="Within 50 km">Within 50 km</option>
          </select>
        </div>
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
            onApply={() => handleApply(job._id)} 
            openMapJobId={openMapJobId}
            setOpenMapJobId={setOpenMapJobId}
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
    </div>
  );
};

const JobCard = ({ job, user, workingStatus, onApply, openMapJobId, setOpenMapJobId }) => {
  const hasCoordinates = job.workSiteLocation && job.workSiteLocation.coordinates && job.workSiteLocation.coordinates.length === 2;
  const userHasCoordinates = user?.location?.coordinates && user.location.coordinates.length === 2;
  const isMapOpen = openMapJobId === job._id;

  let distanceBadge = null;
  if (hasCoordinates && userHasCoordinates) {
    const dist = calculateDistance(user.location.coordinates[1], user.location.coordinates[0], job.workSiteLocation.coordinates[1], job.workSiteLocation.coordinates[0]);
    distanceBadge = <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1"><IconMapPin size={12}/> {dist} km away</span>;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-[35px] border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl hover:border-accent transition-all group overflow-hidden relative flex flex-col"
    >
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

          {job.hasApplied ? (
            <div className="flex items-center gap-2 text-green-500 font-black text-sm uppercase tracking-widest px-6 py-3 bg-green-500/10 rounded-2xl border border-green-500/20">
              <IconCircleCheck size={20} /> Applied
            </div>
          ) : workingStatus.isWorking && !workingStatus.isResigning ? (
            <button disabled className="bg-slate-200 dark:bg-slate-800 text-slate-400 px-8 py-3 rounded-2xl font-black text-sm">
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
        {workingStatus.isWorking && !workingStatus.isResigning && !job.hasApplied && (
          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl p-3 flex items-start gap-2">
            <IconAlertCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-orange-800 dark:text-orange-300 leading-snug">
              You are currently working with {workingStatus.contractorName}. You must resign before applying to new positions.
            </p>
          </div>
        )}
        {workingStatus.isResigning && !job.hasApplied && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 flex items-start gap-2">
            <IconAlertCircle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-400 leading-snug">
              Your resignation is pending with {workingStatus.contractorName}. You can apply but cannot join until your notice period ends.
            </p>
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
