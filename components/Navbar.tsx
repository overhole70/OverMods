
import React, { useState, useEffect } from 'react';
import { Bell, Plus, Menu, Sparkles } from 'lucide-react';
import { User, View } from '../types';
import { db } from '../db';
import { useTranslation } from '../LanguageContext';

interface NavbarProps {
  currentUser: User | null;
  onViewChange: (view: View) => void;
  onSearch: (term: string) => void;
  isOnline: boolean;
  isAdminUser?: boolean;
  onAdminClick?: () => void;
  currentView?: string;
  onMenuClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser, onViewChange, onSearch, isOnline, currentView, onMenuClick }) => {
  const { t, isRTL } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (currentUser) {
      const fetchNotifs = () => db.getNotifications(currentUser.id).then(n => setUnreadCount(n.filter(i => !i.isRead).length));
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  return (
    <nav className="h-24 bg-black/80 border-b border-white/5 flex items-center justify-between px-6 md:px-12 sticky top-0 z-[100] backdrop-blur-2xl">
      <div className="flex items-center gap-6">
        <button onClick={onMenuClick} className="p-3 bg-zinc-900 rounded-2xl text-zinc-400 hover:text-white lg:hidden active:scale-90 transition-all"><Menu size={24} /></button>
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onViewChange('home')}>
          <div className="w-10 h-10 theme-bg-primary rounded-xl flex items-center justify-center shadow-lg theme-shadow-primary-soft group-hover:rotate-6 transition-transform">
            <Sparkles size={20} className="text-black" />
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center">
         <span className="text-zinc-800 font-black text-[10px] uppercase tracking-[0.5em]">Bedrock Community Platform</span>
      </div>

      <div className="flex items-center gap-4">
        {currentUser ? (
          <div className="flex items-center gap-3">
            <button 
                onClick={() => onViewChange('notifications')}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl transition-all relative flex items-center justify-center border ${currentView === 'notifications' ? 'theme-bg-primary text-black theme-border-primary shadow-xl' : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/10'}`}
              >
                <Bell size={24} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-7 min-w-[28px] px-1.5 bg-red-600 text-white text-[11px] font-black rounded-full border-[3px] border-black flex items-center justify-center shadow-[0_4px_15px_rgba(220,38,38,0.5)] z-20 animate-in zoom-in duration-300">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
            </button>

            <button 
              onClick={() => onViewChange('upload')} 
              className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all border ${currentView === 'upload' ? 'theme-bg-primary text-black theme-border-primary shadow-xl' : 'bg-zinc-900 text-zinc-400 border-white/5 hover:border-white/10'} active:scale-90`}
            >
              <Plus size={24} strokeWidth={3} />
            </button>

            <button onClick={() => onViewChange('profile')} className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl p-1 transition-all border-2 ${currentView === 'profile' ? 'theme-border-primary shadow-xl' : 'border-white/5 bg-zinc-900'} active:scale-95`}>
              <img src={currentUser.avatar} className="w-full h-full rounded-xl object-cover" alt="" />
            </button>
          </div>
        ) : (
          <button onClick={() => onViewChange('login')} className="bg-white text-black px-6 md:px-10 h-12 md:h-14 rounded-2xl text-xs md:text-sm font-black hover:theme-bg-primary transition-all shadow-2xl active:scale-95">
            {t('common.login')}
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
