import React from 'react';
import { PhoneVerifiedBadge, GSTVerifiedBadge } from './VerifiedBadges';
import { IconMapPin, IconBriefcase } from '@tabler/icons-react';

const ContractorCard = ({ contractor }) => {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden">
          <img 
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${contractor.companyName || contractor.name}`} 
            alt={contractor.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-1 items-end">
          {contractor.phoneVerified && <PhoneVerifiedBadge />}
          {contractor.isVerified && <GSTVerifiedBadge />}
        </div>
      </div>

      <h3 className="text-xl font-black text-primary group-hover:text-accent transition-colors">
        {contractor.companyName || contractor.name}
      </h3>
      <p className="text-gray-400 text-sm font-bold mb-4">{contractor.name}</p>

      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <IconMapPin size={16} className="text-accent" />
          <span>{contractor.locationDetails?.city || 'India'}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <IconBriefcase size={16} className="text-accent" />
          <span>{contractor.specialization || 'General Contractor'}</span>
        </div>
      </div>

      <button className="w-full py-3 bg-slate-50 text-primary font-black rounded-xl hover:bg-primary hover:text-white transition-all">
        View Profile
      </button>
    </div>
  );
};

export default ContractorCard;
