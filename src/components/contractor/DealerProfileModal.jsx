import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconX, IconMapPin, IconPhone, IconPackage, 
  IconChevronRight, IconCheck, IconStarFilled, IconShieldCheck, IconMessageCircle
} from '@tabler/icons-react';
import api from '../../api';
import toast from 'react-hot-toast';

const DealerProfileModal = ({ isOpen, onClose, dealerData, initialProduct = null }) => {
  const [quoteModal, setQuoteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moqWarning, setMoqWarning] = useState(false);
  const [moqRequired, setMoqRequired] = useState(0);
  const [moqProductName, setMoqProductName] = useState('');
  const [quoteForm, setQuoteForm] = useState({ 
    products: [], 
    address: '', 
    timeline: '', 
    message: '' 
  });
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialProduct) {
        // Resolve productId from dealer's products if missing
        let actualProductId = initialProduct.productId;
        if (!actualProductId && dealerData?.products) {
          const match = dealerData.products.find(p => p.name.toLowerCase() === initialProduct.productName.toLowerCase());
          if (match) actualProductId = match._id;
        }

        const productToSet = { 
          productName: initialProduct.productName, 
          quantity: initialProduct.minQuantity || 1, 
          unit: initialProduct.unit || 'unit',
          isDeal: initialProduct.isDeal || false,
          dealId: initialProduct.dealId || null,
          dealPrice: initialProduct.dealPrice || null,
          unitPrice: initialProduct.unitPrice || null
        };
        if (actualProductId) productToSet.productId = actualProductId;

        setQuoteForm({
          products: [productToSet],
          address: '',
          timeline: '',
          message: `Interested in deal for ${initialProduct.productName}`
        });
        setQuoteModal(true);
      } else {
        setQuoteForm({ products: [], address: '', timeline: '', message: '' });
        setQuoteModal(false);
      }
    }
  }, [isOpen, initialProduct]);

  if (!dealerData) return null;

  const submitQuoteRequest = async ({ skipDeal = false } = {}) => {
    // Guard against double submission
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payloadProducts = quoteForm.products.map(p => ({
        ...p,
        isDeal: skipDeal ? false : (p.isDeal || false),
        dealId: skipDeal ? null : (p.dealId || null),
        dealPrice: skipDeal ? null : (p.dealPrice || null),
      }));

      await api.post('/api/contractor/quotes', {
        dealerId: dealerData.dealer._id,
        products: payloadProducts,
        deliveryAddress: quoteForm.address,
        projectTimeline: quoteForm.timeline,
        message: quoteForm.message
      });
      toast.success("Quote request sent!");
      setQuoteModal(false);
      onClose();
    } catch (err) {
      toast.error("Failed to send quote");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();

    if (quoteForm.products.length === 0) {
      return toast.error('Select at least one product');
    }

    // Check MOQ for each product in the quote
    for (const p of quoteForm.products) {

      // Only validate deal products (isDeal=true)
      if (!p.isDeal) continue;

      let moq = 0;

      // Source 1: match by dealId in dealerData.deals
      if (p.dealId && dealerData?.deals?.length > 0) {
        const dealById = dealerData.deals.find(
          d => String(d._id) === String(p.dealId)
        );
        if (dealById) moq = Number(dealById.minimumQuantity) || 0;
      }

      // Source 2: match by product name (case-insensitive)
      if (moq === 0 && dealerData?.deals?.length > 0) {
        const dealByName = dealerData.deals.find(
          d =>
            d.productName.toLowerCase().trim() ===
            (p.productName || '').toLowerCase().trim()
        );
        if (dealByName) moq = Number(dealByName.minimumQuantity) || 0;
      }

      // Source 3: initialProduct carries minQuantity from Grab Deal
      // This is the PRIMARY source when coming from DealsFeedTab
      if (moq === 0 && initialProduct?.minQuantity) {
        const sameProduct =
          (p.productName || '').toLowerCase().trim() ===
          (initialProduct.productName || '').toLowerCase().trim();
        if (sameProduct) {
          moq = Number(initialProduct.minQuantity) || 0;
        }
      }

      // Source 4: dealPrice exists in p — use dealId from p
      // to cross-check against initialProduct.dealId
      if (moq === 0 && p.dealId && initialProduct?.dealId) {
        if (String(p.dealId) === String(initialProduct.dealId)) {
          moq = Number(initialProduct.minQuantity) || 0;
        }
      }

      // Validate quantity against MOQ
      if (moq > 0 && Number(p.quantity) < moq) {
        setMoqRequired(moq);
        setMoqProductName(p.productName);
        setMoqWarning(true);
        return; // stop submission — show popup
      }
    }

    // All valid — proceed
    submitQuoteRequest();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-primary/60 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white dark:bg-slate-950 w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {!quoteModal ? (
              <>
                <div className="bg-primary p-10 text-white relative">
                  <button type="button" onClick={onClose} className="absolute top-8 right-8 text-white/50 hover:text-white"><IconX size={24} /></button>
                  <h2 className="text-3xl font-black mb-2">{dealerData.dealer.shopName}</h2>
                  <div className="flex flex-wrap gap-6 text-sm text-blue-200 font-bold uppercase tracking-widest mt-4">
                    <span className="flex items-center gap-2"><IconMapPin size={18} /> {dealerData.dealer.address}</span>
                    <span className="flex items-center gap-2"><IconPhone size={18} /> {dealerData.dealer.phone}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                  {dealerData.deals?.length > 0 && (
                    <section>
                      <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4">Active Hot Deals</h4>
                      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {dealerData.deals.map(deal => (
                          <div key={deal._id} className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-5 rounded-3xl min-w-[280px]">
                            <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">MEGA DEAL</p>
                            <h5 className="font-black text-primary dark:text-white">{deal.productName}</h5>
                            <div className="mt-3 flex items-end gap-2">
                              <span className="text-xl font-black text-primary dark:text-white">₹{deal.discountedPrice}</span>
                              <span className="text-sm text-slate-400 line-through">₹{deal.originalPrice}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  <section>
                    <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-6">Product Inventory</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dealerData.products?.map(p => (
                        <div key={p._id} className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100 dark:border-slate-800">
                               {p.imageUrl ? (
                                 <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                               ) : (
                                 <IconPackage size={24}/>
                               )}
                            </div>
                            <div>
                              <p className="font-black text-primary dark:text-white uppercase tracking-tight">{p.name}</p>
                              <p className="text-xs font-bold text-slate-400">₹{p.pricePerUnit} / {p.unit}</p>
                            </div>
                          </div>
                          <div className={`text-[10px] font-black px-2 py-1 rounded-md ${p.inStock ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                            {p.inStock ? 'IN STOCK' : 'OUT OF STOCK'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {dealerData.reviews?.length > 0 && (
                    <section className="pt-6 border-t border-slate-100 dark:border-slate-800">
                       <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-6">Customer Reviews</h4>
                       
                       <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 mb-6 flex flex-col md:flex-row items-center gap-6 border border-slate-100 dark:border-slate-800">
                          <div className="text-center md:border-r border-slate-200 dark:border-slate-800 md:pr-6 shrink-0">
                             <div className="flex items-center justify-center gap-1 text-accent mb-1">
                                <IconStarFilled size={36} />
                                <span className="text-4xl font-black">{dealerData.dealer.averageRating?.toFixed(1) || '0.0'}</span>
                             </div>
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{dealerData.dealer.totalReviews || 0} Reviews</p>
                             <div className="mt-2 inline-flex items-center gap-1 bg-green-100 text-green-600 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest">
                                <IconShieldCheck size={12} /> Verified Purchases Only
                             </div>
                          </div>
                          <div className="flex-1 w-full space-y-2">
                             {[
                               { label: 'Product Quality', value: dealerData.dealer.averageProductQuality },
                               { label: 'Delivery Speed', value: dealerData.dealer.averageDeliverySpeed },
                               { label: 'Communication', value: dealerData.dealer.averageCommunication }
                             ].map((bar, i) => (
                               <div key={i} className="flex items-center gap-3">
                                  <span className="w-28 text-[10px] font-black text-slate-400 uppercase tracking-widest">{bar.label}</span>
                                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                     <div className="h-full bg-accent rounded-full" style={{ width: `${((bar.value || 0) / 5) * 100}%` }}></div>
                                  </div>
                                  <span className="w-6 text-right text-xs font-black text-primary dark:text-white">{(bar.value || 0).toFixed(1)}</span>
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-4">
                          {(showAllReviews ? dealerData.reviews : dealerData.reviews.slice(0, 5)).map(r => (
                             <div key={r._id} className="bg-white dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                   <div className="flex items-center gap-2">
                                      <h5 className="font-bold text-sm text-primary dark:text-white">{r.contractorId?.companyName || r.contractorId?.name}</h5>
                                      <span className="flex items-center gap-0.5 text-[10px] font-black text-accent"><IconStarFilled size={12}/> {r.overallRating.toFixed(1)}</span>
                                   </div>
                                   <span className="text-[10px] font-bold text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mb-3">{r.reviewText}</p>
                                {r.dealerReply && (
                                   <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-accent mb-1"><IconMessageCircle size={10} /> Dealer Reply</span>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">{r.dealerReply}</p>
                                   </div>
                                )}
                             </div>
                          ))}
                       </div>
                       
                       {dealerData.reviews.length > 5 && (
                          <button 
                            onClick={() => setShowAllReviews(!showAllReviews)}
                            className="mt-4 w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                          >
                            {showAllReviews ? 'Show Less' : `Show All ${dealerData.reviews.length} Reviews`}
                          </button>
                       )}
                    </section>
                  )}
                </div>
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <button type="button" onClick={() => setQuoteModal(true)} className="w-full py-5 bg-accent text-white rounded-3xl font-black flex items-center justify-center gap-3 shadow-xl shadow-orange-500/20 hover:bg-orange-600">
                    Request a Price Quote <IconChevronRight size={24} />
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="flex flex-col h-full bg-white dark:bg-slate-950">
                <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-2xl font-black text-primary dark:text-white">Request Quote from {dealerData.dealer.shopName}</h2>
                  <button type="button" onClick={() => setQuoteModal(false)} className="text-slate-400 hover:text-primary"><IconX size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 block">Select Products</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-medium">
                      {dealerData.products?.map(p => {
                        const isSelected = quoteForm.products.find(sp => sp.productId === p._id);
                        // Case-insensitive deal lookup
                        const productDeal = dealerData.deals?.find(
                          d =>
                            d.productName.toLowerCase().trim() ===
                            p.name.toLowerCase().trim()
                        );

                        // Resolve display values from productDeal OR initialProduct
                        const isThisInitialProduct =
                          (initialProduct?.productName || '').toLowerCase().trim() ===
                          p.name.toLowerCase().trim();

                        const displayDealPrice =
                          productDeal?.discountedPrice ??
                          (isThisInitialProduct ? initialProduct?.dealPrice : null);

                        const displayMinQty = (() => {
                          if (productDeal?.minimumQuantity) {
                            return Number(productDeal.minimumQuantity);
                          }
                          if (isThisInitialProduct && initialProduct?.minQuantity) {
                            return Number(initialProduct.minQuantity);
                          }
                          return 1;
                        })();

                        const hasDealInfo = !!(productDeal || (isThisInitialProduct && initialProduct?.isDeal));
                        
                        return (
                          <div key={p._id} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-accent bg-orange-50 dark:bg-orange-950/20' : 'border-slate-50 dark:border-slate-900 bg-slate-50 dark:bg-slate-900'}`}>
                            <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => {
                              if (isSelected) setQuoteForm({...quoteForm, products: quoteForm.products.filter(sp => sp.productId !== p._id)});
                              else setQuoteForm({...quoteForm, products: [...quoteForm.products, { 
                                productId:  p._id,
                                productName: p.name,
                                quantity:   displayMinQty,   // ← uses resolved MOQ as default qty
                                unit:       p.unit,
                                // Use productDeal OR initialProduct as source
                                isDeal:    hasDealInfo,
                                dealId:    productDeal?._id
                                           ?? (isThisInitialProduct ? initialProduct?.dealId : null),
                                dealPrice: displayDealPrice,
                                unitPrice: p.pricePerUnit,
                              }]});
                            }}>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-accent border-accent text-white' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                                {isSelected && <IconCheck size={14} />}
                              </div>
                              <span className="text-sm font-bold text-primary dark:text-white truncate">{p.name}</span>
                            </div>
                            {hasDealInfo && displayDealPrice && (
                              <div className="mb-3 text-[10px] font-black tracking-wide text-orange-600 bg-orange-500/10 py-1.5 px-2 rounded-lg flex items-center gap-1">
                                🔥 Deal Price: ₹{displayDealPrice}
                                {displayMinQty > 1 && ` (Min Qty: ${displayMinQty} ${p.unit})`}
                              </div>
                            )}
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" min={displayMinQty} value={isSelected.quantity === null || isNaN(isSelected.quantity) ? '' : isSelected.quantity} 
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newVal = val === '' ? '' : parseInt(val);
                                    setQuoteForm({...quoteForm, products: quoteForm.products.map(sp => sp.productId === p._id ? {...sp, quantity: newVal} : sp)});
                                  }} 
                                  className="w-20 p-2 rounded-lg border-none outline-none text-xs font-bold bg-white dark:bg-slate-800 text-primary dark:text-white" 
                                />
                                <span className="text-[10px] font-black text-slate-400 uppercase">{p.unit}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest block">Delivery Address</label>
                      <input 
                        name="address" required value={quoteForm.address} 
                        onChange={(e) => setQuoteForm({...quoteForm, address: e.target.value})} 
                        placeholder="Project Site Address" 
                        className="w-full p-4 rounded-2xl outline-none font-bold bg-slate-50 dark:bg-slate-900 text-primary dark:text-white border border-slate-100 dark:border-slate-800" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest block">Timeline</label>
                      <input 
                        name="timeline" required value={quoteForm.timeline} 
                        onChange={(e) => setQuoteForm({...quoteForm, timeline: e.target.value})} 
                        placeholder="e.g. Needs delivery by next Tuesday" 
                        className="w-full p-4 rounded-2xl outline-none font-bold bg-slate-50 dark:bg-slate-900 text-primary dark:text-white border border-slate-100 dark:border-slate-800" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest block">Additional Message</label>
                    <textarea 
                      rows={3} value={quoteForm.message} 
                      onChange={(e) => setQuoteForm({...quoteForm, message: e.target.value})} 
                      className="w-full p-4 rounded-2xl outline-none font-medium resize-none bg-slate-50 dark:bg-slate-900 text-primary dark:text-white border border-slate-100 dark:border-slate-800" 
                    />
                  </div>
                </div>
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                  <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-primary text-white rounded-3xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? 'Sending...' : 'Submit Quote Request'}</button>
                </div>
              </form>
            )}
          </motion.div>
          {/* MOQ Warning Popup JSX */}
          <AnimatePresence>
            {moqWarning && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                  className="absolute inset-0 bg-primary/80 backdrop-blur-md" 
                />
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                  animate={{ scale: 1, opacity: 1, y: 0 }} 
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[35px] border border-slate-200 dark:border-slate-800 p-8 shadow-2xl z-10 text-center"
                >
                  <div className="w-16 h-16 mx-auto bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-6">
                    <IconPackage size={32} />
                  </div>
                  <h3 className="text-xl font-black text-primary dark:text-white uppercase mb-2">
                    Minimum Order Quantity Not Met
                  </h3>
                  <div className="text-sm font-medium text-slate-500 mb-8 space-y-4">
                    <p>
                      This deal requires a minimum order of <strong className="text-orange-500">{moqRequired} units</strong> to avail the discounted price.
                    </p>
                    <p>
                      Please increase your quantity to <strong className="text-orange-500">{moqRequired} or more</strong> to proceed with this deal.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         setMoqWarning(false);
                      }}
                      className="w-full py-3.5 bg-orange-500 text-white rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-orange-500/20"
                    >
                      Update Quantity
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMoqWarning(false);
                        submitQuoteRequest({ skipDeal: true });
                      }}
                      className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all"
                    >
                      Send Anyway <span className="text-xs font-medium block">(at regular price)</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DealerProfileModal;
