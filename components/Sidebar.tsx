
import React, { useState } from 'react';
import { Home, Server, Box, Download, BarChart3, Settings, LogOut, X, ShieldAlert, Sparkles, AlertTriangle, Users, Newspaper, Wallet } from 'lucide-react';
import { View, User } from '../types';
import { useTranslation } from '../LanguageContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: View;
  onViewChange: (view: View) => void;
  currentUser: User | null;
  onLogout: () => void;
  isAdminUser?: boolean;
  onAdminClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, currentView, onViewChange, currentUser, onLogout, isAdminUser, onAdminClick }) => {
  const { t, isRTL } = useTranslation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuItems = [
    { id: 'home', label: 'الرئيسية', icon: <Home size={22} />, desc: 'إضافات ومودات البيدروك' },
    { id: 'news', label: 'الأخبار والمنشورات', icon: <Newspaper size={22} />, desc: 'آخر تحديثات المنصة' },
    { id: 'servers', label: 'السيرفرات', icon: <Server size={22} />, desc: 'استعرض سيرفرات المجتمع' },
    { id: 'friends', label: 'الأصدقاء', icon: <Users size={22} />, desc: 'دردشة ولعب مشترك' },
    { id: 'earnings', label: 'النقاط', icon: <Wallet size={22} />, desc: 'رصيد ومكافآت حسابك' },
    { id: 'stats', label: 'لوحة التحكم', icon: <BarChart3 size={22} />, desc: 'إحصائيات إبداعاتك' },
    { id: 'downloads', label: 'التنزيلات', icon: <Download size={22} />, desc: 'الملفات المحملة' },
    { id: 'settings', label: 'الإعدادات', icon: <Settings size={22} />, desc: 'ضبط الحساب والأمان' },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] lg:hidden" onClick={onClose}></div>
      )}

      {/* Sidebar Panel */}
      <aside className={`fixed top-0 bottom-0 ${isRTL ? 'right-0' : 'left-0'} w-72 bg-[#080808] border-l border-white/5 z-[200] sidebar-transition transform ${isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')} lg:translate-x-0 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col`}>
        <div className="p-8 flex items-center justify-between border-b border-white/5">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 theme-bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(132,204,22,0.2)]">
               <Sparkles size={24} className="text-black" />
             </div>
           </div>
           <button onClick={onClose} className="lg:hidden p-2 text-zinc-500 hover:text-white transition-all"><X size={24} /></button>
        </div>

        <nav className="flex-1 p-6 space-y-3 overflow-y-auto no-scrollbar">
           {menuItems.map((item) => (
             <button
               key={item.id}
               onClick={() => { onViewChange(item.id as View); onClose(); }}
               className={`w-full flex items-center gap-5 p-5 rounded-[2rem] transition-all group ${currentView === item.id ? 'theme-bg-primary text-black shadow-2xl theme-shadow-primary-soft' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
             >
               <div className={`${currentView === item.id ? 'text-black' : 'text-zinc-700 group-hover:theme-text-primary'} transition-colors`}>{item.icon}</div>
               <div className="text-right">
                  <h4 className="text-sm font-black">{item.label}</h4>
                  <p className={`text-[9px] font-bold opacity-50 mt-0.5 ${currentView === item.id ? 'text-black/60' : 'text-zinc-700'}`}>{item.desc}</p>
               </div>
             </button>
           ))}

           {/* Admin Button in Sidebar */}
           {isAdminUser && (
             <button
               onClick={() => { onAdminClick?.(); onClose(); }}
               className="w-full flex items-center gap-5 p-5 rounded-[2rem] transition-all group bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/10 mt-6"
             >
               <div className="transition-colors"><ShieldAlert size={22} /></div>
               <div className="text-right">
                  <h4 className="text-sm font-black">لوحة الإدارة</h4>
                  <p className="text-[9px] font-bold opacity-50 mt-0.5">إدارة المحتوى والأعضاء</p>
               </div>
             </button>
           )}
        </nav>

        {currentUser && (
          <div className="p-6 border-t border-white/5 space-y-4">
             <div className="flex items-center gap-4 bg-zinc-900/30 p-4 rounded-2xl border border-white/5">
                <img src={currentUser.avatar} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="" />
                <div className="text-right">
                   <h5 className="text-xs font-black text-white leading-none">{currentUser.displayName}</h5>
                   <p className="text-zinc-600 text-[10px] text-zinc-600 mt-1 ltr">@{currentUser.username}</p>
                </div>
             </div>
             <button onClick={() => setShowLogoutConfirm(true)} className="w-full py-4 rounded-2xl text-[10px] font-black text-red-500 hover:bg-red-600/10 transition-all flex items-center justify-center gap-3 active:scale-95">
                <LogOut size={16} /> تسجيل الخروج
             </button>
          </div>
        )}
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}></div>
          <div className="bg-[#0f0f0f] border border-white/10 p-10 md:p-14 rounded-[3.5rem] w-full max-w-md relative z-10 shadow-2xl text-center animate-in zoom-in">
             <div className="w-24 h-24 bg-red-600/10 text-red-500 rounded-[1.8rem] flex items-center justify-center mx-auto mb-8 border border-red-500/20">
               <AlertTriangle size={48} />
             </div>
             <h3 className="text-2xl font-black text-white mb-4">تسجيل الخروج؟</h3>
             <p className="text-zinc-500 text-sm font-medium mb-12 leading-relaxed px-4">هل أنت متأكد من رغبتك في إنهاء الجلسة الحالية؟ ستحتاج لهذه التسجيل الدخول مجدداً للوصول لميزاتك.</p>
             <div className="flex flex-col gap-3">
                <button onClick={() => { onLogout(); setShowLogoutConfirm(false); }} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-red-900/20">نعم، سجل الخروج</button>
                <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-5 bg-zinc-900 text-zinc-500 rounded-2xl font-black text-lg hover:text-white transition-colors">إلغاء</button>
             </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
