import React from 'react';
import { PhoneVerifiedBadge, GSTVerifiedBadge } from './VerifiedBadges';
import { IconMapPin, IconBox } from '@tabler/icons-react';

const DealerCard = ({ dealer }) => {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden">
          <img 
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${dealer.shopName || dealer.name}`} 
            alt={dealer.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-1 items-end">
          {dealer.phoneVerified && <PhoneVerifiedBadge />}
          {dealer.isVerified && <GSTVerifiedBadge />}
        </div>
      </div>

      <h3 className="text-xl font-black text-primary group-hover:text-accent transition-colors">
        {dealer.shopName || dealer.name}
      </h3>
      <p className="text-gray-400 text-sm font-bold mb-4">{dealer.name}</p>

      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <IconMapPin size={16} className="text-accent" />
          <span>{dealer.locationDetails?.city || 'India'}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <IconBox size={16} className="text-accent" />
          <span>{dealer.categories?.join(', ') || 'Building Materials'}</span>
        </div>
      </div>

      <button className="w-full py-3 bg-slate-50 text-primary font-black rounded-xl hover:bg-primary hover:text-white transition-all">
        Contact Dealer
      </button>
    </div>
  );
};

export default DealerCard;
