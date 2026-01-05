import React from 'react';
import { User } from '../../types';

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
    <header className="bg-white/80 backdrop-blur-3xl border-b border-slate-200 p-8 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-10">
        <div className="flex items-center gap-8">
          <div className="bg-[#0F172A] p-5 rounded-3xl text-[#FF6B00] shadow-2xl rotate-6 transition-transform hover:rotate-12 cursor-pointer">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="font-display text-[#0F172A] text-3xl tracking-tighter leading-none uppercase">
              Conect <span className="text-[#FF6B00]">Insights</span>
            </div>
            <div className="text-[10px] font-bold mt-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 pl-3 pr-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-3"></span>
                  <span className="text-[#0F172A] uppercase font-black text-[9px] tracking-widest">{currentUser.username}</span>
                  <span className="mx-3 text-slate-300">|</span>
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                    {currentUser.role === 'ADMIN' ? 'Administrador' : 'Gestor Unidade'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <nav className="flex bg-slate-200/40 p-1.5 rounded-[3rem] border border-slate-200 shadow-inner">
          <button
            onClick={() => onViewChange('survey')}
            className={`px-10 py-4 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${view === 'survey' ? 'bg-white text-[#0F172A] shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Coleta Campo
          </button>
          <button
            onClick={() => onViewChange('dashboard')}
            className={`px-10 py-4 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-white text-[#0F172A] shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Radar Estratégico
          </button>
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={onAdminClick}
              className={`px-10 py-4 rounded-[2.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${view === 'admin' ? 'bg-white text-[#0F172A] shadow-xl' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Gestão de Rede
            </button>
          )}
          <div className="w-[1px] bg-slate-300 mx-4 h-10 my-auto"></div>
          <button
            onClick={onLogout}
            className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-[2.5rem] transition-colors"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>
  );
};
