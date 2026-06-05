import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconFileInvoice, IconMapPin, IconCalendarTime, IconUser, 
  IconCheck, IconX, IconCornerDownRight, IconClock, IconCircleCheck
} from '@tabler/icons-react';

const QUICK_TEMPLATES = [
  "Available and ready for immediate delivery.",
  "Competitive pricing for bulk order. Valid for 7 days.",
  "Currently in stock. Can dispatch within 24 hours of confirmation."
];

const QuotesInboxTab = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  
  const [responseForm, setResponseForm] = useState({
    customPrice: 0,
    products: [],
    deliveryTimeline: '',
    quoteExpiryDate: '',
    message: ''
  });

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const res = await api.get('/api/dealer/quotes');
      setQuotes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQuote = async (quote) => {
    setSelectedQuote(quote);
    
    // Fetch dealer's inventory products and active deals to auto-calculate prices
    let inventoryProducts = [];
    let activeDeals = [];
    try {
      const [productsRes, dealsRes] = await Promise.all([
        api.get('/api/dealer/products'),
        api.get('/api/dealer/deals')
      ]);
      inventoryProducts = productsRes.data;
      activeDeals = dealsRes.data.filter(d => new Date(d.validUntil) > new Date());
    } catch (err) {
      console.error('Failed to fetch inventory/deals for pricing:', err);
    }

    const initialProducts = quote.products.map(p => {
      const populatedProduct = p.productId;
      const productId = populatedProduct?._id || p.productId;
      const productName = p.productName
        || populatedProduct?.name || '';

      // Step 1: Get base inventory price
      const inventoryMatch = inventoryProducts.find(
        inv =>
          String(inv._id) === String(productId) ||
          inv.name.toLowerCase().trim() ===
            productName.toLowerCase().trim()
      );
      const inventoryPrice = inventoryMatch
        ? Number(inventoryMatch.pricePerUnit)
        : (Number(p.unitPrice) || Number(populatedProduct?.pricePerUnit) || 0);

      // Step 2: Determine effective price
      // RULE: if isDeal=true AND dealPrice exists → ALWAYS use dealPrice
      //       No fallback, no override. Period.
      let bestPrice    = inventoryPrice;
      let dealApplied  = false;
      let dealDiscount = 0;

      if (p.isDeal && p.dealPrice && Number(p.dealPrice) > 0) {
        // ── DEAL PRODUCT ──
        // Use the exact dealPrice saved in the quote request
        bestPrice    = Number(p.dealPrice);
        dealApplied  = true;
        // Discount per unit = inventory price - deal price
        dealDiscount = inventoryPrice > 0
          ? inventoryPrice - bestPrice
          : (Number(p.unitPrice) > 0
              ? Number(p.unitPrice) - bestPrice
              : 0);

      } else if (!p.isDeal) {
        // ── REGULAR PRODUCT (not a deal) ──
        // Check if there is an active deal for this product
        // as a convenience — only apply if qty meets MOQ
        const dealMatch = activeDeals.find(d =>
          d.productName.toLowerCase().trim() ===
            productName.toLowerCase().trim() &&
          Number(p.quantity) >= Number(d.minimumQuantity)
        );
        if (dealMatch) {
          bestPrice    = Number(dealMatch.discountedPrice);
          dealApplied  = true;
          dealDiscount = Number(dealMatch.originalPrice)
            - Number(dealMatch.discountedPrice);
        }
        // else: bestPrice stays as inventoryPrice — no change
      }
      // Note: if p.isDeal=true but dealPrice is 0/missing,
      // bestPrice stays as inventoryPrice (safe fallback)

      return {
        productId,
        pricePerUnit:   bestPrice,
        productName,
        quantity:       Number(p.quantity),
        unit:           p.unit || populatedProduct?.unit || '',
        productImage:   populatedProduct?.imageUrl || '',
        inventoryPrice,
        dealApplied,
        dealDiscount,
        // Preserve original deal info for display
        isDeal:         p.isDeal || false,
        dealPrice:      p.dealPrice || null,
        originalUnitPrice: p.unitPrice || inventoryPrice,
      };
    });

    // Total = sum of (pricePerUnit × quantity) for all products
    // CORRECT: deal products use dealPrice, regular use inventoryPrice
    const initialTotal = initialProducts.reduce(
      (sum, p) => sum + (p.pricePerUnit * p.quantity),
      0
    );

    setResponseForm({
      customPrice:      initialTotal,
      products:         initialProducts,
      deliveryTimeline: '',
      quoteExpiryDate:  '',
      message:          '',
    });
    
    if (quote.status === 'Sent') {
      try {
        await api.put(`/api/dealer/quotes/${quote._id}/viewed`);
        setQuotes(quotes.map(q => q._id === quote._id ? { ...q, status: 'Viewed' } : q));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleRespond = async (e) => {
    e.preventDefault();
    
    // BUG ONE Safeguard: Check for zero prices
    const hasZeroPrice = responseForm.products.some(p => p.pricePerUnit <= 0);
    if (hasZeroPrice) {
      toast.error("Please enter price for all products before submitting.");
      return;
    }

    try {
      await api.post(`/api/dealer/quotes/${selectedQuote._id}/respond`, responseForm);
      setQuotes(quotes.map(q => q._id === selectedQuote._id ? { ...q, status: 'Responded' } : q));
      setIsResponseModalOpen(false);
      setResponseForm({ customPrice: 0, products: [], deliveryTimeline: '', quoteExpiryDate: '', message: '' });
      setSelectedQuote(null);
      // Toast notification would be nice
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenResponse = async (quote) => {
    setIsResponseModalOpen(true);
    await handleOpenQuote(quote);
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading Quote Requests...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Quotes List */}
      <div className="lg:col-span-12 space-y-4">
        {quotes.length > 0 ? quotes.map(quote => (
          <QuoteCard 
            key={quote._id} 
            quote={quote} 
            isSelected={selectedQuote?._id === quote._id}
            onOpen={() => handleOpenQuote(quote)}
            onRespond={() => handleOpenResponse(quote)}
          />
        )) : (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <IconFileInvoice size={60} className="mx-auto text-slate-300 mb-4" />
             <p className="text-slate-400 font-bold">Your quote inbox is empty.</p>
          </div>
        )}
      </div>

      {/* Response Modal */}
      <AnimatePresence>
        {isResponseModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsResponseModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[40px] shadow-2xl relative overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-2xl font-black text-primary dark:text-white">Respond to Quote</h3>
                <p className="text-slate-400 text-sm">Send your best pricing and timeline to {selectedQuote?.contractorId?.name}.</p>
              </div>

              <form onSubmit={handleRespond} className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2 space-y-4">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400">Item Pricing breakdown</label>
                    <div className="space-y-3">
                      {responseForm.products.map((p, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className={`flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border transition-all ${p.pricePerUnit <= 0 ? 'border-red-200 dark:border-red-900/30 bg-red-50/30' : p.dealApplied ? 'border-green-200 dark:border-green-900/30 bg-green-50/30 dark:bg-green-950/10' : 'border-slate-100 dark:border-slate-700'}`}>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-primary dark:text-white truncate">{p.productName}</p>
                                {p.dealApplied && (
                                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-green-500 text-white rounded-md">Deal</span>
                                )}
                              </div>
                              <p className="text-[10px] font-black text-slate-400 uppercase">{p.quantity} {p.unit}</p>
                              {p.dealApplied && p.inventoryPrice > 0 && (
                                <p className="text-[9px] text-green-600 font-bold mt-0.5">
                                  MRP <span className="line-through">₹{p.inventoryPrice}</span> → ₹{p.pricePerUnit} 
                                  <span className="ml-1">(Save ₹{p.dealDiscount}/unit)</span>
                                </p>
                              )}
                              {!p.dealApplied && p.inventoryPrice > 0 && (
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                  Inventory Price: ₹{p.inventoryPrice}/unit
                                </p>
                              )}
                            </div>
                            <div className="w-32">
                              <input 
                                type="number" required placeholder="Price/Unit"
                                className={`w-full bg-white dark:bg-slate-700 border-none rounded-xl p-2 text-sm font-bold dark:text-white ${p.pricePerUnit <= 0 ? 'ring-1 ring-red-400' : ''}`}
                                value={p.pricePerUnit}
                                onChange={(e) => {
                                  const newProds = [...responseForm.products];
                                  newProds[idx].pricePerUnit = parseFloat(e.target.value) || 0;
                                  newProds[idx].dealApplied = false; // Manual override clears deal flag
                                  const newTotal = newProds.reduce((sum, curr) => sum + (curr.pricePerUnit * curr.quantity), 0);
                                  setResponseForm({ ...responseForm, products: newProds, customPrice: newTotal });
                                }}
                              />
                            </div>
                          </div>
                          {p.pricePerUnit <= 0 && (
                            <p className="text-[9px] font-black text-red-500 uppercase ml-2">Please enter a valid price for this item</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Total Quote Price (INR)</label>
                    <div className="w-full bg-accent/5 dark:bg-accent/10 border border-accent/20 rounded-2xl p-4">
                       <span className="text-2xl font-black text-accent">₹ {responseForm.customPrice.toLocaleString()}</span>
                       <p className="text-[10px] font-bold text-accent/60 uppercase tracking-widest mt-1">Calculated Total</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Delivery Timeline</label>
                    <input 
                      type="text" required placeholder="e.g. 2-3 Days"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                      value={responseForm.deliveryTimeline} onChange={(e) => setResponseForm({...responseForm, deliveryTimeline: e.target.value})}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Quote Valid Until</label>
                    <input 
                      type="date" required
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                      value={responseForm.quoteExpiryDate} onChange={(e) => setResponseForm({...responseForm, quoteExpiryDate: e.target.value})}
                    />
                  </div>
                  <div className="sm:col-span-2">
                     <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400">Message (Optional)</label>
                        <div className="flex gap-2">
                           {QUICK_TEMPLATES.map((tmpl, idx) => (
                             <button 
                                key={idx} type="button" 
                                onClick={() => setResponseForm({...responseForm, message: tmpl})}
                                className="text-[9px] font-black uppercase px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md hover:bg-accent hover:text-white transition-all"
                             >
                                Template {idx + 1}
                             </button>
                           ))}
                        </div>
                     </div>
                     <textarea 
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white h-24 resize-none"
                        value={responseForm.message} onChange={(e) => setResponseForm({...responseForm, message: e.target.value})}
                     />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <button 
                     type="button" onClick={() => setIsResponseModalOpen(false)}
                     className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     className="flex-1 py-4 bg-accent text-white font-black rounded-2xl hover:shadow-lg hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                   >
                     <IconCornerDownRight size={20} /> Send Response
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const QuoteCard = ({ quote, isSelected, onOpen, onRespond }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-[35px] border transition-all overflow-hidden shadow-sm ${
      isSelected ? 'border-accent ring-1 ring-accent' : 'border-slate-200 dark:border-slate-800'
    }`}>
      <div 
        className="p-6 cursor-pointer" 
        onClick={() => { setIsExpanded(!isExpanded); onOpen(); }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-primary dark:text-blue-100 shrink-0">
               <IconUser size={28} />
            </div>
            <div>
               <h4 className="font-black text-lg text-primary dark:text-white">{quote.contractorId?.companyName || quote.contractorId?.name}</h4>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1"><IconMapPin size={14} /> {quote.deliveryAddress}</span>
                  <span>•</span>
                  <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl ${
               quote.status === 'Sent' ? 'bg-slate-100 text-slate-400 border border-slate-200' :
               quote.status === 'Viewed' ? 'bg-blue-100 text-blue-600 border border-blue-200' :
               quote.status === 'Responded' ? 'bg-orange-100 text-orange-600' :
               quote.status === 'Accepted' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
             }`}>
               {quote.status === 'Sent' ? 'New Request' : quote.status}
             </span>
             {quote.status !== 'Responded' && quote.status !== 'Accepted' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onRespond(); }}
                  className="bg-accent text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-orange-500/10 hover:scale-105 active:scale-95 transition-all"
                >
                  Respond
                </button>
             )}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-3">
                   <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requested Products</h5>
                   {quote.products.map((p, i) => (
                     <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 pr-2 overflow-hidden">
                           <span className="text-sm font-bold text-primary dark:text-blue-100 truncate">{p.productName}</span>
                           {p.isDeal && (
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-green-500 text-white rounded-md shrink-0">Deal</span>
                           )}
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                           <span className="text-xs font-black text-accent">{p.quantity} {p.unit}</span>
                           {p.isDeal && p.dealPrice && (
                              <span className="text-[10px] font-bold text-green-600">₹{p.dealPrice}/unit</span>
                           )}
                        </div>
                     </div>
                   ))}
                </div>

                <div className="space-y-4">
                   <div>
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Project Timeline</h5>
                      <div className="flex items-center gap-2 text-sm font-bold text-primary dark:text-white bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100/20">
                         <IconClock size={16} className="text-blue-500" />
                         {quote.projectTimeline}
                      </div>
                   </div>
                   {quote.message && (
                     <div>
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Message</h5>
                        <div className="text-sm font-medium text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                           "{quote.message}"
                        </div>
                     </div>
                   )}
                </div>

                <div className="space-y-3">
                   <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Details</h5>
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-2">
                      <p className="text-xs font-bold text-slate-400">Name: <span className="text-primary dark:text-white">{quote.contractorId?.name}</span></p>
                      <p className="text-xs font-bold text-slate-400">Phone: <span className="text-primary dark:text-white">{quote.contractorId?.phone}</span></p>
                      <p className="text-xs font-bold text-slate-400">Email: <span className="text-primary dark:text-white truncate block">{quote.contractorId?.email}</span></p>
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuotesInboxTab;
