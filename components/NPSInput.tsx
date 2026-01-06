import React from 'react';

interface NPSInputProps {
  value: number;
  onChange: (val: number) => void;
}

export const NPSInput: React.FC<NPSInputProps> = ({ value, onChange }) => {
  const range = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="mb-6">
      <div className="flex justify-between items-end mb-3">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Qual a nota para sua experiência hoje? (NPS) [Fixed]</label>
        <span className="text-[10px] text-slate-400 italic">0 = Muito insatisfeito | 10 = Muito satisfeito</span>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2 md:gap-2 no-scrollbar">
        {range.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`flex-1 min-w-[40px] h-12 flex items-center justify-center rounded-xl font-black transition-all text-sm ${value === num
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
