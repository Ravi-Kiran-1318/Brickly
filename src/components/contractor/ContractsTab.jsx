import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconPlus, IconCalendar, IconUser, IconHammer, 
  IconCheck, IconCircleCheck, IconClock, IconAlertTriangle,
  IconChevronDown, IconChevronUp, IconDotsVertical, IconTrash
} from '@tabler/icons-react';

const ContractsTab = ({ tabData, setTabData }) => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContract, setNewContract] = useState({
    customerName: '',
    projectType: '',
    startDate: '',
    estimatedEndDate: '',
    milestones: [{ title: '', category: '', description: '', targetDate: '', status: 'Pending' }]
  });

  useEffect(() => {
    fetchContracts();
    if (tabData) {
      setNewContract(prev => ({
        ...prev,
        customerName: tabData.customerName || '',
        projectType: tabData.projectType || ''
      }));
      setIsModalOpen(true);
      setTabData(null); // Clear after use
    }
  }, [tabData]);

  const fetchContracts = async () => {
    try {
      const res = await api.get('/api/contracts/my-contracts');
      setContracts(res.data);
    } catch (err) {
      console.error('Error fetching contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/api/contracts', newContract);
      setContracts([res.data, ...contracts]);
      setIsModalOpen(false);
      setNewContract({
        customerName: '',
        projectType: '',
        startDate: '',
        estimatedEndDate: '',
        milestones: [{ title: '', category: '', description: '', targetDate: '', status: 'Pending' }]
      });
    } catch (err) {
      console.error('Error creating contract:', err);
    }
  };

  const updateMilestone = async (contractId, milestoneId, status) => {
    try {
      const res = await api.patch(`/api/contracts/${contractId}/milestones/${milestoneId}`, { status });
      setContracts(contracts.map(c => c._id === contractId ? res.data : c));
    } catch (err) {
      console.error('Error updating milestone:', err);
    }
  };

  const completeProject = async (contractId) => {
    try {
      const res = await api.post(`/api/contracts/${contractId}/complete`);
      setContracts(contracts.map(c => c._id === contractId ? res.data : c));
    } catch (err) {
      console.error('Error completing project:', err);
    }
  };

  const addMilestoneField = () => {
    if (newContract.milestones.length < 10) {
      setNewContract({
        ...newContract,
        milestones: [...newContract.milestones, { title: '', category: '', description: '', targetDate: '', status: 'Pending' }]
      });
    }
  };

  const handleMilestoneChange = (index, field, value) => {
    const updatedMilestones = [...newContract.milestones];
    updatedMilestones[index][field] = value;
    setNewContract({ ...newContract, milestones: updatedMilestones });
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading contracts...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-primary dark:text-white">Active Projects</h2>
          <p className="text-sm text-slate-400">Track milestones and progress for all your contracts.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-accent text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:shadow-lg hover:shadow-orange-500/20 transition-all"
        >
          <IconPlus size={20} /> Create Contract
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {contracts.length > 0 ? contracts.map((contract) => (
          <ContractCard 
            key={contract._id} 
            contract={contract} 
            onUpdateMilestone={updateMilestone}
            onComplete={completeProject}
          />
        )) : (
          <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-6">
              <IconHammer size={40} />
            </div>
            <h3 className="text-xl font-bold text-primary dark:text-white mb-2">No Contracts Yet</h3>
            <p className="text-slate-400 max-w-sm mx-auto">Start by creating a contract to track your project progress and keep your customers updated.</p>
          </div>
        )}
      </div>

      {/* Create Contract Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-2xl font-black text-primary dark:text-white">New Contract</h3>
              </div>
              
              <form onSubmit={handleCreateContract} className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Customer Name</label>
                    <input 
                      type="text" required
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={newContract.customerName}
                      onChange={(e) => setNewContract({...newContract, customerName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Project Type</label>
                    <input 
                      type="text" required
                      placeholder="e.g. Home Renovation"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={newContract.projectType}
                      onChange={(e) => setNewContract({...newContract, projectType: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Start Date</label>
                    <input 
                      type="date" required
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={newContract.startDate}
                      onChange={(e) => setNewContract({...newContract, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Estimated End Date</label>
                    <input 
                      type="date" required
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={newContract.estimatedEndDate}
                      onChange={(e) => setNewContract({...newContract, estimatedEndDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-primary dark:text-white">Milestones (Max 10)</h4>
                    <button 
                      type="button" onClick={addMilestoneField}
                      className="text-xs font-black text-accent uppercase hover:underline"
                    >
                      + Add Milestone
                    </button>
                  </div>
                  
                  {newContract.milestones.map((m, i) => (
                    <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input 
                          type="text" required placeholder="Milestone Title"
                          className="w-full bg-white dark:bg-slate-700 border-none rounded-xl p-3 text-sm dark:text-white"
                          value={m.title}
                          onChange={(e) => handleMilestoneChange(i, 'title', e.target.value)}
                        />
                        <select 
                          className="w-full bg-white dark:bg-slate-700 border-none rounded-xl p-3 text-sm dark:text-white"
                          value={m.category}
                          onChange={(e) => handleMilestoneChange(i, 'category', e.target.value)}
                        >
                          <option value="">Select Category</option>
                          <option value="Plumbing">Plumbing</option>
                          <option value="Wiring">Wiring</option>
                          <option value="Painting">Painting</option>
                          <option value="Masonry">Masonry</option>
                          <option value="Flooring">Flooring</option>
                          <option value="Other">Other</option>
                        </select>
                        <input 
                          type="date" required
                          className="w-full bg-white dark:bg-slate-700 border-none rounded-xl p-3 text-sm dark:text-white"
                          value={m.targetDate}
                          onChange={(e) => handleMilestoneChange(i, 'targetDate', e.target.value)}
                        />
                      </div>
                      <textarea 
                        placeholder="Description (Optional)"
                        className="w-full bg-white dark:bg-slate-700 border-none rounded-xl p-3 text-sm dark:text-white h-16 resize-none"
                        value={m.description}
                        onChange={(e) => handleMilestoneChange(i, 'description', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </form>

              <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateContract}
                  className="flex-1 py-4 bg-accent text-white font-black rounded-2xl hover:shadow-lg hover:shadow-orange-500/20 transition-all"
                >
                  Launch Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ContractCard = ({ contract, onUpdateMilestone, onComplete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isOverdue = new Date() > new Date(contract.estimatedEndDate) && contract.status !== 'Completed';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <IconHammer size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-black text-primary dark:text-white">{contract.projectType}</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  contract.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {contract.status}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-500 flex items-center gap-2">
                <IconUser size={16} /> {contract.customerName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
            <div className="flex items-center gap-2 text-slate-400 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl">
              <IconCalendar size={18} />
              <span>{new Date(contract.startDate).toLocaleDateString()} — {new Date(contract.estimatedEndDate).toLocaleDateString()}</span>
            </div>
            {isOverdue && (
              <div className="flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-xl animate-pulse">
                <IconAlertTriangle size={18} />
                <span>Overdue</span>
              </div>
            )}
            {contract.status !== 'Completed' && (
              <button 
                onClick={() => onComplete(contract._id)}
                className="bg-primary text-white px-6 py-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Mark Project Complete
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm font-black">
            <span className="text-primary dark:text-white uppercase tracking-widest">Progress</span>
            <span className="text-accent">{contract.progressPercent}%</span>
          </div>
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${contract.progressPercent}%` }}
              className={`h-full bg-accent rounded-full ${contract.progressPercent === 100 ? 'bg-green-500' : ''}`}
            />
          </div>
        </div>

        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-8 w-full py-4 bg-slate-50 dark:bg-white/5 rounded-2xl text-sm font-bold text-slate-500 flex items-center justify-center gap-2 hover:text-primary transition-colors"
        >
          {isExpanded ? (
            <>Hide Milestones <IconChevronUp size={20} /></>
          ) : (
            <>View Milestones & Tracker <IconChevronDown size={20} /></>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-8"
          >
            <div className="space-y-6">
              {contract.milestones.map((milestone, idx) => (
                <div key={milestone._id} className="flex gap-6 relative group">
                  {/* Timeline Line */}
                  {idx !== contract.milestones.length - 1 && (
                    <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800" />
                  )}
                  
                  {/* Status Indicator */}
                  <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center z-10 ${
                    milestone.status === 'Done' ? 'bg-green-500 text-white' : 
                    milestone.status === 'In Progress' ? 'bg-blue-500 text-white' : 
                    'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {milestone.status === 'Done' ? <IconCheck size={20} /> : idx + 1}
                  </div>

                  <div className="flex-1 pb-8">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex flex-col">
                          <h4 className="font-black text-primary dark:text-white uppercase tracking-tight">{milestone.title}</h4>
                          {milestone.category && <span className="text-[10px] font-black text-accent uppercase tracking-widest">{milestone.category}</span>}
                       </div>
                       <div className="flex gap-2">
                        {['Pending', 'In Progress', 'Done'].map(status => (
                          <button
                            key={status}
                            onClick={() => onUpdateMilestone(contract._id, milestone._id, status)}
                            className={`text-[9px] font-black uppercase px-2 py-1 rounded-md transition-all ${
                              milestone.status === status ? 
                              (status === 'Done' ? 'bg-green-100 text-green-600' : 
                               status === 'In Progress' ? 'bg-blue-100 text-blue-600' : 
                               'bg-slate-200 text-slate-600') : 
                              'bg-transparent text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">{milestone.description}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                      <IconClock size={12} /> Target: {new Date(milestone.targetDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContractsTab;
