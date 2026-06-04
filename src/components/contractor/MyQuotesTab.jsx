import React, { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { IconFileInvoice, IconBuildingStore, IconClock, IconTag, IconCheck, IconX } from '@tabler/icons-react';

const MyQuotesTab = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const res = await api.get('/api/contractor/quotes');
      setQuotes(res.data);
    } catch (err) { toast.error("Failed to load quotes"); }
    finally { setLoading(false); }
  };

  const handleAccept = async (id) => {
    try {
      await api.put(`/api/contractor/quotes/${id}/accept`);
      toast.success("Quote accepted and Order created!");
      fetchQuotes();
    } catch (err) { toast.error("Failed to accept quote"); }
  };

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-primary dark:text-white uppercase tracking-tight">Material Quote Requests</h2>
      </div>

      <div className="space-y-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />)
        ) : quotes.length > 0 ? quotes.map((q) => (
          <div key={q._id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-accent transition-all">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-600">
                <IconFileInvoice size={30} />
              </div>
              <div>
                 <div className="flex items-center gap-2 mb-1">
                    <IconBuildingStore size={16} className="text-slate-400" />
                    <h3 className="font-black text-primary dark:text-white uppercase tracking-tight">{q.dealerId?.shopName || 'Dealer'}</h3>
                 </div>
                 <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                    <span>{q.products?.length} Items Requested</span>
                    <span>• {new Date(q.createdAt).toLocaleDateString()}</span>
                 </div>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                 q.status === 'Sent' ? 'bg-blue-50 text-blue-600' : 
                 q.status === 'Responded' ? 'bg-orange-50 text-orange-600' :
                 q.status === 'Accepted' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'
               }`}>
                 {q.status}
               </div>
               
               {q.status === 'Responded' && (
                 <button onClick={() => handleAccept(q._id)} className="flex-1 md:flex-none bg-accent text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/10">
                    Accept Quote
                 </button>
               )}
            </div>
          </div>
        )) : (
          <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800">
             <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <IconFileInvoice size={48} />
             </div>
             <h3 className="text-2xl font-black text-primary dark:text-white mb-2">No quotes yet</h3>
             <p className="text-slate-400 max-w-sm mx-auto">Start exploring materials and request price quotes from verified dealers.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyQuotesTab;
