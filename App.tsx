import React, { useState, useEffect, useMemo } from 'react';
import {
  SurveySubmission,
  User,
  Store,
  AIAnalysisResult,
  SurveyQuestion,
  QuestionType,
  SurveyConfig
} from './types';
import { RatingScale } from './components/RatingScale';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoginPage } from './components/LoginPage';
import { BooleanToggle } from './components/BooleanToggle';
import { analyzeSurveys } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import {
  Plus,
  Trash2,
  MapPin,
  BarChart3,
  Download,
  Save,
  CheckCircle,
  Users,
  Building,
  Target,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  STORES,
  GENDER_OPTIONS,
  AGE_OPTIONS
} from './constants';

const DEFAULT_SURVEY: SurveyConfig = {
  id: 'ci-001',
  name: 'Pesquisa de Performance no PDV',
  description: 'Auditoria de atendimento, mix de produtos e satisfação geral.',
  isActive: true,
  createdAt: new Date().toISOString(),
  questions: [
    { id: 'q1', label: 'Conseguiu encontrar todos os produtos da sua lista?', type: 'boolean', required: true },
    {
      id: 'q1_d',
      label: 'Quais itens ou marcas não estavam disponíveis nas gôndolas?',
      type: 'text',
      required: true,
      dependsOn: { questionId: 'q1', value: 'Não' }
    },
    { id: 'q2', label: 'Nota para a cordialidade e preparo da equipe:', type: 'rating', required: true },
    { id: 'q3', label: 'Sugestões para melhorar sua experiência de compra:', type: 'text', required: false }
  ]
};

const TIME_FILTERS = [
  { label: '7 Dias', value: 7 },
  { label: '14 Dias', value: 14 },
  { label: '30 Dias', value: 30 },
  { label: '60 Dias', value: 60 },
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const [stores, setStores] = useState<Store[]>(() => {
    const saved = localStorage.getItem('ci_stores_v5');
    return saved ? JSON.parse(saved) : STORES;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('ci_users_v5');
    return saved ? JSON.parse(saved) : [];
  });

  const [surveys, setSurveys] = useState<SurveyConfig[]>(() => {
    const saved = localStorage.getItem('ci_configs_v5');
    return saved ? JSON.parse(saved) : [DEFAULT_SURVEY];
  });

  const [submissions, setSubmissions] = useState<SurveySubmission[]>(() => {
    const saved = localStorage.getItem('ci_subs_v5');
    return saved ? JSON.parse(saved) : [];
  });

  const [view, setView] = useState<'survey' | 'dashboard' | 'admin'>('survey');
  const [adminSubView, setAdminSubView] = useState<'list' | 'editor'>('list');
  const [activeSurveyId, setActiveSurveyId] = useState<string>(() => surveys.find(s => s.isActive)?.id || surveys[0]?.id || '');
  const [timeFilter, setTimeFilter] = useState(14);
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    gender: '',
    ageRange: '',
    storeId: '',
    npsScore: 10,
    answers: {} as Record<string, any>
  });

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchProfile(session.user.id);
      else setSessionLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchProfile(session.user.id);
      else {
        setCurrentUser(null);
        setSessionLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Forçar a tela de Coleta sempre que o usuário mudar (login)
  useEffect(() => {
    if (currentUser) {
      setView('survey');
    }
  }, [currentUser]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setCurrentUser({
          id: data.id,
          username: data.username,
          role: data.role as any,
          assignedStoreId: data.assigned_store_id
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleLogin = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const filteredSubmissions = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeFilter);
    return submissions.filter(s => new Date(s.timestamp) >= cutoffDate);
  }, [submissions, timeFilter]);

  useEffect(() => {
    localStorage.setItem('ci_subs_v5', JSON.stringify(submissions));
    localStorage.setItem('ci_stores_v5', JSON.stringify(stores));
    localStorage.setItem('ci_configs_v5', JSON.stringify(surveys));
    localStorage.setItem('ci_users_v5', JSON.stringify(users));
  }, [submissions, stores, surveys, users]);

  const isVisible = (q: SurveyQuestion, answers: Record<string, any>) => {
    if (!q.dependsOn) return true;
    return String(answers[q.dependsOn.questionId] || '').toLowerCase().trim() === String(q.dependsOn.value).toLowerCase().trim();
  };

  const renderSurvey = () => {
    const s = surveys.find(x => x.id === activeSurveyId);
    return (
      <div className="max-w-xl mx-auto animate-slideUp">
        <div className="card-premium overflow-hidden border-t-[10px] border-[#FF6B00]">
          <div className="bg-[#0F172A] p-8 text-white flex justify-between items-center">
            <div>
              <h2 className="text-xl font-display uppercase tracking-tight">Coleta de Campo</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Conect Insights</p>
            </div>
            <select value={activeSurveyId} onChange={e => setActiveSurveyId(e.target.value)} className="bg-slate-800 text-[10px] font-black p-2 rounded-lg border-none outline-none text-[#FF6B00] cursor-pointer">
              {surveys.filter(x => x.isActive || x.id === activeSurveyId).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            const storeId = currentUser?.assignedStoreId || formData.storeId;
            if (!storeId) return alert("Erro: Identifique a unidade primeiro.");
            const newSub = { ...formData, id: Date.now().toString(), surveyId: activeSurveyId, timestamp: new Date().toISOString(), storeId };
            setSubmissions([newSub, ...submissions]);
            setFormData({ ...formData, customerName: '', answers: {}, npsScore: 10 });
            alert("Feedback registrado com sucesso!");
          }} className="p-10 space-y-10">
            <div className="space-y-5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 block">Identificação do Respondente</label>
              <input type="text" placeholder="Nome do Cliente" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-semibold outline-none focus:border-[#FF6B00] transition-all" required />
              <div className="grid grid-cols-2 gap-4">
                <select className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-semibold outline-none focus:border-[#FF6B00]" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} required>
                  <option value="">Gênero</option>
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-semibold outline-none focus:border-[#FF6B00]" value={formData.ageRange} onChange={e => setFormData({ ...formData, ageRange: e.target.value })} required>
                  <option value="">Faixa Etária</option>
                  {AGE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-10 pt-4">
              {s?.questions.map(q => isVisible(q, formData.answers) && (
                <div key={q.id} className={`space-y-4 animate-slideUp ${q.dependsOn ? 'ml-8 pl-8 border-l-4 border-[#FF6B00] bg-orange-50/20 p-8 rounded-r-3xl shadow-sm' : ''} `}>
                  <label className="text-base font-bold text-slate-900 block leading-snug">{q.label}</label>
                  {q.type === 'text' && <textarea value={formData.answers[q.id] || ''} onChange={e => setFormData({ ...formData, answers: { ...formData.answers, [q.id]: e.target.value } })} className="w-full p-5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[#FF6B00] font-medium" rows={3} required={q.required} placeholder="Descreva aqui..." />}
                  {q.type === 'boolean' && (
                    <BooleanToggle
                      value={formData.answers[q.id] || ''}
                      onChange={(opt) => setFormData({ ...formData, answers: { ...formData.answers, [q.id]: opt } })}
                    />
                  )}
                  {q.type === 'rating' && <RatingScale label="" max={5} value={formData.answers[q.id] || 0} onChange={v => setFormData({ ...formData, answers: { ...formData.answers, [q.id]: v } })} />}
                </div>
              ))}
              <div className="pt-10 border-t border-slate-100">
                <RatingScale label="Qual a nota para sua experiência hoje? (NPS)" max={10} value={formData.npsScore} onChange={v => setFormData({ ...formData, npsScore: v })} description="0 = Muito insatisfeito | 10 = Muito satisfeito" />
              </div>
            </div>

            <button className="w-full btn-primary py-7 rounded-[2rem] shadow-xl uppercase tracking-[0.3em] text-[10px]">Sincronizar Feedback</button>
          </form>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const stats = stores.map(st => {
      const subs = filteredSubmissions.filter(s => s.storeId === st.id);
      const avg = subs.length ? subs.reduce((a, b) => a + b.npsScore, 0) / subs.length : 0;
      return { name: st.name, nps: parseFloat(avg.toFixed(1)), count: subs.length };
    }).filter(s => s.count > 0);

    return (
      <div className="space-y-12 animate-slideUp pb-40">
        <div className="card-premium p-12 flex flex-col lg:flex-row justify-between items-center gap-10 border-l-[12px] border-[#FF6B00]">
          <div className="space-y-4 text-center lg:text-left">
            <h2 className="text-4xl font-display text-[#0F172A] tracking-tighter">Radar Estratégico</h2>
            <div className="flex flex-wrap justify-center lg:justify-start gap-3 items-center">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-4">Período Analítico:</span>
              {TIME_FILTERS.map(tf => (
                <button key={tf.value} onClick={() => setTimeFilter(tf.value)} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase transition-all ${timeFilter === tf.value ? 'bg-[#0F172A] text-white shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'} `}>{tf.label}</button>
              ))}
            </div>
          </div>
          <button disabled={isAnalyzing || filteredSubmissions.length === 0} onClick={async () => { setIsAnalyzing(true); try { setAiAnalysis(await analyzeSurveys(filteredSubmissions, stores, surveys)); } finally { setIsAnalyzing(false); } }} className="btn-primary px-16 py-6 rounded-[2rem] shadow-xl text-[11px] uppercase tracking-widest">
            {isAnalyzing ? "Computando Tendências..." : "Processar Radar IA"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <div className="card-premium p-12 h-[520px]">
              <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
                <div>
                  <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Desempenho NPS por Unidade</h3>
                  <p className="text-[10px] text-slate-300 font-bold mt-1 uppercase tracking-widest">Radar: Últimos {timeFilter} dias</p>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#0F172A] rounded-sm"></div><span className="text-[9px] font-black text-slate-400 uppercase">Top Performers</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#FF6B00] rounded-sm"></div><span className="text-[9px] font-black text-slate-400 uppercase">Atenção</span></div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} domain={[0, 10]} />
                  <Tooltip cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 30px 60px -10px rgba(0,0,0,0.15)', padding: '20px' }} />
                  <Bar dataKey="nps" radius={[12, 12, 0, 0]} barSize={60}>
                    {stats.map((entry, i) => <Cell key={i} fill={entry.nps >= 8.5 ? '#0F172A' : '#FF6B00'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card-premium overflow-hidden">
              <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">Histórico de Feedbacks ({filteredSubmissions.length})</span>
              </div>
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.slice(0, 30).map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-10">
                          <div className="font-bold text-slate-900 text-lg leading-none">{s.customerName}</div>
                          <div className="text-[10px] font-bold text-[#FF6B00] uppercase tracking-widest mt-2">{stores.find(st => st.id === s.storeId)?.name}</div>
                        </td>
                        <td className="p-10">
                          <div className={`inline-block px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest ${s.npsScore >= 9 ? 'bg-emerald-50 text-emerald-600' : s.npsScore <= 6 ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-[#FF6B00]'} `}>SCORE {s.npsScore}</div>
                        </td>
                        <td className="p-10 text-[11px] text-slate-300 font-bold text-right">{new Date(s.timestamp).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            {aiAnalysis ? (
              <div className="bg-[#0F172A] text-white p-12 rounded-[3.5rem] shadow-2xl space-y-12 relative overflow-hidden border-t-[14px] border-[#FF6B00] animate-slideUp">
                <div className="relative z-10 space-y-10">
                  <h3 className="text-3xl font-display text-[#FF6B00] border-b border-white/5 pb-6">Diagnóstico Radar</h3>
                  <div className="bg-white/5 p-8 rounded-[2rem] italic leading-relaxed text-sm text-slate-300 border border-white/5 shadow-inner">"{aiAnalysis.summary}"</div>

                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-rose-400 uppercase tracking-[0.3em] border-l-4 border-rose-500 pl-4">Fatores de Ruptura</h4>
                    {aiAnalysis.keyIssues.map((issue, i) => <div key={i} className="p-5 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-xs font-semibold text-rose-100 flex items-center gap-4"><span>🔥</span> {issue}</div>)}
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] border-l-4 border-emerald-500 pl-4">Plano de Atendimento</h4>
                    {aiAnalysis.recommendations.map((rec, i) => <div key={i} className="p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/10 text-xs text-slate-200 leading-snug flex items-start gap-4"><span>🚀</span> {rec}</div>)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-premium p-20 flex flex-col items-center justify-center text-center space-y-10 min-h-[650px] border-dashed border-2">
                <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center animate-pulse rotate-3">
                  <svg className="w-16 h-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="space-y-6">
                  <p className="font-display text-2xl text-slate-900 tracking-tight leading-tight">Radar Conect Preditivo</p>
                  <p className="text-slate-400 text-sm font-medium max-w-[280px] mx-auto leading-relaxed">Selecione um período acima e processe os dados para gerar o diagnóstico de inteligência preditiva Gemini.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAdmin = () => {
    if (adminSubView === 'list') {
      return (
        <div className="max-w-7xl mx-auto space-y-16 animate-slideUp pb-40">
          <div className="card-premium p-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
              <div>
                <h2 className="text-4xl font-display text-slate-900 tracking-tighter leading-none mb-4">Campanhas Estratégicas</h2>
                <p className="text-slate-500 font-medium text-lg">Gerencie os fluxos de captura de insights.</p>
              </div>
              <button onClick={() => {
                const newS: SurveyConfig = { id: Date.now().toString(), name: 'Nova Auditoria de PDV', description: 'Objetivo estratégico da coleta...', isActive: false, questions: [], createdAt: new Date().toISOString() };
                setSurveys([...surveys, newS]); setEditingSurveyId(newS.id); setAdminSubView('editor');
              }} className="btn-primary px-10 py-5 rounded-2xl text-xs uppercase tracking-widest shadow-xl">Criar Nova Campanha</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {surveys.map(s => (
                <div key={s.id} className="p-10 rounded-[2.5rem] border border-slate-100 bg-white hover:border-[#FF6B00] transition-all flex flex-col shadow-sm hover:shadow-2xl group">
                  <div className="flex justify-between items-start mb-12">
                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'} `}>{s.isActive ? 'Em Coleta' : 'Rascunho'}</span>
                    <button onClick={() => { setEditingSurveyId(s.id); setAdminSubView('editor'); }} className="p-3 text-slate-300 hover:text-[#0F172A] transition-colors"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                  </div>
                  <h3 className="font-display text-2xl mb-4 text-slate-900 leading-tight">{s.name}</h3>
                  <p className="text-slate-400 text-sm font-medium mb-12 flex-1 line-clamp-3 leading-relaxed">{s.description}</p>
                  <button onClick={() => { setEditingSurveyId(s.id); setAdminSubView('editor'); }} className="text-[#0F172A] text-[11px] font-black uppercase tracking-widest border-t border-slate-50 pt-8 group-hover:text-[#FF6B00] transition-colors text-left flex items-center justify-between">Ajustar Lógica <span>→</span></button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="card-premium p-12 border-t-[10px] border-[#0F172A]">
              <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">Unidades da Rede</h3>
              <div className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar pr-6">
                {stores.map(st => (
                  <div key={st.id} className="p-6 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-200 group hover:bg-white hover:border-[#FF6B00] transition-all">
                    <span className="font-bold text-slate-900 text-base">{st.name}</span>
                    <button onClick={() => setStores(stores.filter(x => x.id !== st.id))} className="text-[10px] font-black text-rose-300 hover:text-rose-600 uppercase opacity-0 group-hover:opacity-100 transition-all tracking-widest">Remover</button>
                  </div>
                ))}
                <div className="flex gap-4 pt-8">
                  <input id="store-new" type="text" placeholder="Nome da Unidade" className="flex-1 p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-[#FF6B00]" />
                  <button onClick={() => {
                    const i = document.getElementById('store-new') as HTMLInputElement;
                    if (i.value) setStores([...stores, { id: Date.now().toString(), name: i.value }]);
                    i.value = '';
                  }} className="bg-[#0F172A] text-white px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 shadow-xl">Cadastrar</button>
                </div>
              </div>
            </div>

            <div className="card-premium p-12 border-t-[10px] border-[#0F172A]">
              <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">Equipe de Insights</h3>
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-400 uppercase ml-2">Usuário</label>
                    <input id="adm-user" type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-[#FF6B00]" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-400 uppercase ml-2">Senha</label>
                    <input id="adm-key" type="password" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-[#FF6B00]" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-2">Unidade Alocada</label>
                  <select id="adm-store" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-[#FF6B00]">
                    <option value="">Selecione a Unidade...</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault(); // Garantia extra
                    const u = document.getElementById('adm-user') as HTMLInputElement;
                    const p = document.getElementById('adm-key') as HTMLInputElement;
                    const s = document.getElementById('adm-store') as HTMLSelectElement;

                    if (u.value && p.value && s.value) {
                      try {
                        // 1. Cadastra no Supabase Auth
                        // Nota: signUp pode alterar a sessão atual no cliente.
                        // O ideal seria usar uma Edge Function para criar usuários sem deslogar o admin.
                        // Como paliativo, salvamos a sessão atual? Não, o client mudará.
                        // Vamos apenas alertar e observar o comportamento.

                        const { data: authData, error: authError } = await supabase.auth.signUp({
                          email: u.value,
                          password: p.value,
                          options: {
                            data: {
                              full_name: u.value.split('@')[0],
                              role: 'MANAGER'
                            }
                          }
                        });

                        if (authError) throw authError;

                        // 2. Cria o perfil no banco local/state
                        const newUser: User = {
                          id: authData.user?.id || Date.now().toString(),
                          username: u.value,
                          password: p.value, // Apenas para visualização local demo
                          role: 'MANAGER',
                          assignedStoreId: s.value
                        };

                        setUsers([...users, newUser]);

                        // Limpar formulário
                        u.value = '';
                        p.value = '';
                        s.value = '';

                        alert('Gestor cadastrado com sucesso! (Verifique se manteve a sessão de admin)');
                      } catch (error: any) {
                        console.error('Erro ao cadastrar gestor:', error);
                        alert('Erro ao cadastrar gestor: ' + (error.message || 'Erro desconhecido'));
                      }
                    } else {
                      alert('Preencha todos os campos!');
                    }
                  }} className="w-full btn-primary py-6 rounded-2xl text-[11px] uppercase tracking-widest">Habilitar Gestor</button>

                <div className="pt-10 space-y-4">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50 block pb-2">Gestores Ativos</label>
                  {users.map(usr => (
                    <div key={usr.id} className="flex justify-between items-center p-5 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-white transition-all shadow-sm">
                      <div>
                        <span className="font-bold text-sm text-slate-800 tracking-tight">{usr.username}</span>
                        <span className="text-slate-400 text-[9px] font-black uppercase ml-4 tracking-[0.2em]">({stores.find(x => x.id === usr.assignedStoreId)?.name})</span>
                      </div>
                      <button onClick={() => setUsers(users.filter(x => x.id !== usr.id))} className="text-[10px] text-rose-300 hover:text-rose-600 font-black uppercase tracking-widest">Revogar</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (adminSubView === 'editor' && editingSurveyId) {
      const s = surveys.find(x => x.id === editingSurveyId);
      if (!s) return null;
      return (
        <div className="max-w-5xl mx-auto animate-slideUp pb-40">
          <div className="card-premium overflow-hidden border-t-[14px] border-[#0F172A]">
            <div className="p-12 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="space-y-2">
                <button onClick={() => setAdminSubView('list')} className="text-[#0F172A] text-[11px] font-black uppercase flex items-center gap-3 mb-3 hover:-translate-x-1 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" /></svg>
                  Gestão de Campanhas
                </button>
                <h2 className="text-4xl font-display tracking-tighter">Editor de Fluxo</h2>
              </div>
              <label className="flex items-center gap-6 cursor-pointer bg-white px-12 py-6 rounded-[2.5rem] shadow-sm border border-slate-200">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Habilitar Coleta</span>
                <input type="checkbox" checked={s.isActive} onChange={e => setSurveys(surveys.map(x => x.id === s.id ? { ...x, isActive: e.target.checked } : x))} className="w-8 h-8 accent-[#FF6B00]" />
              </label>
            </div>

            <div className="p-16 space-y-16">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Título da Campanha</label>
                  <input type="text" value={s.name} onChange={e => setSurveys(surveys.map(x => x.id === s.id ? { ...x, name: e.target.value } : x))} className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold text-2xl outline-none focus:border-[#FF6B00] transition-all" />
                </div>
                <div className="space-y-4">
                  <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">Estratégia de Captura</label>
                  <input type="text" value={s.description} onChange={e => setSurveys(surveys.map(x => x.id === s.id ? { ...x, description: e.target.value } : x))} className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold text-2xl outline-none focus:border-[#FF6B00] transition-all" />
                </div>
              </div>

              <div className="space-y-12">
                <div className="flex justify-between items-center border-t-2 border-slate-50 pt-16">
                  <h3 className="text-xl font-display text-[#0F172A] uppercase tracking-[0.1em] flex items-center gap-5"><span>📋</span> Fluxograma Analítico</h3>
                  <button onClick={() => {
                    const newQ = { id: Date.now().toString(), label: 'Nova Pergunta Analítica', type: 'text' as const, required: true };
                    setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: [...sv.questions, newQ] } : sv));
                  }} className="bg-[#0F172A] text-white px-12 py-6 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl transition-all">+ Inserir Pergunta</button>
                </div>

                <div className="space-y-12">
                  {s.questions.map((q, idx) => (
                    <div key={q.id} className={`p-14 bg-white rounded-[4rem] border-2 transition-all ${q.dependsOn ? 'ml-16 border-orange-200 bg-orange-50/10 shadow-inner' : 'border-slate-100 shadow-xl shadow-slate-200/5'} `}>
                      <div className="flex gap-12 items-start">
                        <div className="bg-[#0F172A] text-white min-w-[4.5rem] h-18 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-lg">{idx + 1}</div>
                        <div className="flex-1 space-y-10">
                          <input type="text" value={q.label} onChange={e => setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: sv.questions.map(qu => qu.id === q.id ? { ...qu, label: e.target.value } : qu) } : sv))} placeholder="Qual informação deseja extrair?" className="w-full bg-transparent text-4xl font-bold text-slate-900 outline-none border-b-2 border-transparent focus:border-[#FF6B00] pb-6 transition-all tracking-tight" />

                          <div className="flex flex-wrap gap-12 items-center">
                            <div className="flex bg-slate-100 p-2.5 rounded-[2rem] border border-slate-200 shadow-inner">
                              {(['text', 'boolean', 'rating'] as QuestionType[]).map(type => (
                                <button key={type} onClick={() => setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: sv.questions.map(qu => qu.id === q.id ? { ...qu, type } : qu) } : sv))} className={`px-10 py-5 rounded-[1.5rem] text-[11px] font-black uppercase transition-all ${q.type === type ? 'bg-white text-[#0F172A] shadow-xl' : 'text-slate-400'} `}>
                                  {type === 'text' ? 'Texto' : type === 'boolean' ? 'Sim/Não' : 'Score 0-5'}
                                </button>
                              ))}
                            </div>
                            <label className="flex items-center gap-5 cursor-pointer group">
                              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-[#0F172A] transition-colors">Obrigatório</span>
                              <input type="checkbox" checked={q.required} onChange={e => setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: sv.questions.map(qu => qu.id === q.id ? { ...qu, required: e.target.checked } : qu) } : sv))} className="accent-[#FF6B00] w-8 h-8" />
                            </label>
                            <button onClick={() => setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: sv.questions.filter(qu => qu.id !== q.id) } : sv))} className="text-[11px] font-black uppercase text-rose-300 hover:text-rose-600 transition-colors ml-auto tracking-[0.3em]">Remover Campo</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setAdminSubView('list')} className="w-full bg-[#0F172A] text-white py-10 rounded-[3rem] font-black uppercase tracking-[0.5em] shadow-2xl transition-all hover:bg-slate-800 text-sm">Validar e Sincronizar Arquitetura</button>
            </div>
          </div>
        </div>
      );
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center brand-gradient">
        <div className="text-white font-black uppercase tracking-[0.5em] animate-pulse">Iniciando Insights...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen pb-40">
      <Header
        currentUser={currentUser}
        view={view}
        onViewChange={setView}
        onLogout={handleLogout}
        onAdminClick={() => { setView('admin'); setAdminSubView('list'); }}
      />
      <main className="max-w-7xl mx-auto px-10 mt-20 min-h-[60vh]">
        {view === 'survey' && renderSurvey()}
        {view === 'dashboard' && renderDashboard()}
        {view === 'admin' && renderAdmin()}
      </main>
      <Footer />
    </div>
  );
};

export default App;
