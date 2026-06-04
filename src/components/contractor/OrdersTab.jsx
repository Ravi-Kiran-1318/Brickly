import React, { useState, useEffect } from 'react';
import api from '../../api';
import { IconTruck, IconPackage, IconChevronRight, IconCircleCheck, IconCircleDashed } from '@tabler/icons-react';

const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/contractor/orders').then(res => {
      setOrders(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-black text-primary dark:text-white uppercase tracking-tight">Active Orders & Delivery</h2>
      
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          [1,2].map(i => <div key={i} className="h-44 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />)
        ) : orders.length > 0 ? orders.map((o) => (
          <div key={o._id} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all">
             <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                      <IconTruck size={32} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-primary dark:text-white uppercase tracking-tight">Order #{o._id.slice(-6).toUpperCase()}</h3>
                      <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{o.dealerId?.shopName}</p>
                   </div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row items-center gap-10">
                   {/* Progress Tracker */}
                   <div className="flex-1 flex items-center w-full px-4">
                      {['Pending', 'Confirmed', 'Dispatched', 'Delivered'].map((step, i, arr) => {
                        const statusIdx = arr.indexOf(o.status);
                        const isDone = i <= statusIdx;
                        const isCurrent = i === statusIdx;
                        return (
                          <React.Fragment key={step}>
                             <div className="flex flex-col items-center relative gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${isDone ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                   {isDone ? <IconCircleCheck size={18}/> : <IconCircleDashed size={18}/>}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-tight ${isCurrent ? 'text-primary dark:text-white' : 'text-slate-400'}`}>{step}</span>
                             </div>
                             {i < arr.length - 1 && <div className={`flex-1 h-1 mx-1 rounded-full ${i < statusIdx ? 'bg-green-500' : 'bg-slate-100 dark:bg-slate-800'}`} />}
                          </React.Fragment>
                        );
                      })}
                   </div>
                </div>

                <button className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary transition-all">
                   <IconChevronRight size={24} />
                </button>
             </div>
             
             {/* Order Footer */}
             <div className="px-8 py-5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                 <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span>Ordered: {new Date(o.createdAt).toLocaleDateString()}</span>
                    <div className="text-right">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Order Amount</span>
                       <span className="text-xl font-black text-accent">₹{o.totalAmount?.toLocaleString() || 'N/A'}</span>
                    </div>
                 </div>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                       <span>Item Details</span>
                       <span>Pricing</span>
                    </div>
                    {o.products?.map((p, i) => (
                      <div key={i} className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                         {p.productImage ? (
                           <img src={p.productImage} alt={p.productName} className="w-12 h-12 rounded-xl object-cover" />
                         ) : (
                           <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400">
                              <IconPackage size={20} />
                           </div>
                         )}
                         <div className="flex-1">
                            <h4 className="text-sm font-black text-primary dark:text-white uppercase truncate">{p.productName}</h4>
                            <p className="text-[11px] font-bold text-slate-400">{p.quantity} {p.unit}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-black text-accent">₹{p.subTotal?.toLocaleString() || (p.pricePerUnit * p.quantity)?.toLocaleString() || 'N/A'}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">₹{p.pricePerUnit?.toLocaleString() || 'N/A'} / unit</p>
                         </div>
                      </div>
                    ))}
                 </div>
             </div>
          </div>
        )) : (
          <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800">
             <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <IconTruck size={48} />
             </div>
             <h3 className="text-2xl font-black text-primary dark:text-white mb-2">No orders placed</h3>
             <p className="text-slate-400 max-w-sm mx-auto">Track your material deliveries here once you accept dealer quotes.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersTab;
