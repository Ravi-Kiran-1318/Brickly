import React from 'react';
import { IconCircleCheck, IconShieldCheck } from '@tabler/icons-react';

export function PhoneVerifiedBadge({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-black ring-1 ring-inset ring-green-600/20 ${className}`}>
      <IconCircleCheck size={14} className="text-green-600" />
      <span>Phone Verified</span>
    </span>
  );
}

export function GSTVerifiedBadge({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black ring-1 ring-inset ring-blue-600/20 ${className}`}>
      <IconShieldCheck size={14} className="text-blue-600" />
      <span>GST Verified</span>
    </span>
  );
}
