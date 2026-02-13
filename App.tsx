import React, { useState, useEffect, useRef } from 'react';
// Removed Routes, Route, Navigate, useNavigate, useLocation
import { Mod, User, View, MinecraftServer, NewsItem } from './types';
import { db, auth, firestore } from './db';
import { doc, onSnapshot } from 'firebase/firestore';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import PageRenderer from './components/PageRenderer';
import GlobalPopup from './components/GlobalPopup';
import SecurityCheckpoint from './components/SecurityCheckpoint';
import { Loader2, Lock, Home, Users, Newspaper, Settings, Server, Youtube } from 'lucide-react';
import { useTranslation } from './LanguageContext';

const ADMIN_EMAIL = 'overmods1@gmail.com';
const ADMIN_CODE = 'Aiopwbxj';

export default function App() {
  const { t, isRTL } = useTranslation();
  // Removed hooks
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLockedBySecurity, setIsLockedBySecurity] = useState(false);
  const [mods, setMods] = useState<Mod[]>([]);
  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [newsSnippet, setNewsSnippet] = useState<NewsItem | null>(null);
  const [userDownloads, setUserDownloads] = useState<Mod[]>([]);
  const [editingItem, setEditingItem] = useState<Mod | MinecraftServer | null>(null);
  
  // Navigation State
  const [currentView, setCurrentView] = useState<string>('home');
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isBottomBarIdle, setIsBottomBarIdle] = useState(false);
  const idleTimerRef = useRef<any>(null);
  const initialLoadDone = useRef(false);

  const trackUserInterest = (category: string) => {
    if (!category) return;
    const stored = localStorage.getItem('user_interests');
    const interests = stored ? JSON.parse(stored) : {};
    interests[category] = (interests[category] || 0) + 1;
    localStorage.setItem('user_interests', JSON.stringify(interests));
  };

  const resetIdleTimer = () => {
    setIsBottomBarIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsBottomBarIdle(true);
    }, 3000);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Update idle timer on view change
  useEffect(() => {
    resetIdleTimer();
    window.scrollTo(0, 0);
  }, [currentView]);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;
    const authUnsubscribe = db.onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Set flag that user has been here before ONLY after successful auth
        localStorage.setItem('has_visited_app', 'true');
        
        profileUnsubscribe = onSnapshot(doc(firestore, 'users', firebaseUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as User;
            
            // Check Security Code Lock
            if (profile.securityCode && profile.securityCodeFrequency) {
               const logins = profile.loginsSinceLastCode || 0;
               // If frequency is 1 (always) or logins exceed/meet threshold
               if (logins >= profile.securityCodeFrequency) {
                  setIsLockedBySecurity(true);
               } else {
                  setIsLockedBySecurity(false);
               }
            } else {
               setIsLockedBySecurity(false);
            }

            if (profile.isBlocked && profile.email !== ADMIN_EMAIL) {
              await db.logout(); setCurrentUser(null); setCurrentView('login');
              setIsInitialized(true);
              return;
            }
            const verified = auth.currentUser?.emailVerified || false;
            setCurrentUser({ ...profile, email: firebaseUser.email || '', emailVerified: verified });
          }
          setIsInitialized(true); 
        }, (err) => {
          console.error("Profile snapshot error:", err);
          setIsInitialized(true);
        });
      } else { 
        if (profileUnsubscribe) profileUnsubscribe();
        setCurrentUser(null); setIsAdminAuthenticated(false);
        setIsLockedBySecurity(false);
        setUserDownloads([]);
        setIsInitialized(true);
        
        // Strict First Time Check: If not visited/logged-in before, force login view
        if (!localStorage.getItem('has_visited_app')) {
           setCurrentView('login');
        }
      }
    });

    if (!initialLoadDone.current) {
      initializeData();
      initialLoadDone.current = true;
    }

    return () => { 
      authUnsubscribe(); 
      if (profileUnsubscribe) profileUnsubscribe(); 
    };
  }, []);

  useEffect(() => {
    if (currentUser?.isVerified && initialLoadDone.current) {
      initializeData();
    }
  }, [currentUser?.isVerified]);

  const initializeData = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const [m, s, n] = await Promise.all([
        db.getAll('mods', 100),
        db.getAll('servers', 24),
        db.getAll('news', 1)
      ]);
      setMods(m as Mod[] || []);
      setServers(s as MinecraftServer[] || []);
      if (n && n.length > 0) setNewsSnippet(n[0] as NewsItem);
      setIsOffline(false);
    } catch (e) {
      setIsOffline(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNavClick = (view: string) => {
    resetIdleTimer();
    if (!currentUser && ['upload', 'profile', 'notifications', 'stats', 'settings', 'edit-profile', 'friends', 'earnings', 'downloads', 'join-creators'].includes(view)) {
      setCurrentView('login'); return;
    }

    if (view === 'upload' && currentUser) {
      if (!currentUser.verificationStatus || currentUser.verificationStatus === 'none') {
        setCurrentView('join-creators');
        return;
      }
    }

    // Always reset editing item when using main navigation
    setEditingItem(null);
    
    setCurrentView(view);
  };

  const isAdmin = currentUser?.email === ADMIN_EMAIL || currentUser?.role === 'Admin';
  const isLoginPage = currentView === 'login';

  if (!isInitialized) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin theme-text-primary" size={48} /></div>;

  if (isLockedBySecurity && currentUser) {
    return (
      <SecurityCheckpoint 
        user={currentUser} 
        onSuccess={() => setIsLockedBySecurity(false)}
        onLogout={() => { db.logout(); setCurrentUser(null); setIsLockedBySecurity(false); setCurrentView('login'); }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#050505] text-white overflow-x-hidden">
      {/* Global System Popup */}
      <GlobalPopup onNavigate={handleNavClick} />

      {!isLoginPage && (
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} currentView={currentView as View} onViewChange={(v) => handleNavClick(v)} currentUser={currentUser} onLogout={() => { db.logout(); setCurrentUser(null); setCurrentView('login'); }} isAdminUser={isAdmin || currentUser?.role === 'Helper'} onAdminClick={() => isAdminAuthenticated ? setCurrentView('admin') : setShowAdminModal(true)} />
      )}

      <div className={`flex-1 flex flex-col ${!isLoginPage ? 'lg:mr-72' : ''} min-h-screen relative ${!isLoginPage ? 'pb-28' : ''}`}>
        {!isLoginPage && (
          <Navbar currentUser={currentUser} onViewChange={(v) => handleNavClick(v)} onSearch={setSearchTerm} isOnline={!isOffline} currentView={currentView} onMenuClick={() => setIsSidebarOpen(true)} />
        )}

        <main className="flex-1 px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* YouTuber video submission reminder */}
            {currentUser && currentUser.verificationStatus === 'youtuber_no_video' && !isLoginPage && (
              <div className="mb-8 p-6 bg-red-600/10 border border-red-500/20 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Youtube size={28} /></div>
                    <div className="text-right">
                       <h4 className="text-white font-black text-lg">بانتظار فيديو التوثيق</h4>
                       <p className="text-zinc-500 text-sm font-medium">يرجى رفع فيديو "غير مدرج" لإثبات ملكية قناتك والحصول على شارة التوثيق.</p>
                    </div>
                 </div>
                 <button onClick={() => setCurrentView('join-creators')} className="px-8 py-3 bg-red-600 text-white rounded-xl font-black text-xs active:scale-95 transition-all shadow-xl">إكمال التوثيق</button>
              </div>
            )}

            <PageRenderer 
              activePage={currentView}
              onNavigate={handleNavClick}
              currentUser={currentUser}
              mods={mods}
              servers={servers}
              newsSnippet={newsSnippet}
              userDownloads={userDownloads}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              isRefreshing={isRefreshing}
              initializeData={initializeData}
              trackUserInterest={trackUserInterest}
              isRTL={isRTL}
              isAdminAuthenticated={isAdminAuthenticated}
              setIsAdminAuthenticated={setIsAdminAuthenticated}
              setShowAdminModal={setShowAdminModal}
              setCurrentUser={setCurrentUser}
              editingItem={editingItem}
              setEditingItem={setEditingItem}
              db={db}
            />
          </div>
        </main>

        {/* Floating Bottom Navigation */}
        {!isLoginPage && (
          <div 
            className={`fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 md:gap-1.5 p-1.5 md:p-2 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-all duration-500 ease-in-out ${
              isBottomBarIdle 
                ? 'bg-black/60 backdrop-blur-md border border-white/5 opacity-80 hover:opacity-100 hover:bg-[#0a0a0a]/95 scale-95 hover:scale-100' 
                : 'bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 opacity-100 scale-100'
            }`}
            onClick={resetIdleTimer}
            onTouchStart={resetIdleTimer}
          >
            <button 
              onClick={() => handleNavClick('home')}
              className={`flex flex-col items-center justify-center w-14 md:w-[4.5rem] h-14 md:h-16 rounded-[1.5rem] md:rounded-[2rem] transition-all gap-0.5 md:gap-1 ${currentView === 'home' ? 'theme-bg-primary text-black shadow-lg theme-shadow-primary scale-105' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <Home className="w-5 h-5 md:w-[22px] md:h-[22px]" strokeWidth={currentView === 'home' ? 3 : 2} />
              <span className="text-[8px] md:text-[9px] font-black">الرئيسية</span>
            </button>
            
            <button 
              onClick={() => handleNavClick('friends')}
              className={`flex flex-col items-center justify-center w-14 md:w-[4.5rem] h-14 md:h-16 rounded-[1.5rem] md:rounded-[2rem] transition-all gap-0.5 md:gap-1 ${currentView === 'friends' ? 'theme-bg-primary text-black shadow-lg theme-shadow-primary scale-105' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <Users className="w-5 h-5 md:w-[22px] md:h-[22px]" strokeWidth={currentView === 'friends' ? 3 : 2} />
              <span className="text-[8px] md:text-[9px] font-black">الأصدقاء</span>
            </button>

            <button 
              onClick={() => handleNavClick('news')}
              className={`flex flex-col items-center justify-center w-14 md:w-[4.5rem] h-14 md:h-16 rounded-[1.5rem] md:rounded-[2rem] transition-all gap-0.5 md:gap-1 ${currentView === 'news' ? 'theme-bg-primary text-black shadow-lg theme-shadow-primary scale-105' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <Newspaper className="w-5 h-5 md:w-[22px] md:h-[22px]" strokeWidth={currentView === 'news' ? 3 : 2} />
              <span className="text-[8px] md:text-[9px] font-black">المنشورات</span>
            </button>

            <button 
              onClick={() => handleNavClick('servers')}
              className={`flex flex-col items-center justify-center w-14 md:w-[4.5rem] h-14 md:h-16 rounded-[1.5rem] md:rounded-[2rem] transition-all gap-0.5 md:gap-1 ${currentView === 'servers' ? 'theme-bg-primary text-black shadow-lg theme-shadow-primary scale-105' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <Server className="w-5 h-5 md:w-[22px] md:h-[22px]" strokeWidth={currentView === 'servers' ? 3 : 2} />
              <span className="text-[8px] md:text-[9px] font-black">السيرفرات</span>
            </button>

            <button 
              onClick={() => handleNavClick('settings')}
              className={`flex flex-col items-center justify-center w-14 md:w-[4.5rem] h-14 md:h-16 rounded-[1.5rem] md:rounded-[2rem] transition-all gap-0.5 md:gap-1 ${currentView === 'settings' ? 'theme-bg-primary text-black shadow-lg theme-shadow-primary scale-105' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
            >
              <Settings className="w-5 h-5 md:w-[22px] md:h-[22px]" strokeWidth={currentView === 'settings' ? 3 : 2} />
              <span className="text-[8px] md:text-[9px] font-black">الإعدادات</span>
            </button>
          </div>
        )}
      </div>

      {showAdminModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setShowAdminModal(false)}></div>
          <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[3.5rem] w-full max-md relative z-10 text-center animate-in zoom-in">
             <div className="w-20 h-20 bg-zinc-900 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl"><Lock size={40} /></div>
             <h3 className="text-2xl font-black mb-8">منطقة المسؤولين</h3>
             <form onSubmit={(e) => { e.preventDefault(); if (adminInput === ADMIN_CODE) { setIsAdminAuthenticated(true); setShowAdminModal(false); setAdminInput(''); setCurrentView('admin'); } else alert('كود الإدارة غير صحيح'); }} className="space-y-6">
                <input type="password" value={adminInput} autoFocus onChange={(e) => setAdminInput(e.target.value)} placeholder="كود الإدارة" className="w-full bg-zinc-900 border border-white/5 rounded-3xl py-5 text-center text-white font-black outline-none focus:border-white/20 tracking-[0.6em] text-xl" />
                <button type="submit" className="w-full py-5 theme-bg-primary text-black rounded-3xl font-black text-lg active:scale-95 transition-all">تحقق ودخول</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}