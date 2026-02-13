import React, { useState, useMemo } from 'react';
import { Mod, User, ModType } from '../types';
import { MOD_TYPES, CATEGORIES } from './constants';
import { Search, RotateCw, SlidersHorizontal, ArrowDownNarrowWide, Clock, TrendingUp, Star, LayoutGrid, Filter, Ghost, Zap } from 'lucide-react';
import ModCard from './ModCard';
import { db } from '../db';
import { useTranslation } from '../LanguageContext';

interface HomeViewProps {
  mods: Mod[];
  currentUser: User | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  onModClick: (mod: Mod) => void;
  onNavigate: (path: string) => void;
  isRTL: boolean;
  trackUserInterest: (category: string) => void;
}

type SortType = 'newest' | 'most_viewed' | 'highest_rated' | 'recommended';

const HomeView: React.FC<HomeViewProps> = ({ 
  mods, currentUser, searchTerm, setSearchTerm, isRefreshing, onRefresh, onModClick, onNavigate, isRTL, trackUserInterest 
}) => {
  const [filterType, setFilterType] = useState<ModType | 'All'>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortType>('recommended');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const processedMods = useMemo(() => {
    const userInterests = JSON.parse(localStorage.getItem('user_interests') || '{}');
    const s = searchTerm.toLowerCase().trim();
    
    let list = mods.filter(m => {
      const matchSearch = s === '' || 
        m.title?.toLowerCase().includes(s) || 
        (m.shareCode && m.shareCode.toLowerCase().includes(s));
      const matchType = filterType === 'All' || m.type === filterType;
      const matchCat = filterCategory === 'All' || m.category === filterCategory;
      return matchSearch && matchType && matchCat && m.type !== 'Server';
    });

    return list.sort((a, b) => {
      if (sortBy === 'most_viewed') return (b.stats?.views || 0) - (a.stats?.views || 0);
      if (sortBy === 'highest_rated') return (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0);
      if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();

      const weightA = (userInterests[a.category] || 0) * 10 + ((a.stats?.uniqueViews || 0) / 500) + (new Date(a.createdAt || 0).getTime() / 100000000);
      const weightB = (userInterests[b.category] || 0) * 10 + ((b.stats?.uniqueViews || 0) / 500) + (new Date(b.createdAt || 0).getTime() / 100000000);
      return weightB - weightA;
    });
  }, [mods, searchTerm, filterType, filterCategory, sortBy]);

  return (
    <div className="space-y-12">
      <div className="py-16 md:py-24 px-6 text-center space-y-8 relative overflow-hidden rounded-[3rem] md:rounded-[5rem] border border-white/5 bg-[#080808] shadow-2xl">
          <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none"></div>
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-6 py-2 bg-zinc-900/50 border border-white/5 rounded-full theme-text-primary text-[10px] font-black uppercase tracking-[0.3em]"><Zap size={14} fill="currentColor" /> Over Mods Discovery</div>
            <h1 className="text-4xl md:text-7xl font-black text-white leading-tight">إبداعات <span className="theme-text-primary">البيدروك</span></h1>
            <p className="text-zinc-500 max-w-xl mx-auto font-medium text-sm md:text-lg leading-relaxed">اكتشف مودات مخصصة لاهتماماتك بناءً على نشاطك في المنصة.</p>
          </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative group flex-1 w-full">
            <Search className={`absolute ${isRTL ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:theme-text-primary transition-colors`} size={20} />
            <input 
              type="text" 
              placeholder="ابحث عن مود، ريسورس باك..." 
              value={searchTerm} 
              className={`w-full bg-zinc-900 border border-white/5 rounded-[2rem] py-5 ${isRTL ? 'pr-16 pl-6' : 'pl-16 pr-6'} focus:theme-border-primary-alpha text-white font-bold transition-all shadow-inner outline-none`} 
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value.length > 3) trackUserInterest(filterCategory);
              }} 
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)} 
                className={`h-16 px-6 rounded-2xl border transition-all flex items-center gap-3 font-black text-xs ${isFilterOpen ? 'theme-bg-primary text-black border-transparent shadow-xl' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'}`}
              >
                <SlidersHorizontal size={20} />
                {isFilterOpen ? 'إغلاق الفلاتر' : 'تصفية النتائج'}
              </button>
              <button onClick={onRefresh} className="w-16 h-16 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center text-zinc-500 hover:theme-text-primary transition-all active:scale-90"><RotateCw size={24} className={isRefreshing ? "animate-spin" : ""} /></button>
          </div>
        </div>

        {isFilterOpen && (
          <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[3rem] grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-top-4 duration-300">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2"><ArrowDownNarrowWide size={14}/> ترتيب حسب</label>
                <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'recommended', label: 'المقترح لك', icon: <Zap size={14}/> },
                      { id: 'newest', label: 'الأحدث', icon: <Clock size={14}/> },
                      { id: 'most_viewed', label: 'الأكثر مشاهدة', icon: <TrendingUp size={14}/> },
                      { id: 'highest_rated', label: 'الأعلى تقييماً', icon: <Star size={14}/> }
                    ].map(opt => (
                      <button 
                        key={opt.id} 
                        onClick={() => setSortBy(opt.id as any)}
                        className={`px-5 py-3 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 ${sortBy === opt.id ? 'theme-bg-primary text-black' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2"><LayoutGrid size={14}/> النوع</label>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setFilterType('All')} className={`px-5 py-3 rounded-xl text-[10px] font-black transition-all ${filterType === 'All' ? 'theme-bg-primary text-black' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}>الكل</button>
                    {MOD_TYPES.filter(t => t.value !== 'Server').map(t => (
                      <button key={t.value} onClick={() => setFilterType(t.value)} className={`px-5 py-3 rounded-xl text-[10px] font-black transition-all ${filterType === t.value ? 'theme-bg-primary text-black' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}>{t.label}</button>
                    ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2"><Filter size={14}/> الفئة</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar p-1">
                    <button onClick={() => setFilterCategory('All')} className={`px-5 py-3 rounded-xl text-[10px] font-black transition-all ${filterCategory === 'All' ? 'theme-bg-primary text-black' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}>الكل</button>
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => { setFilterCategory(cat); trackUserInterest(cat); }} className={`px-5 py-3 rounded-xl text-[10px] font-black transition-all ${filterCategory === cat ? 'theme-bg-primary text-black' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}>{cat}</button>
                    ))}
                </div>
              </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-6">
          {processedMods.map(m => (
            <ModCard 
              key={m.id} 
              mod={m} 
              onClick={() => onModClick(m)} 
              isFollowing={currentUser?.following?.includes(m.publisherId) || false} 
              onFollow={(e) => { e.stopPropagation(); db.followUser(currentUser!.id, m.publisherId); }} 
            />
          ))}
        </div>
        
        {processedMods.length === 0 && !isRefreshing && (
          <div className="py-40 text-center border-2 border-dashed border-zinc-900 rounded-[4rem] text-zinc-700 font-black animate-in fade-in">
              <Ghost size={48} className="mx-auto mb-6 opacity-20" />
              <p className="text-xl">لم نجد أي إضافات تطابق اختياراتك</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeView;