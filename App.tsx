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
  FileText,
  MessageSquare,
  Star,
  ToggleLeft,
  Settings,
  ArrowRight,
  Split,
  ChevronDown,
  LayoutGrid
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
        <div className="max-w-[1440px] mx-auto space-y-12 animate-slideUp pb-40">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-4">
            <div>
              <h2 className="text-4xl font-display text-slate-900 tracking-tighter leading-none mb-3">Campanhas Estratégicas</h2>
              <p className="text-slate-500 font-medium">Gerencie os fluxos de captura de insights.</p>
            </div>
            <button onClick={() => {
              const newS: SurveyConfig = { id: Date.now().toString(), name: 'Nova Auditoria', description: 'Objetivo estratégico...', isActive: false, questions: [], createdAt: new Date().toISOString() };
              setSurveys([...surveys, newS]); setEditingSurveyId(newS.id); setAdminSubView('editor');
            }} className="btn-primary px-8 py-4 rounded-2xl text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:scale-105 transition-transform"><Plus className="w-4 h-4" /> Nova Campanha</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {surveys.map(s => (
              <div key={s.id} className="p-8 rounded-[2rem] border border-slate-200 bg-white hover:border-[#FF6B00] transition-all flex flex-col shadow-sm hover:shadow-2xl group relative overflow-hidden">
                <div className={`absolute top-0 right-0 p-4 rounded-bl-[2rem] ${s.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {s.isActive ? <CheckCircle className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                </div>
                <div className="mb-8 mt-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 text-[#FF6B00]">
                    <Target className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-xl mb-2 text-slate-900 leading-tight">{s.name}</h3>
                  <p className="text-slate-400 text-xs font-medium line-clamp-2 leading-relaxed">{s.description}</p>
                </div>
                <button onClick={() => { setEditingSurveyId(s.id); setAdminSubView('editor'); }} className="mt-auto w-full py-4 bg-slate-50 rounded-xl text-[#0F172A] text-[10px] font-black uppercase tracking-widest hover:bg-[#0F172A] hover:text-white transition-all flex items-center justify-center gap-2 group-hover:shadow-lg">
                  Editar Fluxo <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
            {/* Componente de Unidades da Rede - Mantendo similar mas com visual atualizado */}
            <div className="card-premium p-8 border-t-[8px] border-[#0F172A]">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-slate-100 p-3 rounded-xl"><Building className="w-5 h-5 text-slate-700" /></div>
                <h3 className="text-lg font-display text-slate-900 tracking-tight">Unidades da Rede</h3>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {stores.map(st => (
                  <div key={st.id} className="p-4 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100 group hover:border-[#FF6B00] transition-all">
                    <span className="font-bold text-slate-700 text-sm">{st.name}</span>
                    <button onClick={() => setStores(stores.filter(x => x.id !== st.id))} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <div className="flex gap-3 pt-4">
                  <input id="store-new" type="text" placeholder="Nome da Unidade" className="flex-1 p-4 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#FF6B00] focus:ring-4 focus:ring-orange-500/10 transition-all" />
                  <button onClick={() => {
                    const i = document.getElementById('store-new') as HTMLInputElement;
                    if (i.value) setStores([...stores, { id: Date.now().toString(), name: i.value }]);
                    i.value = '';
                  }} className="bg-[#0F172A] text-white px-6 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* Componente de Equipe - Visual atualizado */}
            <div className="card-premium p-8 border-t-[8px] border-[#0F172A]">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-slate-100 p-3 rounded-xl"><Users className="w-5 h-5 text-slate-700" /></div>
                <h3 className="text-lg font-display text-slate-900 tracking-tight">Gestores de Insights</h3>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Usuário</label>
                    <input id="adm-user" type="text" className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#FF6B00] transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Senha</label>
                    <input id="adm-key" type="password" className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#FF6B00] transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Unidade</label>
                  <select id="adm-store" className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#FF6B00] transition-all cursor-pointer">
                    <option value="">Selecione...</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    const u = document.getElementById('adm-user') as HTMLInputElement;
                    const p = document.getElementById('adm-key') as HTMLInputElement;
                    const s = document.getElementById('adm-store') as HTMLSelectElement;

                    if (u.value && p.value && s.value) {
                      try {
                        const { data: authData, error: authError } = await supabase.auth.signUp({
                          email: u.value,
                          password: p.value,
                          options: { data: { full_name: u.value.split('@')[0], role: 'MANAGER' } }
                        });
                        if (authError) throw authError;

                        const newUser: User = {
                          id: authData.user?.id || Date.now().toString(),
                          username: u.value, password: p.value, role: 'MANAGER', assignedStoreId: s.value
                        };
                        setUsers([...users, newUser]);
                        u.value = ''; p.value = ''; s.value = '';
                        alert('Gestor cadastrado!');
                      } catch (error: any) {
                        alert('Erro: ' + (error.message || 'Desconhecido'));
                      }
                    }
                  }} className="w-full btn-primary py-4 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Habilitar Acesso
                </button>

                <div className="pt-6 space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                  {users.map(usr => (
                    <div key={usr.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-white transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center text-white font-bold text-[10px]">{usr.username.charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="font-bold text-xs text-slate-800">{usr.username}</div>
                          <div className="text-slate-400 text-[9px] font-black uppercase tracking-wider">{stores.find(x => x.id === usr.assignedStoreId)?.name}</div>
                        </div>
                      </div>
                      <button onClick={() => setUsers(users.filter(x => x.id !== usr.id))} className="text-rose-400 hover:text-rose-600 p-2"><Trash2 className="w-4 h-4" /></button>
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
        <div className="max-w-4xl mx-auto animate-slideUp pb-40">
          {/* Top Bar Fixa de Navegação */}
          <div className="sticky top-28 z-40 bg-white/90 backdrop-blur-xl border border-slate-200 p-4 rounded-2xl shadow-xl flex justify-between items-center mb-10">
            <button onClick={() => setAdminSubView('list')} className="text-slate-500 hover:text-[#0F172A] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors">
              <ArrowRight className="w-4 h-4 rotate-180" /> Voltar
            </button>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status da Campanha</div>
                <div className={`text-xs font-bold ${s.isActive ? 'text-emerald-600' : 'text-slate-500'}`}>{s.isActive ? 'Ativa no App' : 'Em Rascunho'}</div>
              </div>
              <button onClick={() => setSurveys(surveys.map(x => x.id === s.id ? { ...x, isActive: !x.isActive } : x))} className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${s.isActive ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start'}`}>
                <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {/* Header da Campanha */}
            <div className="card-premium p-8 bg-gradient-to-br from-white to-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target className="w-3 h-3" /> Título</label>
                  <input type="text" value={s.name} onChange={e => setSurveys(surveys.map(x => x.id === s.id ? { ...x, name: e.target.value } : x))} className="w-full bg-transparent border-b-2 border-slate-200 text-2xl font-display font-bold text-slate-800 focus:border-[#FF6B00] outline-none pb-2 transition-all placeholder:text-slate-300" placeholder="Ex: Auditoria Quinzenal" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText className="w-3 h-3" /> Descrição Breve</label>
                  <input type="text" value={s.description} onChange={e => setSurveys(surveys.map(x => x.id === s.id ? { ...x, description: e.target.value } : x))} className="w-full bg-transparent border-b-2 border-slate-200 text-sm font-medium text-slate-600 focus:border-[#FF6B00] outline-none pb-2 transition-all placeholder:text-slate-300" placeholder="Ex: Foco em ruptura e atendimento" />
                </div>
              </div>
            </div>

            {/* Lista de Perguntas (Blocos Visuais) */}
            <div className="space-y-6">
              {s.questions.map((q, idx) => (
                <div key={q.id} className="relative group">
                  <div className="absolute -left-4 top-8 -bottom-8 w-0.5 bg-slate-200 group-last:hidden"></div>
                  <div className={`card-premium p-8 border-l-[6px] transition-all hover:shadow-xl ${q.dependsOn ? 'border-orange-400 ml-8 bg-orange-50/30' : 'border-[#0F172A]'}`}>

                    {/* Topo do Card: Número e Ações */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${q.dependsOn ? 'bg-orange-100 text-orange-600' : 'bg-[#0F172A] text-white'}`}>
                          {idx + 1}
                        </div>
                        {q.dependsOn && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full border border-orange-200">
                            <Split className="w-3 h-3 text-orange-600" />
                            <span className="text-[9px] font-bold text-orange-700 uppercase tracking-widest">Condicional</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: sv.questions.filter(qu => qu.id !== q.id) } : sv))} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Remover Pergunta">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Conteúdo Principal */}
                    <div className="space-y-6">
                      {/* Pergunta */}
                      <input
                        type="text"
                        value={q.label}
                        onChange={e => setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: sv.questions.map(qu => qu.id === q.id ? { ...qu, label: e.target.value } : qu) } : sv))}
                        className="w-full text-lg font-bold text-slate-800 bg-transparent outline-none placeholder:text-slate-300 border-none p-0 focus:ring-0"
                        placeholder="Digite aqui a pergunta..."
                      />

                      <div className="border-t border-slate-100 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Seletor de Tipo (Visual) */}
                        <div className="lg:col-span-12 space-y-3">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo de Resposta</label>
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { type: 'text', icon: MessageSquare, label: 'Texto Livre' },
                              { type: 'boolean', icon: ToggleLeft, label: 'Sim / Não' },
                              { type: 'rating', icon: Star, label: 'Nota 1-5' }
                            ].map((typeObj) => (
                              <button
                                key={typeObj.type}
                                onClick={() => setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: sv.questions.map(qu => qu.id === q.id ? { ...qu, type: typeObj.type as any } : qu) } : sv))}
                                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${q.type === typeObj.type ? 'bg-slate-800 border-slate-800 text-white shadow-lg ring-2 ring-slate-800 ring-offset-2' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
                              >
                                <typeObj.icon className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase">{typeObj.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Configurações Extras */}
                        <div className="lg:col-span-12 flex flex-wrap items-center gap-6 pt-2">
                          <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all select-none">
                            <input type="checkbox" checked={q.required} onChange={e => setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: sv.questions.map(qu => qu.id === q.id ? { ...qu, required: e.target.checked } : qu) } : sv))} className="accent-[#FF6B00] w-4 h-4" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Resposta Obrigatória</span>
                          </label>

                          {/* Construtor de Condição (Lógica) */}
                          <div className="flex-1 min-w-[200px]">
                            {q.dependsOn ? (
                              <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-xl animate-scaleIn">
                                <Split className="w-4 h-4 text-orange-500 ml-2" />
                                <select
                                  value={q.dependsOn.questionId}
                                  onChange={e => setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: sv.questions.map(qu => qu.id === q.id ? { ...qu, dependsOn: { ...qu.dependsOn!, questionId: e.target.value } } : qu) } : sv))}
                                  className="bg-transparent text-[10px] font-bold text-orange-800 outline-none border-b border-orange-300 w-24"
                                >
                                  {s.questions.slice(0, idx).map(prevQ => (
                                    <option key={prevQ.id} value={prevQ.id}>{prevQ.label.substring(0, 15)}...</option>
                                  ))}
                                </select>
                                <span className="text-[9px] font-black text-orange-400 uppercase">=</span>
                                <input
                                  type="text"
                                  value={q.dependsOn.value}
                                  onChange={e => setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: sv.questions.map(qu => qu.id === q.id ? { ...qu, dependsOn: { ...qu.dependsOn!, value: e.target.value } } : qu) } : sv))}
                                  className="bg-white px-2 py-1 rounded text-[10px] font-bold text-orange-800 outline-none w-20 border border-orange-200 focus:border-orange-400"
                                  placeholder="Valor..."
                                />
                                <button onClick={() => setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: sv.questions.map(qu => qu.id === q.id ? { ...qu, dependsOn: undefined } : qu) } : sv))} className="ml-auto p-1 hover:bg-orange-200 rounded-full text-orange-600"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: sv.questions.map(qu => qu.id === q.id ? { ...qu, dependsOn: { questionId: s.questions[idx - 1]?.id || '', value: 'Sim' } } : qu) } : sv))}
                                disabled={idx === 0}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed text-[10px] font-bold uppercase tracking-widest transition-all ${idx === 0 ? 'opacity-50 cursor-not-allowed border-slate-200 text-slate-300' : 'border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'}`}
                              >
                                <Split className="w-4 h-4" /> Adicionar Condição Lógica
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-center pt-8 pb-16">
                <button onClick={() => {
                  const newQ = { id: Date.now().toString(), label: '', type: 'text' as const, required: true };
                  setSurveys(surveys.map(sv => sv.id === s.id ? { ...sv, questions: [...sv.questions, newQ] } : sv));
                }} className="flex items-center gap-3 bg-[#0F172A] text-white px-10 py-5 rounded-[2rem] shadow-xl hover:scale-105 hover:shadow-2xl transition-all group">
                  <div className="bg-white/20 p-1 rounded-full"><Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /></div>
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Adicionar Nova Pergunta</span>
                </button>
              </div>
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
