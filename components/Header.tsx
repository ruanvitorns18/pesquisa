import React from 'react';
import { User } from '../types';

type ViewType = 'survey' | 'dashboard' | 'admin';

interface HeaderProps {
  currentUser: User;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
  onAdminClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  view,
  onViewChange,
  onLogout,
  onAdminClick
}) => {
  return (
    <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 py-6 sticky top-0 z-50 shadow-sm transition-all duration-300">
      <div className="max-w-[1440px] mx-auto px-8 flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6 group">
          <div className="bg-[#0F172A] p-4 rounded-2xl text-[#FF6B00] shadow-lg rotate-3 transition-transform group-hover:rotate-12 duration-500 cursor-pointer">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="font-display text-[#0F172A] text-2xl tracking-tighter leading-none uppercase select-none">
              Conect <span className="text-[#FF6B00]">Insights</span>
            </div>
            <div className="text-[10px] font-bold mt-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100/80 px-4 py-1.5 rounded-full border border-slate-200/50">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2.5 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                  <span className="text-slate-700 uppercase font-black text-[9px] tracking-[0.2em]">{currentUser.username}</span>
                  <span className="mx-3 text-slate-300">|</span>
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                    {currentUser.role === 'ADMIN' ? 'Administrador' : 'Gestor Unidade'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <nav className="flex bg-slate-100/50 p-1.5 rounded-[2rem] border border-slate-200/50 backdrop-blur-md">
          <button
            onClick={() => onViewChange('survey')}
            className={`px-8 py-3 rounded-[1.7rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${view === 'survey' ? 'bg-white text-[#0F172A] shadow-lg scale-105 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
          >
            Coleta
          </button>
          <button
            onClick={() => onViewChange('dashboard')}
            className={`px-8 py-3 rounded-[1.7rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${view === 'dashboard' ? 'bg-white text-[#0F172A] shadow-lg scale-105 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
          >
            Radar
          </button>
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={onAdminClick}
              className={`px-8 py-3 rounded-[1.7rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${view === 'admin' ? 'bg-white text-[#0F172A] shadow-lg scale-105 ring-1 ring-black/5' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
            >
              Gestão
            </button>
          )}
          <div className="w-[1px] bg-slate-200 mx-2 h-6 my-auto"></div>
          <button
            onClick={onLogout}
            className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-[1.7rem] transition-colors"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
};
