import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface AdminSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  maxWidthClass?: string; // allow overriding width wrapper
}

const AdminSearchBar: React.FC<AdminSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  ariaLabel = 'Search',
  className = '',
  maxWidthClass = 'max-w-sm md:max-w-md'
}) => {
  return (
    <div className={`relative w-full ${maxWidthClass} ${className}`}>
      <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </span>
      {value && (
        <button
          type="button"
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-2 flex items-center px-1 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="pl-9 pr-8"
      />
    </div>
  );
};

export default AdminSearchBar;
