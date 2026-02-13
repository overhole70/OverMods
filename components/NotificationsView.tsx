
import React, { useState, useEffect, useMemo } from 'react';
import { User, Notification, ModReport } from '../types';
import { db } from '../db';
import { 
  Bell, BellOff, Info, Sparkles, Clock, X, Trash2, 
  Eraser, Loader2, LayoutGrid, ShieldAlert, ArrowRight, 
  Flag, ExternalLink, CheckCheck, Inbox, AlertTriangle, Trophy, Mail
} from 'lucide-react';
import { useTranslation } from '../LanguageContext';

interface NotificationsViewProps {
  currentUser: User;
  onModClick: (id: string) => void;
  onBack: () => void;
  onViewReports?: () => void;
}

type NotificationCategory = 'all' | 'unread' | 'system';

const NotificationsView: React.FC<NotificationsViewProps> = ({ currentUser, onModClick, onBack, onViewReports }) => {
  const { t, isRTL } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reportsCount, setReportsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [notifsData, reportsData] = await Promise.all([
        db.getNotifications(currentUser.id),
        db.getReportsForPublisher(currentUser.id)
      ]);
      setNotifications(notifsData as Notification[]);
      setReportsCount(reportsData.length);
    } catch (err) {
      console.error("Failed to load notifications hub data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (activeCategory === 'unread') return notifications.filter(n => !n.isRead);
    if (activeCategory === 'system') return notifications.filter(n => n.type === 'system' || n.type === 'admin');
    return notifications;
  }, [notifications, activeCategory]);

  const markRead = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (notif && !notif.isRead) {
      await db.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }
  };

  const deleteNotif = async () => {
    if (!notifToDelete) return;
    try {
      const id = notifToDelete;
      setNotifications(prev => prev.filter(n => n.id !== id));
      await db.deleteNotification(id);
      setNotifToDelete(null);
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    try {
      const promises = unread.map(n => db.markNotificationRead(n.id));
      await Promise.all(promises);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const deleteAllNotifs = async () => {
    setIsDeletingAll(true);
    try {
      await db.deleteAllNotifications(currentUser.id);
      setNotifications([]);
      setShowConfirmClear(false);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const renderIcon = (iconName?: string, type?: string) => {
    const iconMap: Record<string, any> = {
      'Bell': Bell,
      'Sparkles': Sparkles,
      'ShieldAlert': ShieldAlert,
      'Trophy': Trophy,
      'Info': Info,
      'Mail': Mail
    };

    const IconComp = (iconName && iconMap[iconName]) 
      ? iconMap[iconName] 
      : (type === 'post' ? Sparkles : (type === 'admin' ? ShieldAlert : Info));

    return <IconComp size={36} />;
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-12 h-12 text-lime-500 animate-spin" />
        <p className="text-zinc-600 font-black text-xs uppercase tracking-widest">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-2 sm:px-4">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-[#080808] p-8 sm:p-10 rounded-[3.5rem] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-lime-500/10 text-lime-500 rounded-[1.75rem] flex items-center justify-center border border-lime-500/20 shadow-xl shrink-0">
            <Bell size={40} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">{t('notifications.hub_title')}</h2>
            <p className="text-zinc-500 text-sm font-medium">{t('notifications.hub_desc')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={markAllRead}
            className="flex-1 sm:flex-none px-8 py-5 bg-zinc-950 hover:bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg"
          >
            <CheckCheck size={20} className="text-lime-500" />
            <span>قراءة الكل</span>
          </button>
          <button 
            onClick={() => setShowConfirmClear(true)} 
            disabled={notifications.length === 0}
            className="flex-1 sm:flex-none px-8 py-5 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30 shadow-lg"
          >
            <Eraser size={20} />
            <span>تصفير</span>
          </button>
        </div>
      </div>

      {/* Reports Alert Boxed */}
      {reportsCount > 0 && (
        <div className="bg-red-600/10 border border-red-500/30 p-8 rounded-[2.5rem] flex flex-col sm:flex-row items-center gap-8 animate-in slide-in-from-top-4 duration-500 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-full h-full bg-red-600/5 pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
           <div className="w-20 h-20 bg-red-600 text-white rounded-[1.75rem] flex items-center justify-center shrink-0 shadow-2xl relative z-10">
             <Flag size={36} className="animate-pulse" />
           </div>
           <div className="flex-1 text-center sm:text-right relative z-10">
             <h3 className="text-2xl font-black text-white mb-1">بلاغات قيد المراجعة</h3>
             <p className="text-zinc-400 text-sm font-medium">
               يوجد <span className="text-red-500 font-black">{reportsCount} تنبيه</span> حول محتواك المنشور.
             </p>
           </div>
           <button 
             onClick={() => onViewReports?.()}
             className="w-full sm:w-auto px-10 py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 relative z-10"
           >
             <ExternalLink size={18} /> مراجعة الآن
           </button>
        </div>
      )}

      {/* Categories Tabs Boxed */}
      <div className="flex items-center gap-2 p-2 bg-zinc-950/50 border border-white/5 rounded-3xl w-fit">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'unread', label: 'غير مقروءة' },
          { id: 'system', label: 'إشعارات النظام' }
        ].map(cat => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as NotificationCategory)}
            className={`px-8 py-4 rounded-2xl text-[11px] font-black transition-all ${activeCategory === cat.id ? 'bg-lime-500 text-black shadow-xl shadow-lime-900/20' : 'text-zinc-600 hover:text-white hover:bg-white/5'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main List - Boxed Style */}
      <div className="space-y-6">
        {filteredNotifications.map(n => (
          <div 
            key={n.id} 
            onClick={() => markRead(n.id)}
            className={`group relative p-8 rounded-[3rem] border transition-all duration-500 flex flex-col sm:flex-row items-start gap-8 cursor-pointer
              ${n.isRead 
                ? 'bg-zinc-900/20 border-white/5 opacity-50 hover:opacity-100 hover:bg-zinc-900/40' 
                : 'bg-[#0a0a0a] border-lime-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:border-lime-500/40'}`}
          >
            {/* Status Pulse */}
            {!n.isRead && (
              <div className={`absolute top-10 ${isRTL ? 'right-10' : 'left-10'} w-4 h-4 bg-lime-500 rounded-full shadow-[0_0_20px_rgba(132,204,22,1)] animate-pulse z-20 border-4 border-black`}></div>
            )}
            
            <div className={`w-20 h-20 rounded-[1.75rem] flex items-center justify-center shrink-0 shadow-inner border transition-all duration-500 group-hover:scale-105
              ${n.type === 'post' ? 'bg-blue-600/10 text-blue-500 border-blue-500/20' : 
                n.type === 'admin' ? 'bg-red-600/10 text-red-500 border-red-500/20' : 'bg-lime-500/10 text-lime-500 border-lime-500/20'}`}>
              {renderIcon(n.icon, n.type)}
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-start justify-between gap-6">
                <div className="flex flex-col gap-1">
                  <h4 className={`font-black text-xl sm:text-2xl leading-tight ${n.isRead ? 'text-zinc-500' : 'text-white'}`}>{n.title}</h4>
                  <div className="flex items-center gap-2 text-zinc-600 font-bold uppercase text-[9px] tracking-widest mt-1">
                     <Clock size={12} />
                     <span>{new Date(n.createdAt).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
                
                {/* Individual Delete Button - Boxed & Functional */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setNotifToDelete(n.id); }} 
                  className="w-14 h-14 flex items-center justify-center bg-red-600/5 text-zinc-800 hover:text-red-500 hover:bg-red-600/10 border border-white/5 hover:border-red-600/30 rounded-2xl transition-all active:scale-90 shrink-0"
                  title={t('notifications.delete')}
                >
                  <Trash2 size={22} />
                </button>
              </div>
              
              <p className={`text-base sm:text-lg font-medium leading-relaxed ${n.isRead ? 'text-zinc-600' : 'text-zinc-400'}`}>{n.message}</p>
              
              {n.link && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onModClick(n.link!); }} 
                  className="inline-flex items-center gap-3 px-8 py-4 bg-lime-500/10 text-lime-500 rounded-2xl text-[10px] font-black hover:bg-lime-500 hover:text-black border border-lime-500/20 transition-all shadow-xl active:scale-95"
                >
                  <ExternalLink size={16} /> {t('notifications.view_content')}
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredNotifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-40 text-center border-2 border-dashed border-zinc-900 rounded-[5rem] bg-zinc-900/10 animate-in fade-in zoom-in duration-700">
            <div className="w-32 h-32 bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mb-10 text-zinc-800 shadow-inner">
              <Inbox size={64} />
            </div>
            <h3 className="text-3xl font-black text-zinc-500 mb-4">{t('notifications.empty')}</h3>
            <p className="text-zinc-700 text-lg font-bold max-w-sm leading-relaxed">{t('notifications.hub_desc')}</p>
          </div>
        )}
      </div>

      {/* Confirmation Modals - Improved accessibility */}
      {notifToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/98 backdrop-blur-xl" onClick={() => setNotifToDelete(null)}></div>
           <div className="bg-[#0a0a0a] border border-white/10 p-12 rounded-[4rem] w-full max-w-md relative z-10 shadow-[0_50px_100px_rgba(0,0,0,1)] text-center animate-in zoom-in duration-300">
              <div className="w-24 h-24 bg-red-600/10 text-red-500 rounded-[1.8rem] flex items-center justify-center mx-auto mb-10 border border-red-500/20 shadow-2xl">
                <Trash2 size={48} />
              </div>
              <h3 className="text-2xl font-black text-white mb-4">حذف التنبيه؟</h3>
              <p className="text-zinc-500 text-base font-medium mb-12">سيتم إزالة هذا الإخطار من سجلاتك بشكل دائم.</p>
              <div className="flex flex-col gap-4">
                 <button onClick={deleteNotif} className="w-full py-6 bg-red-600 text-white rounded-[1.5rem] font-black text-xl active:scale-95 transition-all shadow-xl shadow-red-900/20">تأكيد الحذف</button>
                 <button onClick={() => setNotifToDelete(null)} className="w-full py-5 bg-zinc-900 text-zinc-500 rounded-[1.5rem] font-black text-lg hover:text-white">إلغاء</button>
              </div>
           </div>
        </div>
      )}

      {showConfirmClear && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/98 backdrop-blur-xl animate-in fade-in" onClick={() => !isDeletingAll && setShowConfirmClear(false)}></div>
           <div className="bg-[#0a0a0a] border border-white/10 p-12 rounded-[4rem] w-full max-w-md relative z-10 shadow-[0_50px_100px_rgba(0,0,0,1)] text-center animate-in zoom-in">
              <div className="w-24 h-24 bg-red-600/10 text-red-500 rounded-[1.8rem] flex items-center justify-center mx-auto mb-10 border border-red-500/20 shadow-2xl">
                <AlertTriangle size={48} />
              </div>
              <h3 className="text-2xl font-black text-white mb-4">تفريغ السجل؟</h3>
              <p className="text-zinc-500 text-base font-medium mb-12 leading-relaxed px-4">سيتم حذف كافة الإشعارات والرسائل الإدارية بشكل نهائي وغير قابل للاسترداد.</p>
              <div className="flex flex-col gap-4">
                 <button onClick={deleteAllNotifs} disabled={isDeletingAll} className="w-full py-6 bg-red-600 text-white rounded-[1.5rem] font-black text-xl flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-red-900/20">
                   {isDeletingAll ? <Loader2 className="animate-spin" /> : <Eraser size={24} />} تأكيد المسح الكامل
                 </button>
                 <button onClick={() => setShowConfirmClear(false)} disabled={isDeletingAll} className="w-full py-5 bg-zinc-900 text-zinc-500 rounded-[1.5rem] font-black text-lg hover:text-white">تراجع</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsView;
