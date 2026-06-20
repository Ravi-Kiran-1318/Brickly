import React, { useState, useEffect } from 'react';
import api from '../../api';
import socket from '../../socket';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconCalendarEvent, IconUpload, IconFileText, IconCertificate, 
  IconTrash, IconCircleCheck, IconEdit, IconX, IconEye, 
  IconEyeOff, IconAlertTriangle, IconPackage
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import ResignationModal from './ResignationModal';

const ROLE_HIERARCHY = {
  'Plumber': [
    'Plumbing Helper',
    'Junior Plumber',
    'Plumber',
    'Senior Plumber',
    'Plumbing Supervisor',
    'Plumbing Foreman'
  ],
  'Electrician': [
    'Electrical Helper',
    'Junior Electrician',
    'Electrician',
    'Senior Electrician',
    'Electrical Supervisor',
    'Electrical Foreman'
  ],
  'Mason': [
    'Mason Helper',
    'Junior Mason',
    'Mason',
    'Senior Mason',
    'Masonry Supervisor',
    'Masonry Foreman'
  ],
  'Carpenter': [
    'Carpentry Helper',
    'Junior Carpenter',
    'Carpenter',
    'Senior Carpenter',
    'Carpentry Supervisor',
    'Carpentry Foreman'
  ],
  'Welder': [
    'Welding Helper',
    'Junior Welder',
    'Welder',
    'Senior Welder',
    'Welding Supervisor',
    'Welding Foreman'
  ],
  'Painter': [
    'Painting Helper',
    'Junior Painter',
    'Painter',
    'Senior Painter',
    'Painting Supervisor',
    'Painting Foreman'
  ],
  'Tiler': [
    'Tiling Helper',
    'Junior Tiler',
    'Tiler',
    'Senior Tiler',
    'Tiling Supervisor',
    'Tiling Foreman'
  ],
  'Roofer': [
    'Roofing Helper',
    'Junior Roofer',
    'Roofer',
    'Senior Roofer',
    'Roofing Supervisor',
    'Roofing Foreman'
  ],
  'AC Technician': [
    'AC Helper',
    'Junior AC Technician',
    'AC Technician',
    'Senior AC Technician',
    'HVAC Supervisor',
    'HVAC Foreman'
  ],
  'Civil Engineer': [
    'Junior Civil Engineer',
    'Civil Engineer',
    'Senior Civil Engineer',
    'Civil Engineering Lead',
    'Civil Engineering Manager'
  ],
  'Architect': [
    'Junior Architect',
    'Architect',
    'Senior Architect',
    'Principal Architect',
    'Lead Architect'
  ],
  'Interior Designer': [
    'Junior Interior Designer',
    'Interior Designer',
    'Senior Interior Designer',
    'Lead Interior Designer',
    'Principal Interior Designer'
  ],
  'Foreman': [
    'Assistant Foreman',
    'Foreman',
    'Senior Foreman',
    'General Foreman',
    'Site Supervisor'
  ]
};

const AvailabilityTab = ({ directHireRequests, setDirectHireRequests }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(user);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false);
  const [isVisible, setIsVisible] = useState(user?.isVisible || false);
  const [availabilityStatus, setAvailabilityStatus] = useState(user?.availabilityStatus || 'Offline');
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [countdownText, setCountdownText] = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [stayLoading, setStayLoading] = useState(false);
  
  const userTrade = profile?.jobRole || profile?.trade || '';
  const roleOptions = ROLE_HIERARCHY[userTrade] || [];
  
  const [formData, setFormData] = useState({
    jobRole: user?.jobRole || '',
    yearsOfExperience: user?.yearsOfExperience || '',
    expectedSalary: '',
    availableFrom: '',
    locationPreference: user?.locationPreference || '',
    skillTags: [],
    isCrewPost: false,
    crewMembers: []
  });
  
  const [resume, setResume] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [skillInput, setSkillInput] = useState('');

  // Features State
  const [rejectingId, setRejectingId] = useState(null); // id of direct hire request being rejected
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinConfirm, setJoinConfirm] = useState(null);

  // Resignation State
  const [isResignModalOpen, setIsResignModalOpen] = useState(false);
  const [resignData, setResignData] = useState({ reason: '', comments: '' });
  const [resignLoading, setResignLoading] = useState(false);
  const [activeJoinId, setActiveJoinId] = useState(null); // id of the HiredWorker or Application/DirectHireRequest

  const [requestStayMessage, setRequestStayMessage] = useState(null);

  useEffect(() => {
    fetchProfileAndAvailability();
    fetchNotifications();
    fetchWorkingStatus();
  }, [user]);

  const [workingStatus, setWorkingStatus] = useState({ isWorking: false, contractorName: '' });
  const [myPosts, setMyPosts] = useState([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);

  const fetchTodayAttendance = async (hiredWorkerId) => {
    try {
      const res = await api.get(`/api/professional/hired-worker/${hiredWorkerId}/attendance/today`);
      if (res.data?.success) {
        setCheckedInToday(res.data.checkedIn);
        setTodayAttendance(res.data.attendance);
      }
    } catch (err) {
      console.error('Failed to fetch today attendance:', err);
    }
  };

  const handleCheckIn = async () => {
    if (!workingStatus.hiredWorkerId) return;
    setCheckingIn(true);

    const submitCheckIn = async (coords = {}) => {
      try {
        const res = await api.post(`/api/professional/hired-worker/${workingStatus.hiredWorkerId}/check-in`, coords);
        if (res.data?.success) {
          toast.success('Successfully checked in for today!');
          setCheckedInToday(true);
          setTodayAttendance(res.data.data);
        } else {
          toast.error(res.data?.message || 'Check-in failed');
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Check-in failed');
      } finally {
        setCheckingIn(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          submitCheckIn({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Location access is required to check in. Please enable GPS permissions.');
          setCheckingIn(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error('Geolocation is not supported by your browser.');
      setCheckingIn(false);
    }
  };

  useEffect(() => {
    api.get('/api/professional/my-availability').then(res => {
      if (res.data?.success) setMyPosts(res.data.data);
    }).catch(console.error);
  }, []);

  const fetchWorkingStatus = async () => {
    try {
      const res = await api.get('/api/professional/working-status');
      setWorkingStatus(res.data);
      if (res.data?.isWorking && res.data.hiredWorkerId) {
        fetchTodayAttendance(res.data.hiredWorkerId);
      }
    } catch (err) {
      console.error('Failed to fetch working status', err);
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

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/professional/notifications');
      const stayNotif = res.data.find(n => n.title === 'Your Contractor Wants You to Stay' && !n.isRead);
      if (stayNotif) {
        setRequestStayMessage(stayNotif.message);
      } else {
        setRequestStayMessage(null);
      }
    } catch (err) { console.error('Failed to fetch notifications:', err); }
  };

  useEffect(() => {
    if (workingStatus.isInNoticePeriod && workingStatus.lastWorkingDate) {
      const updateCountdown = () => {
        const now = new Date();
        const lastWorkingMidnight = new Date(workingStatus.lastWorkingDate);
        lastWorkingMidnight.setHours(23, 59, 59, 999);

        const diffMs = lastWorkingMidnight.getTime() - now.getTime();
        if (diffMs <= 0) {
          setCountdownText('Notice Period Complete');
          handleNoticeComplete();
          return true;
        }

        const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;

        setCountdownText(`${days} days ${hours} hours remaining`);
        return false;
      };

      const handleNoticeComplete = () => {
        setShowSuccessBanner(true);
        api.get('/api/professional/working-status').then(res => {
          setWorkingStatus(res.data);
        });
      };

      const isCompleted = updateCountdown();
      if (isCompleted) return;

      const interval = setInterval(() => {
        const done = updateCountdown();
        if (done) {
          clearInterval(interval);
        }
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [workingStatus.isInNoticePeriod, workingStatus.lastWorkingDate]);

  useEffect(() => {
    if (localStorage.getItem('showNoticeCompleteBanner') === 'true') {
      setShowSuccessBanner(true);
      localStorage.removeItem('showNoticeCompleteBanner');
    }

    const handleResignationComplete = () => {
      setShowSuccessBanner(true);
      fetchWorkingStatus();
      fetchProfileAndAvailability();
    };

    socket.on('resignationComplete', handleResignationComplete);
    return () => {
      socket.off('resignationComplete', handleResignationComplete);
    };
  }, []);

  const handleRespondOffer = async (offerId, accept) => {
    if (stayLoading) return;
    setStayLoading(true);
    try {
      const res = await api.post(`/api/professional/retention-offer/${offerId}/respond`, { accept });
      toast.success(res.data.message || (accept ? 'Retention offer accepted!' : 'Offer declined.'));
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send response');
    } finally {
      setStayLoading(false);
    }
  };

  const handleCancelResignation = async () => {
    if (!window.confirm("Are you sure you want to cancel your resignation?")) return;
    if (resignLoading) return;
    setResignLoading(true);
    try {
      await api.post('/api/professional/resign/cancel');
      toast.success('Resignation cancelled successfully!');
      fetchProfileAndAvailability();
      fetchWorkingStatus();
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel resignation');
    } finally {
      setResignLoading(false);
    }
  };


  const fetchProfileAndAvailability = async () => {
    try {
      setLoading(true);
      const profileRes = await api.get('/api/professional/profile');
      const freshProfile = profileRes.data;
      setProfile(freshProfile);
      setIsVisible(freshProfile.isVisible || false);
      setAvailabilityStatus(freshProfile.availabilityStatus || 'Offline');
      
      const res = await api.get('/api/professional/availability');
      if (res.data) {
        setPost(res.data);
        setFormData({
          jobRole: res.data.jobRole,
          yearsOfExperience: res.data.yearsOfExperience,
          expectedSalary: res.data.expectedSalary,
          availableFrom: new Date(res.data.availableFrom).toISOString().split('T')[0],
          locationPreference: res.data.locationPreference,
          skillTags: res.data.skillTags || [],
          isCrewPost: res.data.isCrewPost || false,
          crewMembers: res.data.crewMembers || []
        });
      } else {
        setFormData({
          jobRole: freshProfile?.jobRole || '',
          yearsOfExperience: freshProfile?.yearsOfExperience || '',
          expectedSalary: '',
          availableFrom: '',
          locationPreference: freshProfile?.locationPreference || '',
          skillTags: [],
          isCrewPost: false,
          crewMembers: []
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (visibilityLoading) return;
    const nextVisible = !isVisible;
    setVisibilityLoading(true);
    const nextStatus = nextVisible ? 'Online' : 'Offline';
    try {
      const res = await api.put('/api/professional/visibility', {
        isVisible: nextVisible,
        availabilityStatus: nextStatus
      });
      setIsVisible(res.data.isVisible);
      setAvailabilityStatus(res.data.availabilityStatus);
      if (nextVisible) {
        toast.success("You are now visible to contractors. Your profile is live.");
      } else {
        toast.success("You are now hidden from contractors.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update visibility");
    } finally {
      setVisibilityLoading(false);
    }
  };

  const handleGoOnlineDirect = async () => {
    if (visibilityLoading) return;
    setVisibilityLoading(true);
    try {
      const res = await api.put('/api/professional/visibility', {
        isVisible: true,
        availabilityStatus: 'Online'
      });
      setIsVisible(true);
      setAvailabilityStatus('Online');
      toast.success("You are now visible to contractors. Your profile is live.");
      // Force refresh of profile and availability
      fetchProfileAndAvailability();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to go online");
    } finally {
      setVisibilityLoading(false);
    }
  };

  const [submitLoading, setSubmitLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLoading) return;
    setSubmitLoading(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'skillTags') {
        formData[key].forEach(tag => data.append('skillTags', tag));
      } else if (key === 'crewMembers') {
        data.append('crewMembers', JSON.stringify(formData[key] || []));
      } else {
        data.append(key, formData[key]);
      }
    });
    
    if (resume) data.append('resume', resume);
    certificates.forEach(c => data.append('certificates', c));

    try {
      if (post) {
        await api.put('/api/professional/availability', data);
      } else {
        await api.post('/api/professional/availability', data);
      }
      fetchProfileAndAvailability();
      setIsFormOpen(false);
      setIsAvailable(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleJoinDirectHire = async (requestId) => {
    setJoinLoading(true);
    try {
      await api.put(`/api/professional/direct-hire-requests/${requestId}/join`);
      toast.success('🎉 Successfully joined position!', { duration: 4000 });
      setJoinConfirm(null);
      // Update state
      setDirectHireRequests(prev => prev.map(req => {
        if (req._id === requestId) return { ...req, status: 'Joined' };
        if (req.status === 'Pending') return { ...req, status: 'Withdrawn' };
        return req;
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleRejectDirectHire = async (requestId) => {
    if (!rejectionReason || rejectionReason.length < 10) {
      return toast.error('Please enter at least 10 characters.');
    }
    setRejectLoading(true);
    try {
      await api.put(`/api/professional/direct-hire-requests/${requestId}/reject`, { rejectionReason });
      toast.success('Your response has been submitted.');
      setRejectingId(null);
      setRejectionReason('');
      setDirectHireRequests(prev => prev.map(req => 
        req._id === requestId ? { ...req, status: 'Rejected' } : req
      ));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setRejectLoading(false);
    }
  };

  const addSkill = () => {
    if (skillInput && !formData.skillTags.includes(skillInput)) {
      setFormData({ ...formData, skillTags: [...formData.skillTags, skillInput] });
      setSkillInput('');
    }
  };

  const removeSkill = (tag) => {
    setFormData({ ...formData, skillTags: formData.skillTags.filter(t => t !== tag) });
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading...</div>;


  const hasNoAvailability = !post;
  const isOffline = !isVisible || availabilityStatus === 'Offline';
  const showEmptyState = hasNoAvailability && !workingStatus.isWorking && !workingStatus.isInNoticePeriod && isOffline;

  const isEmploymentEnded = workingStatus.isWorking && workingStatus.endDate && new Date() > new Date(workingStatus.endDate);
  const isEmploymentNotStarted = workingStatus.isWorking && workingStatus.startDate && new Date() < new Date(workingStatus.startDate);

  return (
    <div className="space-y-8">
      {/* Visibility Status Badge */}
      <div className="flex justify-end mb-4">
        {isVisible ? (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-200 dark:border-green-800 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Visible to Contractors
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-slate-400"></span>
            Hidden from Contractors
          </span>
        )}
      </div>

      {/* Success Banner */}
      {showSuccessBanner && !workingStatus.isInNoticePeriod && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-green-500 text-white rounded-3xl p-6 shadow-lg shadow-green-500/20 flex items-start gap-4 mb-6"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <IconCircleCheck size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-xl mb-1">Notice Period Complete</h3>
            <p className="text-sm font-bold text-green-100 mb-4">
              Congratulations your notice period has ended. You are now free to apply and join new positions.
            </p>
            <button 
              onClick={() => {
                setIsFormOpen(true);
                setShowSuccessBanner(false);
              }}
              className="bg-white text-green-600 hover:bg-green-50 px-6 py-2.5 rounded-xl font-black text-sm transition-all"
            >
              Post Availability
            </button>
          </div>
        </motion.div>
      )}

      {/* Notice Period Warning Banner */}
      {workingStatus.isInNoticePeriod && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500 text-white rounded-3xl p-6 shadow-lg shadow-orange-500/20 flex items-start gap-4 mb-6 border-l-8 border-orange-700"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <IconAlertTriangle size={24} />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-black text-xl mb-1">Notice Period Active</h3>
            <div className="text-sm font-bold text-orange-50 space-y-1">
              <p>Currently serving notice period with <span className="underline">{workingStatus.contractorName}</span>.</p>
              <p>Last working date: <span className="underline">{new Date(workingStatus.lastWorkingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>.</p>
              <p className="text-base font-black text-white mt-2">
                Time Remaining: {countdownText}
              </p>
            </div>
            
            <div className="pt-2 border-t border-white/20 space-y-1 text-xs text-orange-100 font-medium">
              <p>• You can apply for new jobs and post your availability during this period.</p>
              <p>• You cannot join a new position until your notice period ends on the last working date.</p>
            </div>
                  {workingStatus.pendingOffer ? (
              <div className="bg-white/10 rounded-2xl p-4 mt-4 border border-white/20">
                <h4 className="font-black text-white mb-2">Retention Offer from {workingStatus.pendingOffer.contractorName}</h4>
                
                {workingStatus.pendingOffer.offerType === 'salary_raise' && (
                  <p className="text-sm text-orange-50 font-bold mb-1">
                    Revised Monthly Salary: <span className="text-white text-base font-black">₹{workingStatus.pendingOffer.newSalary?.toLocaleString('en-IN')}</span>
                  </p>
                )}
                {workingStatus.pendingOffer.offerType === 'role_change' && (
                  <p className="text-sm text-orange-50 font-bold mb-1">
                    Revised Job Role: <span className="text-white text-base font-black">{workingStatus.pendingOffer.newRole}</span>
                  </p>
                )}
                {workingStatus.pendingOffer.offerType === 'site_change' && (
                  <p className="text-sm text-orange-50 font-bold mb-1">
                    Revised Work Site: <span className="text-white text-base font-black">{workingStatus.pendingOffer.newSite}</span>
                  </p>
                )}

                {workingStatus.pendingOffer.message && (
                  <p className="text-xs text-orange-100 font-medium italic mt-2 mb-4 bg-black/10 p-3 rounded-xl border border-white/5">
                    "{workingStatus.pendingOffer.message}"
                  </p>
                )}

                <div className="flex gap-3 flex-wrap">
                  <button 
                    onClick={() => handleRespondOffer(workingStatus.pendingOffer._id, true)}
                    disabled={stayLoading}
                    className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl transition-all text-sm disabled:opacity-50 flex items-center gap-1.5 shadow-md"
                  >
                    Accept Offer
                  </button>
                  <button 
                    onClick={() => handleRespondOffer(workingStatus.pendingOffer._id, false)}
                    disabled={stayLoading}
                    className="px-6 py-2.5 border-2 border-white/30 hover:bg-white/10 text-white font-black rounded-xl transition-all text-sm disabled:opacity-50"
                  >
                    Decline Offer
                  </button>
                </div>
              </div>
            ) : workingStatus.resignationStatus === 'ResignationPending' && (
              <button 
                onClick={handleCancelResignation}
                disabled={resignLoading}
                className="mt-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all text-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {resignLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                Cancel My Resignation
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Employed Banner (When working but not serving notice) */}
      {workingStatus.isWorking && !workingStatus.isInNoticePeriod && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 dark:bg-orange-900/10 border-2 border-orange-500 rounded-3xl p-6 flex items-center justify-between shadow-lg shadow-orange-500/10 animate-fade-in"
        >
          <div>
            <h3 className="font-black text-xl text-orange-800 dark:text-orange-400 mb-1">
              You are currently employed by {workingStatus.contractorName}
            </h3>
            <p className="text-sm font-bold text-orange-600 dark:text-orange-300">
              Role: {user?.currentJobRole || user?.jobRole || 'Professional'}
            </p>
            {workingStatus.currentJob?.salary && (
              <p className="text-xs font-bold text-orange-600/80 dark:text-orange-300/80 mt-1">
                Salary: ₹{workingStatus.currentJob.salary}
              </p>
            )}
          </div>
          <button 
            onClick={() => setIsResignModalOpen(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-black transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            Submit Resignation
          </button>
        </motion.div>
      )}

      {/* Daily Attendance Check-In Card */}
      {workingStatus.isWorking && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm mt-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isEmploymentEnded
                  ? 'bg-red-500/10 text-red-500'
                  : checkedInToday 
                    ? 'bg-green-500/10 text-green-500' 
                    : 'bg-orange-500/10 text-orange-500'
              }`}>
                {isEmploymentEnded ? <IconAlertTriangle size={24} /> : <IconCircleCheck size={24} />}
              </div>
              <div>
                <h3 className="font-black text-lg text-primary dark:text-white">Daily Check-In</h3>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {isEmploymentEnded
                    ? 'Check-in period has expired.'
                    : checkedInToday 
                      ? `Checked in for today at ${todayAttendance?.checkInAt ? new Date(todayAttendance.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}`
                      : 'Mark your presence on the work site for today.'
                  }
                </p>
                
                {/* Employment Window */}
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 px-3 py-1 rounded-xl w-fit">
                  <IconCalendarEvent size={14} className="text-slate-400" />
                  <span>
                    Employment Window: {new Date(workingStatus.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {workingStatus.endDate 
                      ? ` to ${new Date(workingStatus.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : ' (Ongoing)'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckIn}
              disabled={checkedInToday || checkingIn || isEmploymentEnded || isEmploymentNotStarted}
              className={`px-6 py-3 font-black rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2 self-start md:self-auto ${
                checkedInToday || isEmploymentEnded || isEmploymentNotStarted
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {checkingIn ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : isEmploymentEnded ? (
                <>Period Ended</>
              ) : isEmploymentNotStarted ? (
                <>Not Started</>
              ) : checkedInToday ? (
                <>Checked In</>
              ) : (
                <>Mark I'm On Site</>
              )}
            </button>
          </div>

          {/* Warning Banners */}
          {isEmploymentEnded && (
            <div className="mt-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold rounded-2xl flex items-center gap-2">
              <IconAlertTriangle size={18} className="shrink-0" />
              <span>This employment period has ended. Daily check-in is no longer active.</span>
            </div>
          )}

          {isEmploymentNotStarted && (
            <div className="mt-4 p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-bold rounded-2xl flex items-center gap-2">
              <IconAlertTriangle size={18} className="shrink-0" />
              <span>This employment period has not started yet. You can check in starting from {new Date(workingStatus.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.</span>
            </div>
          )}
        </motion.div>
      )}

      {showEmptyState && !isFormOpen ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center py-16 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-6">
            <IconEyeOff size={32} />
          </div>
          <h3 className="text-2xl font-black text-primary dark:text-white mb-2">You are currently offline</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 font-medium">
            You are currently offline and not visible to contractors. Post your availability and go online to start receiving hire requests.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsFormOpen(true)}
              className="px-8 py-3 bg-accent text-white font-black rounded-xl hover:bg-orange-600 transition-all text-sm"
            >
              Post Availability
            </button>
            <button 
              onClick={handleGoOnlineDirect}
              disabled={visibilityLoading}
              className="px-8 py-3 bg-green-500 text-white font-black rounded-xl hover:bg-green-655 transition-all text-sm disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-green-500/20"
            >
              {visibilityLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-200 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-100"></span>
                </span>
              )}
              Go Online
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* History of Availability Posts */}
          {myPosts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-primary dark:text-white">Availability Post History</h2>
              <div className="grid grid-cols-1 gap-4">
                {myPosts.map(post => (
                  <div key={post._id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-black text-lg text-primary dark:text-white">{post.jobRole}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${post.isHired ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {post.isHired ? 'Hired ✓' : 'Active — Available'}
                      </span>
                    </div>
                    {post.isHired && post.hiredSnapshot && (
                      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Hired By</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{post.hiredSnapshot.companyName || post.hiredSnapshot.contractorName}</p>
                        <p className="text-xs text-slate-500 mb-2">{post.hiredSnapshot.phone} · {post.hiredSnapshot.email}</p>
                        <p className="text-[10px] font-bold text-slate-400">Hired on {new Date(post.hiredSnapshot.hireDate || post.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct Hire Requests Section */}
          {directHireRequests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-primary dark:text-white">Direct Hire Requests</h2>
              <div className="grid grid-cols-1 gap-4">
                {directHireRequests.map(req => (
                  <div key={req._id} id={`request-${req._id}`} className={`bg-white dark:bg-slate-900 rounded-[24px] border ${req.status === 'Rejected' ? 'border-red-200 dark:border-red-900/50 opacity-75' : 'border-slate-200 dark:border-slate-800'} p-6 shadow-sm overflow-hidden`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-black text-primary dark:text-white">{req.contractorId?.companyName || req.contractorId?.name}</h3>
                        <p className="text-sm font-bold text-slate-505">{req.jobRole}</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${req.status === 'Pending' ? 'bg-orange-100 text-orange-600 border-orange-200' : req.status === 'Joined' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                        {req.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {req.workSiteLocation && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Location</p>
                          <p className="text-sm font-bold text-primary dark:text-white">{req.workSiteLocation}</p>
                        </div>
                      )}
                      {req.salary && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Salary</p>
                          <p className="text-sm font-black text-accent">{req.salary}</p>
                        </div>
                      )}
                      {req.duration && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400">Duration</p>
                          <p className="text-sm font-bold text-primary dark:text-white">{req.duration}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400">Requested On</p>
                        <p className="text-sm font-bold text-primary dark:text-white">{new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {req.status === 'Pending' && (
                      <div className="flex flex-col gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          {user?.isServingNotice ? (
                            <button 
                              disabled
                              className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-400 font-black py-2.5 rounded-xl cursor-not-allowed transition-all text-xs"
                              title={`You are serving a notice period until ${new Date(user.noticeEndDate).toLocaleDateString()}.`}
                            >
                              Join Unavailable (Notice Period)
                            </button>
                          ) : workingStatus.isWorking ? (
                            <button 
                              disabled
                              className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-400 font-black py-2.5 rounded-xl cursor-not-allowed transition-all text-xs"
                              title="You are currently working on another job. You must resign first."
                            >
                              Join Unavailable (Employed)
                            </button>
                          ) : (
                            <button 
                              onClick={() => setJoinConfirm(req._id)}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-2.5 rounded-xl transition-all"
                            >
                              Join Now
                            </button>
                          )}
                          <button 
                            onClick={() => setRejectingId(rejectingId === req._id ? null : req._id)}
                            className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/50 font-black py-2.5 rounded-xl transition-all"
                          >
                            Reject
                          </button>
                        </div>

                        {/* Inline Reject Area */}
                        <AnimatePresence>
                          {rejectingId === req._id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }} 
                              animate={{ height: 'auto', opacity: 1 }} 
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
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
                                    <button onClick={() => { setRejectingId(null); setRejectionReason(''); }} className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                                    <button 
                                      onClick={() => handleRejectDirectHire(req._id)}
                                      disabled={rejectLoading || rejectionReason.length < 10}
                                      className="px-4 py-1.5 rounded-lg text-xs font-black bg-red-500 text-white hover:bg-red-655 disabled:opacity-50"
                                    >
                                      {rejectLoading ? 'Submitting...' : 'Submit'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Visibility Toggle Card */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
            <div className="flex items-center gap-6">
              <div className={`p-5 rounded-3xl ${isVisible ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                 {isVisible ? <IconEye size={32} /> : <IconEyeOff size={32} />}
              </div>
              <div>
                <h2 className="text-2xl font-black text-primary dark:text-white">Active Visibility</h2>
                <p className="text-slate-505 font-medium">{isVisible ? 'Contractors can see you in the search results.' : 'You are currently hidden from employers.'}</p>
              </div>
            </div>
            
            <button 
              onClick={handleToggleVisibility}
              disabled={visibilityLoading || user?.isServingNotice}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all ${
                user?.isServingNotice 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                  : isVisible 
                    ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-lg shadow-green-500/20' 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-300'
              }`}
              title={user?.isServingNotice ? "Cannot change availability during notice period" : ""}
            >
              {visibilityLoading ? (
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="relative flex h-3 w-3">
                  {isVisible ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-200 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-200"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-405"></span>
                  )}
                </span>
              )}
              {isVisible ? 'Go Offline' : 'Go Online'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Left: Current Profile Status */}
             <div className="lg:col-span-1 space-y-6">
                <h3 className="text-xl font-black text-primary dark:text-white flex items-center gap-2">
                   Availability Status <IconAlertTriangle size={24} className="text-orange-500" />
                </h3>
                
                {post ? (
                  <div className="bg-white dark:bg-slate-900 rounded-[35px] border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Post</span>
                        <button onClick={() => setIsFormOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-accent">
                           <IconEdit size={20} />
                        </button>
                     </div>
                     
                     <div className="space-y-4">
                        <div>
                            <h4 className="font-black text-primary dark:text-white text-lg">{post.jobRole}</h4>
                            <p className="text-sm font-bold text-slate-400">{post.yearsOfExperience} Years Experience</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Min Salary</p>
                              <p className="text-sm font-black text-accent">₹{post.expectedSalary}</p>
                           </div>
                           <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
                              <p className="text-[10px] font-black text-slate-400 uppercase">Available From</p>
                              <p className="text-sm font-black text-primary dark:text-blue-100">{new Date(post.availableFrom).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                           {post.skillTags?.map((tag, i) => (
                             <span key={i} className="text-[9px] font-black uppercase px-2 py-1 bg-blue-50 dark:bg-blue-900/10 text-blue-600 rounded-md">
                               {tag}
                             </span>
                           ))}
                        </div>
                        {post.isCrewPost && (
                           <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 px-2.5 py-1 rounded-lg">
                                 👥 Crew of {post.crewSize}
                              </span>
                              {post.crewMembers && post.crewMembers.length > 0 && (
                                 <div className="pl-2 space-y-1.5 max-h-32 overflow-y-auto">
                                    {post.crewMembers.map((member, idx) => (
                                       <div key={idx} className="text-xs font-bold text-slate-500">
                                          • {member.name} ({member.role} · {member.yearsOfExperience} yrs exp)
                                       </div>
                                    ))}
                                 </div>
                              )}
                           </div>
                        )}
                        
                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                           {post.resumeUrl && (
                             <a href={post.resumeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-xs font-bold text-slate-500 hover:text-accent transition-colors">
                                <IconFileText size={18} /> View Resume
                             </a>
                           )}
                           {post.certificateUrls?.map((url, i) => (
                             <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-xs font-bold text-slate-500 hover:text-accent transition-colors">
                                <IconCertificate size={18} /> Certificate {i + 1}
                             </a>
                           ))}
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-[35px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                     <IconPackage size={48} className="mx-auto mb-4 text-slate-200" />
                     <p className="font-bold mb-4">No availability post found.</p>
                     {(!workingStatus.isWorking || workingStatus.isInNoticePeriod) && (
                       <button 
                         onClick={() => setIsFormOpen(true)}
                         className="bg-accent text-white px-6 py-2 rounded-xl font-black text-sm"
                       >
                         Create One Now
                       </button>
                     )}
                  </div>
                )}
             </div>

             {/* Right: Form Section */}
             <div className="lg:col-span-2">
                {(!workingStatus.isWorking || workingStatus.isInNoticePeriod) ? (
                  <AnimatePresence>
                   {isFormOpen && (
                     <motion.div 
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: 20 }}
                       className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl"
                     >
                       <div className="p-8 space-y-8">
                          <div className="flex items-center justify-between">
                             <h3 className="text-xl font-black text-primary dark:text-white">{post ? 'Edit Availability' : 'Create Availability Post'}</h3>
                             <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><IconX /></button>
                          </div>

                          <form onSubmit={handleSubmit} className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                   <label className="block text-xs font-black uppercase text-slate-400 mb-2">Job Role</label>
                                   {roleOptions.length > 0 ? (
                                     <select
                                       required
                                       className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                                       value={formData.jobRole} onChange={(e) => setFormData({...formData, jobRole: e.target.value})}
                                     >
                                       <option value="" disabled>Select a role...</option>
                                       {roleOptions.map((role) => (
                                         <option key={role} value={role}>{role}</option>
                                       ))}
                                     </select>
                                   ) : (
                                     <input 
                                       type="text" required placeholder="e.g. Master Mason"
                                       className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                                       value={formData.jobRole} onChange={(e) => setFormData({...formData, jobRole: e.target.value})}
                                     />
                                   )}
                                </div>
                                <div>
                                   <label className="block text-xs font-black uppercase text-slate-400 mb-2">Years of Experience</label>
                                   <input 
                                     type="number" required
                                     className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                                     value={formData.yearsOfExperience} onChange={(e) => setFormData({...formData, yearsOfExperience: e.target.value})}
                                   />
                                </div>
                                <div>
                                   <label className="block text-xs font-black uppercase text-slate-400 mb-2">Expected Salary (Per Month)</label>
                                   <input 
                                     type="text" required placeholder="e.g. 25,000"
                                     className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold text-accent"
                                     value={formData.expectedSalary} onChange={(e) => setFormData({...formData, expectedSalary: e.target.value})}
                                   />
                                </div>
                                <div>
                                   <label className="block text-xs font-black uppercase text-slate-400 mb-2">Available From</label>
                                   <input 
                                     type="date" required
                                     className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                                     value={formData.availableFrom} onChange={(e) => setFormData({...formData, availableFrom: e.target.value})}
                                   />
                                </div>
                                <div className="md:col-span-2">
                                   <label className="block text-xs font-black uppercase text-slate-400 mb-2">Location Preference</label>
                                   <input 
                                     type="text" required placeholder="e.g. Mumbai, Anywhere in Maharashtra"
                                     className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                                     value={formData.locationPreference} onChange={(e) => setFormData({...formData, locationPreference: e.target.value})}
                                   />
                                </div>
                                
                                <div className="md:col-span-2">
                                   <label className="block text-xs font-black uppercase text-slate-400 mb-2">Skills (Press Enter to add)</label>
                                   <div className="flex flex-wrap gap-2 mb-3">
                                      {formData.skillTags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1.5 text-xs font-black uppercase bg-accent text-white px-3 py-1.5 rounded-xl border border-white/10">
                                           {tag} <button type="button" onClick={() => removeSkill(tag)}><IconX size={14} /></button>
                                        </span>
                                      ))}
                                   </div>
                                   <input 
                                     type="text" placeholder="Add a skill..."
                                     className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                                     value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                                     onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                   />
                                </div>

                                <div className="md:col-span-2 border-t border-slate-100 dark:border-white/5 pt-4">
                                   <label className="flex items-center gap-3 cursor-pointer">
                                      <input 
                                         type="checkbox" 
                                         className="w-5 h-5 rounded border-slate-300 text-accent focus:ring-accent"
                                         checked={formData.isCrewPost} 
                                         onChange={(e) => setFormData({...formData, isCrewPost: e.target.checked})}
                                      />
                                      <span className="text-sm font-black text-primary dark:text-white">Post availability for crew/team (Crew Lead)</span>
                                   </label>
                                </div>

                                {formData.isCrewPost && (
                                   <div className="md:col-span-2 space-y-4 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[24px] border border-slate-200/60 dark:border-slate-800">
                                      <h4 className="text-sm font-black uppercase text-slate-400 tracking-wider">Crew Members</h4>
                                      
                                      {formData.crewMembers && formData.crewMembers.length > 0 && (
                                         <div className="space-y-3">
                                            {formData.crewMembers.map((member, idx) => (
                                               <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                                                  <div>
                                                     <p className="text-sm font-black text-primary dark:text-white">{member.name}</p>
                                                     <p className="text-xs text-slate-500 font-bold">{member.role} · {member.yearsOfExperience} yrs exp</p>
                                                  </div>
                                                  <button 
                                                     type="button" 
                                                     onClick={() => {
                                                        const updated = [...formData.crewMembers];
                                                        updated.splice(idx, 1);
                                                        setFormData({...formData, crewMembers: updated});
                                                     }}
                                                     className="p-2 hover:bg-red-50 text-red-500 hover:text-red-600 dark:hover:bg-red-950/20 rounded-xl transition-all"
                                                  >
                                                     <IconTrash size={18} />
                                                  </button>
                                               </div>
                                            ))}
                                         </div>
                                      )}

                                      {/* Form to add a new member */}
                                      <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                                         <p className="text-xs font-black uppercase text-slate-400">Add Crew Member</p>
                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <input 
                                               type="text" 
                                               id="new-member-name" 
                                               placeholder="Member Name" 
                                               className="w-full bg-slate-50 dark:bg-slate-850 border-none rounded-xl p-3 text-sm dark:text-white font-bold"
                                            />
                                            <input 
                                               type="text" 
                                               id="new-member-role" 
                                               placeholder="Role (e.g. Helper)" 
                                               className="w-full bg-slate-50 dark:bg-slate-855 border-none rounded-xl p-3 text-sm dark:text-white font-bold"
                                            />
                                            <input 
                                               type="number" 
                                               id="new-member-exp" 
                                               placeholder="Years Exp" 
                                               className="w-full bg-slate-50 dark:bg-slate-855 border-none rounded-xl p-3 text-sm dark:text-white font-bold"
                                            />
                                         </div>
                                         <button 
                                            type="button" 
                                            onClick={() => {
                                               const nameEl = document.getElementById('new-member-name');
                                               const roleEl = document.getElementById('new-member-role');
                                               const expEl = document.getElementById('new-member-exp');
                                               if (nameEl && roleEl && expEl) {
                                                  const name = nameEl.value.trim();
                                                  const role = roleEl.value.trim();
                                                  const exp = parseInt(expEl.value);
                                                  if (!name || !role || isNaN(exp)) {
                                                     toast.error('Please fill name, role and valid experience number for the crew member.');
                                                     return;
                                                  }
                                                  const updated = [...(formData.crewMembers || []), { name, role, yearsOfExperience: exp }];
                                                  setFormData({...formData, crewMembers: updated});
                                                  nameEl.value = '';
                                                  roleEl.value = '';
                                                  expEl.value = '';
                                               }
                                            }}
                                            className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-primary dark:text-white font-black rounded-xl text-xs transition-all"
                                         >
                                            + Add Member to List
                                         </button>
                                      </div>
                                   </div>
                                )}
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
                                <div>
                                   <label className="block text-xs font-black uppercase text-slate-400 mb-2">Upload Resume (PDF)</label>
                                   <label className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 cursor-pointer hover:border-accent transition-all">
                                      <IconUpload size={24} className="text-slate-400" />
                                      <span className="text-xs font-bold text-slate-500">{resume ? resume.name : 'Choose File'}</span>
                                      <input type="file" className="hidden" accept=".pdf" onChange={(e) => setResume(e.target.files[0])} />
                                   </label>
                                </div>
                                <div>
                                   <label className="block text-xs font-black uppercase text-slate-400 mb-2">Certificates (Max 5)</label>
                                   <label className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 cursor-pointer hover:border-accent transition-all">
                                      <IconUpload size={24} className="text-slate-400" />
                                      <span className="text-xs font-bold text-slate-500">{certificates.length > 0 ? `${certificates.length} files` : 'Choose Files'}</span>
                                      <input type="file" className="hidden" multiple accept="image/*,.pdf" onChange={(e) => setCertificates(Array.from(e.target.files))} />
                                   </label>
                                </div>
                             </div>

                             <div className="flex justify-end gap-4 pt-6">
                                <button type="button" onClick={() => setIsFormOpen(false)} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 rounded-2xl transition-all">Cancel</button>
                                <button type="submit" disabled={submitLoading} className="px-12 py-4 bg-accent text-white font-black rounded-2xl hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50">
                                   {submitLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <IconCircleCheck size={20} />} 
                                   {submitLoading ? 'Posting...' : (post ? 'Update Post' : 'Post Availability')}
                                </button>
                             </div>
                          </form>
                       </div>
                     </motion.div>
                   )}
                </AnimatePresence>
                ) : (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-[40px] p-8 text-center text-orange-800 dark:text-orange-200 flex flex-col items-center justify-center h-full">
                    <IconAlertTriangle size={64} className="mb-4 opacity-50" />
                    <h3 className="text-2xl font-black mb-2">Form Disabled</h3>
                    <p className="font-bold">You cannot post availability while serving a notice period.</p>
                  </div>
                )}
             </div>
          </div>
        </>
      )}

      {/* Join Confirmation Modal */}
      <AnimatePresence>
        {joinConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-[32px] max-w-md w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <IconCircleCheck size={32} />
              </div>
              <h2 className="text-2xl font-black text-center text-primary dark:text-white mb-4">Confirm Joining</h2>
              <p className="text-slate-500 text-center font-medium mb-8">Joining this position will automatically withdraw your other pending applications. Are you sure you want to join?</p>
              <div className="flex gap-4">
                <button onClick={() => setJoinConfirm(null)} className="flex-1 py-4 rounded-2xl font-black text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                <button onClick={() => handleJoinDirectHire(joinConfirm)} disabled={joinLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2">
                  {joinLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ResignationModal
        isOpen={isResignModalOpen}
        onClose={() => setIsResignModalOpen(false)}
        contractorName={workingStatus.contractorName}
        jobRole={user?.currentJobRole || user?.jobRole || 'Professional'}
        noticePeriodDays={workingStatus.noticePeriodDays}
        onSuccess={() => {
          fetchWorkingStatus();
          fetchProfileAndAvailability();
        }}
      />
    </div>
  );
};

export default AvailabilityTab;

