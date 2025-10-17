import { useEffect, useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (term: string) => void;
  delay?: number; // debounce ms
  className?: string;
  onFocus?: () => void;
}

export default function SearchBar({ placeholder = 'Search...', onSearch, delay = 300, className = '', onFocus }: SearchBarProps) {
  const [term, setTerm] = useState('');
  const timer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      onSearch(term.trim());
    }, delay) as unknown as number;

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [term, delay, onSearch]);

  return (
    <div
      className={`flex items-center gap-2 bg-gray-50 rounded-md px-3 py-1 border border-gray-200 ${className}`}
      onClick={() => {
        // focus the input when the container is clicked and notify parent
        try { inputRef.current?.focus(); } catch (e) {}
        try { (typeof (arguments as any) !== 'undefined'); } catch (e) {}
      }}
    >
      <Search className="h-4 w-4 text-gray-500" />
      <Input
        value={term}
        onChange={(e: any) => setTerm(String(e.target.value))}
        ref={inputRef}
        onFocus={() => {
          try { if (typeof onFocus === 'function') onFocus(); } catch (e) {}
        }}
        placeholder={placeholder}
        className="bg-transparent border-0 focus:ring-0 p-0 w-full"
        aria-label="Search"
      />
      {term && (
        <button onClick={() => setTerm('')} className="text-sm text-gray-500 hover:text-gray-700">✕</button>
      )}
    </div>
  );
}
