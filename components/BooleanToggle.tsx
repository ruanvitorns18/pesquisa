import React from 'react';

interface BooleanToggleProps {
  value: string;
  onChange: (value: string) => void;
  options?: [string, string];
}

export const BooleanToggle: React.FC<BooleanToggleProps> = ({
  value,
  onChange,
  options = ['Sim', 'Não']
}) => {
  return (
    <div className="flex gap-4">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 py-5 rounded-2xl border-2 font-black text-xs transition-all ${value === opt
              ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-lg'
              : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
};
