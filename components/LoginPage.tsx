import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onLogin(loginData.username, loginData.password);
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas ou erro no sistema');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 brand-gradient relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[900px] h-[900px] bg-[#FF6B00] rounded-full blur-[280px] opacity-10 -mr-60 -mt-60 animate-pulse"></div>
      <div className="max-w-md w-full glass-dark rounded-[4rem] shadow-[0_60px_120px_rgba(0,0,0,0.5)] p-20 space-y-16 animate-slideUp text-center flex flex-col justify-between min-h-[700px]">
        <div className="space-y-12">
          <div className="bg-[#FF6B00] w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl rotate-12">
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-display text-white tracking-tighter">
              Conect <span className="text-[#FF6B00]">Insights</span>
            </h1>
            <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.5em]">
              Experience Analytics v5.2
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-8 text-left">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-5">
                E-mail
              </label>
              <input
                type="email"
                value={loginData.username}
                onChange={e => setLoginData({ ...loginData, username: e.target.value })}
                className="w-full p-7 bg-white/5 border border-white/10 rounded-[2.5rem] font-bold outline-none focus:border-[#FF6B00] text-white placeholder:text-slate-800"
                placeholder="exemplo@conect.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-5">
                Senha
              </label>
              <input
                type="password"
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full p-7 bg-white/5 border border-white/10 rounded-[2.5rem] font-bold outline-none focus:border-[#FF6B00] text-white"
                required
              />
            </div>
            <div className="space-y-4">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase p-4 rounded-2xl text-center">
                  {error}
                </div>
              )}
              <button
                disabled={loading}
                className="w-full btn-primary py-8 rounded-[2.5rem] shadow-2xl uppercase tracking-[0.4em] text-[11px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Validando...' : 'Entrar no Sistema'}
              </button>
            </div>
          </form>
        </div>
        <div className="pt-10 border-t border-white/5 mt-auto">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] opacity-60">
            Enterprise Intelligence • Powered by Conect Consultorias
          </p>
        </div>
      </div>
    </div>
  );
};
