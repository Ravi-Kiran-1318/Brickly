import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion } from 'framer-motion';
import { 
  IconPackage, IconFileInvoice, IconTruck, IconTag,
  IconCircleCheck, IconAlertTriangle, IconChevronRight, IconTrendingUp, IconStarFilled, IconShieldCheck
} from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import socket from '../../socket';

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
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentQuotes, setRecentQuotes] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const [statsRes, quotesRes, stockRes] = await Promise.all([
          api.get('/api/dealer/stats'),
          api.get('/api/dealer/quotes'),
          api.get('/api/dealer/products')
        ]);
        setStats(statsRes.data);
        setRecentQuotes(quotesRes.data.slice(0, 3));
        setLowStockProducts(stockRes.data.filter(p => p.stockQuantity <= p.lowStockThreshold));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();

    socket.on('dealer:newReview', fetchOverview);

    return () => {
      socket.off('dealer:newReview', fetchOverview);
    };
  }, []);

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />)}
    </div>
  </div>;

  return (
    <div className="space-y-8">
      {/* Welcome & Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-primary dark:text-white">Business Overview</h2>
          <p className="text-slate-500 font-medium">Monitoring your shop's performance.</p>
        </div>
        {user?.gstNumber && (
          <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-2xl border border-green-500/20">
            <IconCircleCheck size={20} />
            <span className="font-black text-sm uppercase tracking-widest">GST Verified</span>
          </div>
        )}
      </div>

      {/* Rating Summary Card */}
      {stats?.ratings && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[32px] shadow-sm">
           <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="text-center md:border-r border-slate-200 dark:border-slate-800 md:pr-10 shrink-0">
                 <div className="flex items-center justify-center gap-2 text-accent mb-2">
                    <IconStarFilled size={48} />
                    <span className="text-6xl font-black">{stats.ratings.averageRating.toFixed(1)}</span>
                 </div>
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{stats.ratings.totalReviews} Reviews</p>
                 <div className="flex items-center justify-center gap-1 mt-3 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    <IconShieldCheck size={14} /> Verified Purchases Only
                 </div>
              </div>

              <div className="flex-1 w-full space-y-4">
                 {[
                   { label: 'Product Quality', value: stats.ratings.averageProductQuality },
                   { label: 'Delivery Speed', value: stats.ratings.averageDeliverySpeed },
                   { label: 'Communication', value: stats.ratings.averageCommunication }
                 ].map((bar, i) => (
                   <div key={i} className="flex items-center gap-4">
                      <span className="w-32 text-xs font-black text-slate-400 uppercase tracking-widest">{bar.label}</span>
                      <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }} animate={{ width: `${(bar.value / 5) * 100}%` }} 
                           className="h-full bg-accent rounded-full"
                         />
                      </div>
                      <span className="w-8 text-right text-sm font-black text-primary dark:text-white">{bar.value.toFixed(1)}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={IconPackage} label="Total Products" value={stats?.totalProducts || 0} color="bg-blue-600" />
        <StatCard icon={IconFileInvoice} label="Quote Requests" value={stats?.totalQuoteRequests || 0} color="bg-orange-600" />
        <StatCard icon={IconTruck} label="Active Orders" value={stats?.totalActiveOrders || 0} color="bg-purple-600" />
        <StatCard icon={IconTag} label="Active Deals" value={stats?.totalActiveDeals || 0} color="bg-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Quotes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black text-primary dark:text-white">Recent Quote Requests</h3>
            <button 
              onClick={() => setActiveTab('Quote Requests')}
              className="text-sm font-bold text-accent hover:underline flex items-center gap-1"
            >
              See Inbox <IconChevronRight size={16} />
            </button>
          </div>
          
          <div className="space-y-3">
            {recentQuotes.length > 0 ? recentQuotes.map((q) => (
              <div key={q._id} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between group hover:border-accent transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                    <IconTrendingUp size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary dark:text-white">{q.contractorId?.name || 'Contractor'}</h4>
                    <p className="text-xs text-slate-400">{q.products?.length} Products • {new Date(q.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                  q.status === 'Sent' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                }`}>
                  {q.status}
                </span>
              </div>
            )) : (
              <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-medium">
                No recent quote requests.
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="space-y-4">
          <h3 className="text-xl font-black text-primary dark:text-white flex items-center gap-2">
            Low Stock Alerts <IconAlertTriangle size={24} className="text-orange-500" />
          </h3>
          <div className="space-y-3">
            {lowStockProducts.length > 0 ? lowStockProducts.map((p) => (
              <div key={p._id} className="bg-orange-500/5 border border-orange-500/20 rounded-3xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center shrink-0">
                  <IconPackage size={20} />
                </div>
                <div className="flex-1 min-w-0">
                   <h4 className="text-sm font-bold text-primary dark:text-white truncate">{p.name}</h4>
                   <p className="text-xs text-orange-600 font-bold">{p.stockQuantity} {p.unit} left</p>
                </div>
                <button 
                  onClick={() => setActiveTab('Inventory')}
                  className="text-[10px] font-black uppercase text-orange-600 bg-orange-100 px-2 py-1 rounded-lg hover:bg-orange-200 transition-colors"
                >
                  Restock
                </button>
              </div>
            )) : (
              <div className="p-8 text-center bg-green-500/5 border border-dashed border-green-500/20 rounded-3xl text-green-600 font-bold text-sm">
                 All products well stocked!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
