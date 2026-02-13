
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Eye, Download, Percent, Award, Flag, BarChart3, Clock, CheckCircle, AlertTriangle, Loader2, Users, Trash2, CheckCircle2, XCircle, TrendingUp, TrendingDown, Calendar, Coins, Zap } from 'lucide-react';
import { Mod, ModReport, User } from '../types';
import { db, auth } from '../db';

interface StatsDashboardProps {
  mods: Mod[];
  initialTab?: 'stats' | 'reports';
}

type TimeRange = '24h' | '7d' | '28d' | '90d';

const StatsDashboard: React.FC<StatsDashboardProps> = ({ mods, initialTab = 'stats' }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'reports'>(initialTab);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [myReports, setMyReports] = useState<ModReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmReportAction, setConfirmReportAction] = useState<{ id: string, type: 'ignore' | 'resolve' } | null>(null);
  const [earnedPoints, setEarnedPoints] = useState<number>(0);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === 'reports') loadMyReports();
  }, [activeTab]);

  useEffect(() => {
    const fetchPoints = async () => {
        if (auth.currentUser) {
            const u = await db.get('users', auth.currentUser.uid);
            if (u) {
                const userData = u as User;
                setEarnedPoints(userData.wallet?.earned || 0);
            }
        }
    };
    fetchPoints();
  }, []);

  const loadMyReports = async () => {
    setLoadingReports(true);
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        // Fetching reports specifically sent to this publisher's mods
        const data = await db.getReportsForPublisher(userId);
        setMyReports(data);
      }
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      await db.resolveReport(reportId);
      setMyReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'reviewed' } : r));
    } finally {
      setActionLoading(null);
      setConfirmReportAction(null);
    }
  };

  const handleIgnoreReport = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      await db.deleteReport(reportId);
      setMyReports(prev => prev.filter(r => r.id !== reportId));
    } finally {
      setActionLoading(null);
      setConfirmReportAction(null);
    }
  };

  /**
   * Statistics logic with simulated trend weights based on selected time range.
   * In a real production system, this would filter DB queries by timestamp.
   */
  const stats = useMemo(() => {
    const totalViews = mods.reduce((sum, m) => sum + m.stats.views, 0);
    const totalUniqueViews = mods.reduce((sum, m) => sum + (m.stats.uniqueViews || 0), 0);
    const totalDownloads = mods.reduce((sum, m) => sum + m.stats.downloads, 0);
    const conversionRate = totalViews > 0 ? ((totalDownloads / totalViews) * 100).toFixed(1) : '0';

    // Simulate trend based on range (Real logic would compare current vs previous period documents)
    const rangeMultipliers: Record<TimeRange, number> = {
      '24h': 0.1,
      '7d': 0.8,
      '28d': 1.0,
      '90d': 1.5
    };
    
    // Weighted simulated growth for UI feedback
    const simulatedTrend = (totalViews / 1000) * rangeMultipliers[timeRange];
    const isGrowing = simulatedTrend > 0.5;

    return { 
      totalViews: Math.floor(totalViews * rangeMultipliers[timeRange]), 
      totalUniqueViews: Math.floor(totalUniqueViews * rangeMultipliers[timeRange]), 
      totalDownloads: Math.floor(totalDownloads * rangeMultipliers[timeRange]), 
      conversionRate, 
      trend: simulatedTrend.toFixed(1),
      isGrowing
    };
  }, [mods, timeRange]);

  const kFormatter = (num: number) => num > 999 ? (num / 1000).toFixed(1) + 'k' : num;

  const timeOptions: { id: TimeRange; label: string }[] = [
    { id: '24h', label: 'آخر 24 ساعة' },
    { id: '7d', label: 'آخر 7 أيام' },
    { id: '28d', label: 'آخر 28 يوم' },
    { id: '90d', label: 'آخر 90 يوم' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white">إحصائيات إبداعاتك</h2>
          <p className="text-zinc-500 font-medium text-sm">تتبع نمو جمهورك وتحليل أداء ملفاتك</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Time Range Filter Pills */}
          <div className="flex p-1 bg-zinc-900 border border-white/5 rounded-2xl gap-1">
            {timeOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setTimeRange(opt.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${timeRange === opt.id ? 'theme-bg-primary text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          
          <div className="flex p-1 bg-zinc-900 border border-white/5 rounded-2xl gap-1">
             <button 
               onClick={() => setActiveTab('stats')}
               className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'stats' ? 'theme-bg-primary text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
             >
               <BarChart3 size={16} /> الأداء
             </button>
             <button 
               onClick={() => setActiveTab('reports')}
               className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'reports' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
             >
               <Flag size={16} /> البلاغات {myReports.length > 0 && <span className="bg-white/20 px-1.5 rounded-md text-[8px] ml-1">{myReports.length}</span>}
             </button>
          </div>
        </div>
      </div>

      {activeTab === 'stats' ? (
        <div className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'إجمالي المشاهدات', value: kFormatter(stats.totalViews), icon: <Eye />, color: 'text-blue-500' },
              { label: 'مشاهدات فريدة', value: kFormatter(stats.totalUniqueViews), icon: <Users />, color: 'text-cyan-500' },
              { label: 'إجمالي التحميلات', value: kFormatter(stats.totalDownloads), icon: <Download />, color: 'theme-text-primary' },
              { label: 'معدل التحويل', value: `${stats.conversionRate}%`, icon: <Percent />, color: 'text-orange-500' },
            ].map((stat, i) => (
              <div key={i} className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden group hover:border-white/10 transition-all">
                <div className={`p-3 rounded-2xl bg-zinc-950 border border-zinc-800 w-fit mb-5 ${stat.color}`}>
                  {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 22 })}
                </div>
                <h4 className="text-[10px] text-zinc-500 font-black mb-1 uppercase tracking-widest">{stat.label}</h4>
                <div className="flex items-end justify-between">
                   <p className="text-3xl font-black text-white">{stat.value}</p>
                   <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${stats.isGrowing ? 'bg-lime-500/10 text-lime-500' : 'bg-red-500/10 text-red-500'}`}>
                      {stats.isGrowing ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {stats.trend}%
                   </div>
                </div>
              </div>
            ))}
          </div>

          {/* Points from Views Card */}
          <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[3.5rem] shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 blur-[100px] pointer-events-none"></div>
             <div className="flex items-center gap-6 relative z-10">
                <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-[2rem] flex items-center justify-center border border-yellow-500/20 shadow-lg">
                   <Zap size={32} className="fill-yellow-500" />
                </div>
                <div>
                   <h3 className="text-white font-black text-2xl">النقاط المكتسبة</h3>
                   <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">مجموع النقاط من المشاهدات</p>
                </div>
                <div className="mr-auto text-left">
                   <span className="text-4xl font-black text-white block">{earnedPoints.toFixed(1)}</span>
                   <span className="text-yellow-500 text-xs font-black uppercase tracking-widest">نقطة</span>
                </div>
             </div>
          </div>

          {/* Graphical Visualization */}
          <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-[3.5rem] shadow-2xl">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h4 className="text-white font-black text-lg">أداء المحتوى</h4>
                   <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest mt-1">Growth Visualization</p>
                </div>
                <div className="bg-zinc-950 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full theme-bg-primary animate-pulse"></div>
                   <span className="text-[10px] font-black text-zinc-500">معدل التفاعل</span>
                </div>
             </div>
             <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={mods.slice(0, 7).map((m) => ({ name: m.title.substring(0, 10), val: m.stats.uniqueViews }))}>
                      <defs>
                         <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#444', fontSize: 10, fontWeight: 900}} dy={10} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', fontSize: '12px'}} 
                        itemStyle={{color: 'var(--primary-color)', fontWeight: 'black'}}
                      />
                      <Area type="monotone" dataKey="val" stroke="var(--primary-color)" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="flex items-center justify-between px-2 mb-8">
              <h3 className="text-2xl font-black text-white">البلاغات الواردة على موداتك</h3>
              <span className="px-6 py-2 bg-zinc-900 border border-white/5 rounded-full text-[10px] font-black text-red-500">{myReports.length} بلاغ نشط</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myReports.map(rep => (
                <div key={rep.id} className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] space-y-6 shadow-2xl relative overflow-hidden group">
                   <div className={`absolute top-0 right-0 w-1.5 h-full ${rep.status === 'reviewed' ? 'bg-lime-500' : 'bg-red-500 animate-pulse'}`}></div>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${rep.status === 'reviewed' ? 'bg-lime-500/10 text-lime-500 border-lime-500/20' : 'bg-red-600/10 text-red-500 border-red-500/20'}`}><Flag size={24} /></div>
                         <div className="text-right">
                            <h4 className="text-white font-black text-lg truncate max-w-[220px]">{rep.modTitle}</h4>
                            <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-1">بواسطة: {rep.reporterName}</p>
                         </div>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black ${rep.status === 'reviewed' ? 'bg-lime-500/10 text-lime-500' : 'bg-red-600/10 text-red-500'}`}>
                         {rep.status === 'reviewed' ? 'تم الحل' : 'بلاغ جديد'}
                      </span>
                   </div>
                   <div className="bg-zinc-950/50 p-6 rounded-2xl border border-white/5">
                      <p className="text-zinc-400 text-sm font-medium leading-relaxed italic">"{rep.reason}"</p>
                   </div>
                   {rep.status !== 'reviewed' && (
                     <div className="grid grid-cols-2 gap-4 pt-2">
                        <button onClick={() => setConfirmReportAction({ id: rep.id, type: 'resolve' })} className="py-4 bg-lime-500 text-black rounded-2xl font-black text-xs active:scale-95 transition-all shadow-xl shadow-lime-900/20">تأكيد الإصلاح</button>
                        <button onClick={() => setConfirmReportAction({ id: rep.id, type: 'ignore' })} className="py-4 bg-zinc-800 text-zinc-500 rounded-2xl font-black text-xs hover:text-white transition-all">تجاهل البلاغ</button>
                     </div>
                   )}
                </div>
              ))}
              {myReports.length === 0 && !loadingReports && (
                <div className="col-span-full py-40 text-center border-2 border-dashed border-zinc-900 rounded-[4rem] text-zinc-700 font-black">
                   <CheckCircle2 size={48} className="mx-auto mb-6 opacity-20" />
                   <p className="text-xl">سجلك نظيف من البلاغات حالياً</p>
                </div>
              )}
              {loadingReports && <div className="col-span-full py-40 flex justify-center"><Loader2 className="animate-spin text-lime-500" size={48} /></div>}
           </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmReportAction && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => !actionLoading && setConfirmReportAction(null)}></div>
           <div className="bg-[#0f0f0f] border border-white/10 p-10 md:p-14 rounded-[4rem] w-full max-w-md relative z-10 shadow-2xl text-center animate-in zoom-in">
              <div className={`w-24 h-24 rounded-[1.8rem] flex items-center justify-center mx-auto mb-8 shadow-xl ${confirmReportAction.type === 'ignore' ? 'bg-red-600/10 text-red-500 border border-red-500/20' : 'theme-bg-primary-alpha theme-text-primary border theme-border-primary-alpha'}`}>
                {confirmReportAction.type === 'ignore' ? <Trash2 size={48} /> : <CheckCircle2 size={48} />}
              </div>
              <h3 className="text-2xl font-black text-white mb-4">
                {confirmReportAction.type === 'ignore' ? 'تجاهل البلاغ الوارد' : 'تأكيد الإصلاح'}
              </h3>
              <div className="flex flex-col gap-3">
                 <button 
                  onClick={() => confirmReportAction.type === 'ignore' ? handleIgnoreReport(confirmReportAction.id) : handleResolveReport(confirmReportAction.id)} 
                  disabled={!!actionLoading} 
                  className={`w-full py-5 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 ${confirmReportAction.type === 'ignore' ? 'bg-red-600 text-white' : 'theme-bg-primary text-black'}`}
                 >
                   {actionLoading ? <Loader2 className="animate-spin" /> : <CheckCircle size={22} />} تأكيد التنفيذ
                 </button>
                 <button onClick={() => setConfirmReportAction(null)} disabled={!!actionLoading} className="w-full py-5 bg-zinc-900 text-zinc-500 rounded-2xl font-black text-lg hover:text-white transition-colors">إلغاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StatsDashboard;
