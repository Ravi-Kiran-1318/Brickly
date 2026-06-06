import React, { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { IconBell, IconCheck, IconTrash, IconCircle, IconX, IconAlertTriangle } from '@tabler/icons-react';

const NotificationsTab = ({ setUnreadCount, setActiveTab }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/contractor/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.isRead).length);
    } catch (err) { toast.error("Failed to load notifications"); }
    finally { setLoading(false); }
  };

  const handleDeleteAll = async () => {
    try {
      await api.delete('/api/contractor/notifications/delete-all');
      setNotifications([]);
      setUnreadCount(0);
      setShowClearConfirm(false);
    } catch (err) { console.error(err); }
  };
  

  const handleReadAll = async () => {
    try {
      await api.put('/api/contractor/notifications/read-all');
      fetchNotifications();
    } catch (err) { toast.error("Failed to update status"); }
  };

  const handleReadOne = async (id) => {
    try {
       await api.put(`/api/contractor/notifications/${id}/read`);
       fetchNotifications();
    } catch (err) { }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await api.put(`/api/contractor/notifications/${notification._id}/read`);
        fetchNotifications();
      }
      if (notification.actionTab && setActiveTab) {
        setActiveTab(notification.actionTab);
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/contractor/notifications/${id}`);
      fetchNotifications();
    } catch (err) { }
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-primary dark:text-white uppercase tracking-tight">Notification Center</h2>
        <div className="flex gap-4">
          {notifications.some(n => !n.isRead) && (
            <button onClick={handleReadAll} className="text-sm font-bold text-accent hover:underline flex items-center gap-1.5 transition-all">
               <IconCheck size={18}/> Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={() => setShowClearConfirm(true)} className="text-sm font-bold text-red-500 hover:underline flex items-center gap-1.5 transition-all">
               <IconTrash size={18}/> Clear all
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)
        ) : notifications.length > 0 ? notifications.map((n) => (
          <div 
            key={n._id} 
            onClick={() => handleNotificationClick(n)}
            className={`p-6 rounded-[24px] border transition-all flex items-start gap-4 group cursor-pointer ${
              n.isRead ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 shadow-md shadow-blue-500/5'
            }`}
          >
             <div className="mt-1">
                {n.isRead ? <IconBell size={24} className="text-slate-300" /> : <IconCircle size={24} className="text-blue-500 fill-blue-500 animate-pulse" />}
             </div>
             <div className="flex-1">
                <p className={`font-black uppercase tracking-tight text-sm ${n.isRead ? 'text-slate-400' : 'text-primary dark:text-white'}`}>{n.title}</p>
                <p className={`mt-1 text-sm font-medium ${n.isRead ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>{n.message}</p>
                <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(n.createdAt).toLocaleString()}</p>
             </div>
             <button onClick={(e) => { e.stopPropagation(); handleDelete(n._id); }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all">
                <IconTrash size={20} />
             </button>
          </div>
        )) : (
          <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800">
             <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <IconBell size={48} />
             </div>
             <h3 className="text-2xl font-black text-primary dark:text-white mb-2">Inbox is empty</h3>
             <p className="text-slate-400">All caught up! New updates regarding your jobs, quotes, and orders will appear here.</p>
          </div>
        )}
      </div>
    
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 relative z-10 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <IconAlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-primary dark:text-white mb-2">Delete all notifications?</h3>
            <p className="text-slate-500 text-sm mb-8">This action cannot be undone. Are you sure you want to permanently delete all notifications?</p>
            <div className="flex gap-4">
               <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
               <button onClick={handleDeleteAll} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-red-600 transition-colors">Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  
  );
};

export default NotificationsTab;
