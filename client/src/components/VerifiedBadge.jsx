import { BadgeCheck } from 'lucide-react';

const VerifiedBadge = ({ size = 14, className = '' }) => (
  <BadgeCheck
    size={size}
    className={`inline-block text-mint shrink-0 ${className}`}
    aria-label="Verified account"
    title="Verified account"
  />
);

export default VerifiedBadge;
