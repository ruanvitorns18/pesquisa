
import React from 'react';

interface RatingScaleProps {
  label: string;
  value: number;
  max?: number;
  onChange: (val: number) => void;
  description?: string;
}

export const RatingScale: React.FC<RatingScaleProps> = ({ label, value, max = 5, onChange, description }) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-end mb-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
        {description && <span className="text-[10px] text-slate-400 italic">{description}</span>}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: max === 10 ? 11 : max }, (_, i) => i + (max === 10 ? 0 : 1)).map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`flex-1 h-12 flex items-center justify-center rounded-xl font-black transition-all text-sm ${value === num
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-100 scale-105 z-10'
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'
              }`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};
