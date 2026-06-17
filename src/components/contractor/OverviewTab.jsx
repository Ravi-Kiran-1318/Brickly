import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion } from 'framer-motion';
import { 
  IconBriefcase, IconUsers, IconFileInvoice, IconBell,
  IconCheck, IconChevronRight, IconTrendingUp, IconCircleCheck, IconHammer,
  IconStar
} from '@tabler/icons-react';
import LeaveReviewModal from './LeaveReviewModal';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-4">
      <div className={`p-4 rounded-2xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-primary dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);

const OverviewTab = ({ setActiveTab }) => {
  const [stats, setStats] = useState(null);
  const [interests, setInterests] = useState([]);
  const [team, setTeam] = useState([]);
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewProfessional, setReviewProfessional] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, interestsRes, teamRes, portfolioRes] = await Promise.all([
          api.get('/api/contractor/stats'),
          api.get('/api/contractor/interests'),
          api.get('/api/contractor/team'),
          api.get('/api/contractor/portfolio')
        ]);
        setStats(statsRes.data);
        setInterests(interestsRes.data.slice(0, 5));
        setTeam(teamRes.data);
        setHasPortfolio(portfolioRes.data.length > 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    import('../../socket').then(({ default: socket }) => {
      const handleMemberResigned = (data) => {
        setStats(prev => prev ? { ...prev, hiredCount: Math.max(0, prev.hiredCount - 1) } : prev);
        setTeam(prev => prev.map(m => m._id === data.professionalId ? { 
          ...m, 
          isServingNotice: true, 
          noticeEndDate: data.noticeEndDate, 
          resignationReason: data.reason 
        } : m));
      };
      socket.on('contractor:teamMemberResigned', handleMemberResigned);
      return () => {
        socket.off('contractor:teamMemberResigned', handleMemberResigned);
      };
    });
  }, []);

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />)}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={IconBriefcase} label="Active Jobs" value={stats?.activeJobs || 0} color="bg-blue-600" />
        <StatCard icon={IconUsers} label="Team Size" value={stats?.hiredCount || 0} color="bg-cyan-600" />
        <StatCard icon={IconHammer} label="Active Projects" value={stats?.activeProjects || 0} color="bg-orange-600" />
        <StatCard icon={IconFileInvoice} label="Pending Quotes" value={stats?.pendingQuotes || 0} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Interest Requests */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-primary dark:text-white">Recent Customer Interest</h3>
            <button className="text-sm font-bold text-accent hover:underline flex items-center gap-1">
              See All <IconChevronRight size={16} />
            </button>
          </div>
          
          <div className="space-y-3">
            {interests.length > 0 ? interests.map((ir) => (
              <div key={ir._id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-accent transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                    <IconTrendingUp size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary dark:text-white">{ir.customerName}</h4>
                    <p className="text-xs text-slate-400">{ir.projectType} • {new Date(ir.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                    ir.status === 'Interested' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {ir.status}
                  </span>
                  {ir.status === 'Interested' && (
                    <button 
                      onClick={() => setActiveTab('Project Progress', { customerName: ir.customerName, projectType: ir.projectType })}
                      className="text-xs font-black text-accent hover:underline px-3 py-1 bg-accent/10 rounded-full"
                    >
                      Accept & Contract
                    </button>
                  )}
                </div>
              </div>
            )) : (
              <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 font-medium">No interest requests yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Setup Checklist */}
        <div className="bg-primary dark:bg-slate-900 p-8 rounded-[40px] text-white space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <IconCircleCheck size={120} />
          </div>
          <div>
            <h3 className="text-2xl font-black mb-2">Kickstart Growth</h3>
            <p className="text-blue-200 text-sm">Complete your profile to reach 2x more customers.</p>
          </div>
          
          <div className="space-y-4">
            {[
              { label: 'Complete your profile', done: true },
              { label: 'Post your first job', done: (stats?.activeJobs > 0 || stats?.hiredCount > 0) },
              { label: 'Upload portfolio', done: hasPortfolio },
              { label: 'Verify Phone', done: true },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${step.done ? 'bg-accent' : 'border-2 border-white/20'}`}>
                   {step.done && <IconCheck size={14} className="text-white" />}
                </div>
                <span className={`text-sm font-bold ${step.done ? 'text-white' : 'text-blue-100/40'}`}>{step.label}</span>
              </div>
            ))}
          </div>
          
          <button className="w-full py-4 bg-white text-primary rounded-2xl font-black hover:bg-slate-100 transition-colors mt-4">
            Complete Profile
          </button>
        </div>
      </div>

      {/* Team Overview */}
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-primary dark:text-white uppercase tracking-tight">Active Team Members</h3>
            <button onClick={() => setActiveTab('browse-professionals')} className="text-xs font-black text-accent p-2 bg-accent/10 rounded-xl hover:bg-accent hover:text-white transition-all tracking-widest uppercase">Hire More</button>
         </div>
         <div className="grid grid-cols-1 gap-6">
            {team.length > 0 ? team.map((member, i) => (
              <div key={member._id || i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-[32px] flex flex-col gap-4 hover:border-accent transition-all shadow-sm group">
                 <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-xl text-primary dark:text-white border border-slate-100 dark:border-slate-700 uppercase group-hover:scale-110 transition-transform">
                      {(member.name || member.professionalId?.name)?.charAt(0) || 'P'}
                   </div>
                   <div className="flex-1 min-w-0">
                      <h4 className="font-black text-primary dark:text-white truncate">{member.name || member.professionalId?.name || 'Unknown'}</h4>
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest">{member.jobRole || member.professionalId?.jobRole || 'Professional'}</p>
                      <div className="flex items-center gap-3 mt-1">
                         <div className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${(member.isServingNotice || member.professionalId?.isServingNotice) ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{(member.isServingNotice || member.professionalId?.isServingNotice) ? 'Serving Notice' : 'Active'}</span>
                         </div>
                         {(member.locationPreference || member.professionalId?.locationPreference) && (
                           <span className="text-[10px] font-bold text-slate-400 truncate">• {member.locationPreference || member.professionalId?.locationPreference}</span>
                         )}
                      </div>
                   </div>
                   <button
                      onClick={() => setReviewProfessional(member._id)}
                      className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center hover:bg-orange-100 hover:scale-110 transition-all shrink-0"
                      title="Leave a Review"
                   >
                      <IconStar size={20} />
                   </button>
                 </div>

                 {member.isServingNotice && (
                   <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4 mt-2">
                     <p className="text-sm font-bold text-yellow-600 mb-1">Resignation Request Received</p>
                     <p className="text-xs text-yellow-500 mb-4">Reason: {member.resignationReason}</p>
                     <p className="text-xs font-bold text-yellow-600 mb-4">
                       Notice period ends on {new Date(member.noticeEndDate).toLocaleDateString()}.
                     </p>
                     <div className="flex gap-2">
                       <button 
                         onClick={async () => {
                           try {
                             await api.post(`/api/contractor/resignation/${member._id}/request-stay`, { message: "Please stay with us, we value your work!" });
                             alert('Request sent to professional.');
                           } catch (err) { alert(err.response?.data?.message || 'Failed to send'); }
                         }}
                         className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black transition-all hover:bg-slate-200"
                       >
                         Request to Stay
                       </button>
                     </div>
                   </div>
                 )}
              </div>
            )) : (
              <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800">
                 <IconUsers size={40} className="mx-auto text-slate-300 mb-4" />
                 <p className="text-slate-400 font-bold">No active team members. Start hiring professionals.</p>
              </div>
            )}
         </div>
      </div>

      <LeaveReviewModal 
        isOpen={!!reviewProfessional}
        onClose={() => setReviewProfessional(null)}
        professional={reviewProfessional}
      />
    </div>
  );
};

export default OverviewTab;
