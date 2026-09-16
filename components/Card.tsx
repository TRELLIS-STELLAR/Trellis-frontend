/* Card Component */

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`p-6 rounded-lg border border-trellis-vine/30 hover:border-trellis-vine/60 hover:shadow-lg hover:shadow-trellis-vine/20 transition-smooth nebula-bg ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
