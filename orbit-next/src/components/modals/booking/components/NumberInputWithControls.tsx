/**
 * Number Input with Increment/Decrement Controls
 * 
 * A controlled number input with +/- buttons for easy adjustment
 */

import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NumberInputWithControlsProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function NumberInputWithControls({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
}: NumberInputWithControlsProps) {
  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = parseInt(e.target.value);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange(numValue);
    } else if (e.target.value === "") {
      onChange(min);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={value <= min}
        className="h-8 w-8 shrink-0"
        aria-label={`Decrease ${label || 'value'}`}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="text"
        value={value}
        onChange={handleInputChange}
        className="w-16 text-center"
        aria-label={label}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        disabled={value >= max}
        className="h-8 w-8 shrink-0"
        aria-label={`Increase ${label || 'value'}`}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
