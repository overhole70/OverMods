import React, { useState, useEffect, useRef } from 'react';
import { User, Complaint, ModReport, AdminPermissions, Notification, NewsItem, StaffMessage, ChatMessage, PopupWindowConfig, PopupButton, PopupSize } from '../types';
import { db } from '../db';
import { 
  Users, Flag, Bell, ShieldAlert, Ban, Unlock, 
  CheckCircle, XCircle, Search, UserPlus, Trash2, Send, Loader2, Camera, CheckCircle2, ShieldCheck, Youtube, ExternalLink, Settings, AlertTriangle, Save, Plus, Info, Calendar, Mail, UserCircle, Hash, Layout, User as UserIcon, MessageSquare, ChevronDown, Monitor, Sparkles, FileCheck, Shield, HeartHandshake, Newspaper, Edit3, UserMinus, Image as ImageIcon, X, Copy, Check, Eye, Ghost, History, Inbox, Clock, Trophy, RefreshCw, LayoutPanelLeft
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User | null;
  onInspectAccount?: (user: User) => void;
}

const OWNER_EMAIL = 'overmods1@gmail.com';

const PERMISSION_LABELS: Record<keyof AdminPermissions, string> = {
  canBan: 'حظر الأعضاء',
  canReplySupport: 'الرد على تذاكر الدعم',
  canDeleteMods: 'حذف المنشورات والمودات',
  canManageReports: 'إدارة بلاغات المحتوى',
  canSendNotifications: 'إرسال بث إشعارات النظام',
  canManageVerifications: 'مراجعة طلبات التوثيق',
  canManageNews: 'إدارة شريط الأخبار',
  canViewUserList: 'عرض قائمة الأعضاء',
  canViewConversations: 'مراقبة المحادثات',
  canViewUserDetails: 'رؤية تفاصيل الحسابات'
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onInspectAccount }) => {
  const isOwner = currentUser?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

  const allTabs = [
    { id: 'users', label: 'الأعضاء', icon: <Users size={16} />, permission: 'canViewUserList' },
    { id: 'requests', label: 'التوثيق', icon: <FileCheck size={16} />, permission: 'canManageVerifications' },
    { id: 'reports', label: 'البلاغات', icon: <Flag size={16} />, permission: 'canManageReports' },
    { id: 'support', label: 'الدعم', icon: <HeartHandshake size={16} />, permission: 'canReplySupport' },
    { id: 'news', label: 'الأخبار', icon: <Newspaper size={16} />, permission: 'canManageNews' },
    { id: 'staff_chat', label: 'العمليات', icon: <MessageSquare size={16} />, permission: null },
    { id: 'helpers', label: 'المساعدين', icon: <Shield size={16} />, permission: 'ownerOnly' },
    { id: 'notifications', label: 'البث الإداري', icon: <Bell size={16} />, permission: 'canSendNotifications' },
    { id: 'popups', label: 'نوافذ النظام', icon: <LayoutPanelLeft size={16} />, permission: 'ownerOnly' }
  ];

  const isTabPermitted = (tabId: string) => {
    if (isOwner) return true;
    const tab = allTabs.find(t => t.id === tabId);
    if (!tab) return false;
    if (tab.permission === 'ownerOnly') return false;
    if (tab.permission === null) return true;
    
    return currentUser?.adminPermissions?.[tab.permission as keyof AdminPermissions] === true;
  };

  const permittedTabs = allTabs.filter(t => isTabPermitted(t.id));

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (permittedTabs.length === 0) return 'staff_chat';
    return permittedTabs[0].id;
  });

  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<ModReport[]>([]);
  const [requests, setRequests] = useState<User[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [staffMessages, setStaffMessages] = useState<StaffMessage[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Notification States
  const [notifMode, setNotifMode] = useState<'all' | 'specific'>('all');
  const [multiTargetUsers, setMultiTargetUsers] = useState<string[]>([]);
  const [targetSearch, setTargetSearch] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [notifIcon, setNotifIcon] = useState('Bell');
  const [notifTime, setNotifTime] = useState(new Date().toISOString().slice(0, 16));

  // Staff Chat State
  const [staffMsgInput, setStaffMsgInput] = useState('');

  // Helpers State
  const [helperSearch, setHelperSearch] = useState('');
  const [editingHelper, setEditingHelper] = useState<User | null>(null);

  // Site & News States
  const [siteSettings, setSiteSettings] = useState<any>({ appIcon: '', heroImage: '', sideImage: '' });
  const [isAddingNews, setIsAddingNews] = useState(false);
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsImages, setNewsImages] = useState<string[]>([]);

  // Monitoring State
  const [monitorUser, setMonitorUser] = useState<User | null>(null);
  const [monitorPartners, setMonitorPartners] = useState<User[]>([]);
  const [monitorSelectedPartner, setMonitorSelectedPartner] = useState<User | null>(null);
  const [monitorMessages, setMonitorMessages] = useState<ChatMessage[]>([]);

  // Popup Window State
  const [popupConfig, setPopupConfig] = useState<PopupWindowConfig>({
    isActive: false,
    title: '',
    description: '',
    icon: 'Info',
    size: 'small',
    dismissible: true,
    delaySeconds: 0,
    buttons: [
      { text: 'حسناً', action: 'close', style: 'primary' }
    ]
  });

  const [userDetailModal, setUserDetailModal] = useState<User | null>(null);

  const staffChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);
  
  useEffect(() => {
    if (!isTabPermitted(activeTab)) {
      if (permittedTabs.length > 0) {
        setActiveTab(permittedTabs[0].id);
      }
    }
  }, [currentUser?.adminPermissions, activeTab]);

  useEffect(() => {
    if (activeTab === 'staff_chat') {
      const interval = setInterval(loadStaffMessages, 5000);
      loadStaffMessages();
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (monitorUser) {
      db.getRecentChats(monitorUser.id).then(async (ids) => {
        const partners = await Promise.all(ids.map(id => db.get('users', id) as Promise<User>));
        setMonitorPartners(partners.filter(p => !!p));
      });
    } else {
      setMonitorPartners([]);
      setMonitorSelectedPartner(null);
    }
  }, [monitorUser]);

  useEffect(() => {
    if (monitorUser && monitorSelectedPartner) {
      db.getMessages(monitorUser.id, monitorSelectedPartner.id).then(setMonitorMessages);
      const interval = setInterval(() => {
        db.getMessages(monitorUser.id, monitorSelectedPartner.id).then(setMonitorMessages);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [monitorUser, monitorSelectedPartner]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [u, r, req, comp, n, site, popup] = await Promise.all([
        db.getAllUsers(), db.getAll('reports'), db.getPendingVerifications(),
        db.getAll('complaints'), db.getAll('news'), db.getSiteSettings(),
        db.get('settings', 'popup_window')
      ]);
      setUsers(u || []); setReports(r as ModReport[] || []); setRequests(req || []);
      setComplaints(comp as Complaint[] || []); setNews(n as NewsItem[] || []); setSiteSettings(site);
      if (popup) setPopupConfig(popup as PopupWindowConfig);
    } finally { setIsLoading(false); }
  };

  const loadStaffMessages = async () => { 
    try { 
      const msgs = await db.getStaffMessages();
      setStaffMessages(msgs);
      setTimeout(() => { staffChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    } catch(e) {}
  };

  const handleSendStaffMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffMsgInput.trim() || !currentUser) return;
    const txt = staffMsgInput.trim();
    setStaffMsgInput('');
    await db.sendStaffMessage(currentUser, txt);
    loadStaffMessages();
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMsg.trim()) return;
    setIsProcessing(true);
    try {
      const targets = notifMode === 'all' ? users.filter(u => u.id && u.email !== OWNER_EMAIL).map(u => u.id) : multiTargetUsers;
      if (targets.length === 0) return alert('الرجاء اختيار مستهدفين');
      for (let tid of targets) {
         await db.sendNotification(tid, notifTitle, notifMsg, 'admin', notifIcon, notifTime);
      }
      setNotifTitle(''); setNotifMsg(''); setMultiTargetUsers([]); alert('تم إرسال الإشعارات بنجاح');
    } finally { setIsProcessing(false); }
  };

  const handleRevokeVerification = async (user: User) => {
    if (!confirm(`هل أنت متأكد من سحب التوثيق من ${user.displayName}؟`)) return;
    setIsProcessing(true);
    try {
      await db.resolveVerification(user.id, 'none');
      await db.sendNotification(user.id, 'تحديث حالة الحساب', 'قام الإدمن بإزالة شارة التوثيق من حسابك.', 'admin', 'ShieldAlert');
      loadData();
    } finally { setIsProcessing(false); }
  };

  const handlePostNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsContent.trim()) return;
    setIsProcessing(true);
    try {
      await db.postNews({ title: newsTitle, content: newsContent, authorId: currentUser?.id, authorName: currentUser?.displayName, images: newsImages });
      setNewsTitle(''); setNewsContent(''); setNewsImages([]); setIsAddingNews(false); loadData();
    } finally { setIsProcessing(false); }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الخبر نهائياً؟')) return;
    await db.deleteNews(id);
    loadData();
  };

  const handleHelperPerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHelper) return;
    setIsProcessing(true);
    try {
      const code = editingHelper.adminCode || db.generateAdminCode();
      await db.updatePermissions(editingHelper.id, editingHelper.adminPermissions!, 'Helper', code);
      setEditingHelper(null);
      loadData();
    } finally { setIsProcessing(false); }
  };

  const handleSavePopup = async () => {
    setIsProcessing(true);
    try {
      await db.updatePopupSettings({ ...popupConfig, isActive: true });
      alert("تم تفعيل النافذة المنبثقة بنجاح");
    } catch(e) {
      alert("فشل الحفظ");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeactivatePopup = async () => {
    setIsProcessing(true);
    try {
      await db.updatePopupSettings({ ...popupConfig, isActive: false });
      setPopupConfig(prev => ({ ...prev, isActive: false }));
      alert("تم إيقاف النافذة");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter(u => (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.username || '').toLowerCase().includes(searchTerm.toLowerCase())).filter(u => isOwner || u.email !== OWNER_EMAIL);

  const SectionHeader = ({ title, count, color }: any) => (
    <div className="flex items-center justify-between px-2 mb-8">
       <h3 className="text-2xl md:text-3xl font-black text-white">{title}</h3>
       {count !== undefined && <span className={`px-6 py-2 bg-zinc-900 border border-white/5 rounded-full text-[10px] font-black ${color || 'text-lime-500'}`}>{count} عنصر</span>}
    </div>
  );

  const iconOptions = [
    { name: 'Bell', icon: <Bell size={18} /> },
    { name: 'Sparkles', icon: <Sparkles size={18} /> },
    { name: 'ShieldAlert', icon: <ShieldAlert size={18} /> },
    { name: 'Trophy', icon: <Trophy size={18} /> },
    { name: 'Info', icon: <Info size={18} /> },
    { name: 'Mail', icon: <Mail size={18} /> },
    { name: 'Gift', icon: <Trophy size={18} /> }, // Using Trophy for gift visual
    { name: 'AlertTriangle', icon: <AlertTriangle size={18} /> },
    { name: 'CheckCircle', icon: <CheckCircle size={18} /> }
  ];

  if (isLoading) return <div className="py-40 flex items-center justify-center"><Loader2 className="animate-spin text-lime-500" size={56} /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32">
      {/* Navigation */}
      <div className="flex p-1 bg-zinc-900/50 rounded-2xl gap-1 overflow-x-auto no-scrollbar sticky top-24 z-50 backdrop-blur-xl border border-white/5 shadow-2xl">
         {permittedTabs.map(t => {
           let count = 0;
           if (t.id === 'requests') count = requests.length;
           if (t.id === 'reports') count = reports.filter(r=>r.status==='pending').length;
           if (t.id === 'support') count = complaints.filter(c=>c.status==='pending').length;

           return (
             <button 
               key={t.id} 
               onClick={() => setActiveTab(t.id)} 
               className={`flex items-center gap-2 px-6 py-4 rounded-xl text-[10px] md:text-[11px] font-black transition-all whitespace-nowrap active:scale-95 ${activeTab === t.id ? 'bg-lime-500 text-black shadow-xl' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
             >
               {t.icon}<span>{t.label}</span>
               {count > 0 && <span className="mr-1.5 px-1.5 bg-black/20 rounded-md text-[8px]">{count}</span>}
             </button>
           );
         })}
      </div>

      <div className="space-y-12">
         {/* Members Section */}
         {activeTab === 'users' && isTabPermitted('users') && (
           <div className="space-y-6">
              <SectionHeader title="قائمة الأعضاء" count={filteredUsers.length} />
              <div className="relative group">
                 <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-600" size={24} />
                 <input type="text" placeholder="بحث باسم العضو..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-[2.5rem] py-6 pr-16 pl-8 text-white font-bold outline-none focus:border-lime-500/50 transition-all" />
              </div>
              <div className="grid grid-cols-1 gap-3">
                 {filteredUsers.map(u => (
                   <div key={u.id} className="bg-zinc-900/30 p-4 md:p-6 rounded-[2.5rem] border border-white/5 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 md:gap-6 hover:bg-zinc-900/50 transition-all shadow-lg group">
                      <div className="flex items-center gap-4 md:gap-5 flex-1 min-w-0">
                         <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={() => setUserDetailModal(u)}>
                            <img src={u.avatar} className="w-12 h-12 md:w-14 md:h-14 rounded-2xl object-cover shadow-xl" />
                            {u.isBlocked && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-black"></div>}
                         </div>
                         <div className="text-right truncate">
                            <h4 className="text-white font-black text-base md:text-lg truncate flex items-center gap-2">
                              {u.displayName}
                              {u.verificationStatus === 'verified' && <ShieldCheck size={16} className="text-lime-500" />}
                            </h4>
                            <p className="text-zinc-600 text-[9px] ltr font-black opacity-60">@{u.username}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
                         {isOwner && (
                           <button onClick={() => setMonitorUser(u)} className="p-3 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg" title="مراقبة الدردشة"><MessageSquare size={18}/></button>
                         )}
                         {u.verificationStatus === 'verified' && isOwner && (
                           <button onClick={() => handleRevokeVerification(u)} className="p-3 bg-orange-600/10 text-orange-500 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-lg" title="سحب التوثيق"><UserMinus size={18}/></button>
                         )}
                         {(isOwner || currentUser?.adminPermissions?.canViewUserDetails) && (
                           <button onClick={() => onInspectAccount?.(u)} className="p-3 bg-zinc-800 text-zinc-500 rounded-xl hover:text-white transition-all"><Eye size={18}/></button>
                         )}
                         {isOwner && u.id !== currentUser?.id && (
                           <button 
                             onClick={() => (u.isBlocked ? db.unbanUser(u.id) : db.banUser(u.id, 99, 'إداري')).then(loadData)} 
                             className={`p-3 rounded-xl transition-all ${u.isBlocked ? 'bg-lime-500 text-black shadow-lg shadow-lime-900/30' : 'bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white'}`}
                             title={u.isBlocked ? 'إلغاء الحظر' : 'حظر العضو'}
                           >
                             {u.isBlocked ? <Unlock size={18}/> : <Ban size={18}/>}
                           </button>
                         )}
                      </div>
                   </div>
                 ))}
              </div>
           </div>
         )}

         {/* Popups Section (New) */}
         {activeTab === 'popups' && isTabPermitted('popups') && (
           <div className="space-y-10 animate-in slide-in-from-right-6">
              <div className="flex items-center justify-between">
                 <SectionHeader title="نوافذ النظام المنبثقة" />
                 <div className="flex gap-3">
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black ${popupConfig.isActive ? 'bg-lime-500/10 text-lime-500 border border-lime-500/20' : 'bg-zinc-900 text-zinc-500'}`}>
                       {popupConfig.isActive ? 'نشط حالياً' : 'غير نشط'}
                    </div>
                 </div>
              </div>

              <div className="bg-zinc-900 border border-white/10 p-8 rounded-[3.5rem] shadow-2xl">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <h4 className="text-white font-black text-lg mb-4">تكوين النافذة</h4>
                       
                       <div className="space-y-4">
                          <div>
                             <label className="text-[10px] text-zinc-500 font-bold uppercase mb-2 block">العنوان</label>
                             <input type="text" value={popupConfig.title} onChange={e => setPopupConfig({...popupConfig, title: e.target.value})} className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-4 text-white font-black text-sm outline-none focus:border-lime-500/50" />
                          </div>
                          <div>
                             <label className="text-[10px] text-zinc-500 font-bold uppercase mb-2 block">الوصف</label>
                             <textarea value={popupConfig.description} onChange={e => setPopupConfig({...popupConfig, description: e.target.value})} className="w-full bg-zinc-950 border border-white/5 rounded-3xl p-4 text-white font-medium text-sm outline-none focus:border-lime-500/50 resize-none" rows={4} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[10px] text-zinc-500 font-bold uppercase mb-2 block">الأيقونة</label>
                                <select value={popupConfig.icon} onChange={e => setPopupConfig({...popupConfig, icon: e.target.value})} className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-4 text-white text-xs font-bold outline-none">
                                   {iconOptions.map(opt => <option key={opt.name} value={opt.name}>{opt.name}</option>)}
                                </select>
                             </div>
                             <div>
                                <label className="text-[10px] text-zinc-500 font-bold uppercase mb-2 block">الحجم</label>
                                <select value={popupConfig.size} onChange={e => setPopupConfig({...popupConfig, size: e.target.value as PopupSize})} className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-4 text-white text-xs font-bold outline-none">
                                   <option value="small">عادي (تنبيه)</option>
                                   <option value="half">نصف الشاشة</option>
                                   <option value="70">كبير (70%)</option>
                                   <option value="full">ملء الشاشة</option>
                                </select>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-[10px] text-zinc-500 font-bold uppercase mb-2 block">توقيت الظهور (ثواني)</label>
                                <input type="number" value={popupConfig.delaySeconds} onChange={e => setPopupConfig({...popupConfig, delaySeconds: parseInt(e.target.value)})} className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-4 text-white font-black text-sm outline-none focus:border-lime-500/50" />
                             </div>
                             <div className="flex items-center gap-3 bg-zinc-950 border border-white/5 rounded-2xl px-4">
                                <input type="checkbox" checked={popupConfig.dismissible} onChange={e => setPopupConfig({...popupConfig, dismissible: e.target.checked})} className="w-5 h-5 accent-lime-500" />
                                <span className="text-xs font-bold text-zinc-400">يمكن إغلاقه (Dismissible)</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h4 className="text-white font-black text-lg mb-4">الأزرار والإجراءات</h4>
                       <div className="space-y-4">
                          {popupConfig.buttons.map((btn, idx) => (
                            <div key={idx} className="p-4 bg-zinc-950 border border-white/5 rounded-3xl space-y-3">
                               <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-zinc-500 uppercase">الزر {idx + 1}</span>
                                  {idx > 0 && <button onClick={() => setPopupConfig({...popupConfig, buttons: popupConfig.buttons.filter((_, i) => i !== idx)})} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>}
                               </div>
                               <input 
                                 type="text" 
                                 placeholder="نص الزر"
                                 value={btn.text} 
                                 onChange={e => {
                                    const newBtns = [...popupConfig.buttons];
                                    newBtns[idx].text = e.target.value;
                                    setPopupConfig({...popupConfig, buttons: newBtns});
                                 }}
                                 className="w-full bg-zinc-900 border border-white/5 rounded-xl p-3 text-white text-xs outline-none"
                               />
                               <div className="grid grid-cols-2 gap-3">
                                  <select 
                                    value={btn.action}
                                    onChange={e => {
                                       const newBtns = [...popupConfig.buttons];
                                       newBtns[idx].action = e.target.value as any;
                                       setPopupConfig({...popupConfig, buttons: newBtns});
                                    }}
                                    className="bg-zinc-900 border border-white/5 rounded-xl p-3 text-white text-xs outline-none"
                                  >
                                     <option value="close">إغلاق النافذة</option>
                                     <option value="navigate">انتقال لصفحة</option>
                                     <option value="link">فتح رابط خارجي</option>
                                  </select>
                                  <select 
                                    value={btn.style}
                                    onChange={e => {
                                       const newBtns = [...popupConfig.buttons];
                                       newBtns[idx].style = e.target.value as any;
                                       setPopupConfig({...popupConfig, buttons: newBtns});
                                    }}
                                    className="bg-zinc-900 border border-white/5 rounded-xl p-3 text-white text-xs outline-none"
                                  >
                                     <option value="primary">أساسي (ملون)</option>
                                     <option value="secondary">ثانوي (رمادي)</option>
                                     <option value="danger">خطر (أحمر)</option>
                                  </select>
                               </div>
                               {btn.action !== 'close' && (
                                 <input 
                                   type="text" 
                                   placeholder={btn.action === 'navigate' ? 'مثال: home, profile' : 'https://...'}
                                   value={btn.payload || ''} 
                                   onChange={e => {
                                      const newBtns = [...popupConfig.buttons];
                                      newBtns[idx].payload = e.target.value;
                                      setPopupConfig({...popupConfig, buttons: newBtns});
                                   }}
                                   className="w-full bg-zinc-900 border border-white/5 rounded-xl p-3 text-white text-xs outline-none ltr"
                                 />
                               )}
                            </div>
                          ))}
                          {popupConfig.buttons.length < 2 && (
                            <button 
                              onClick={() => setPopupConfig({...popupConfig, buttons: [...popupConfig.buttons, { text: 'زر جديد', action: 'close', style: 'secondary' }]})}
                              className="w-full py-3 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs font-black hover:text-white hover:border-zinc-600 transition-all"
                            >
                               + إضافة زر آخر
                            </button>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-4 mt-8 pt-8 border-t border-white/5">
                    <button 
                      onClick={handleSavePopup}
                      disabled={isProcessing}
                      className="flex-1 py-5 bg-lime-500 text-black rounded-3xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-lime-900/20"
                    >
                       {isProcessing ? <Loader2 className="animate-spin mx-auto"/> : (popupConfig.isActive ? 'تحديث النافذة' : 'تفعيل وإرسال')}
                    </button>
                    {popupConfig.isActive && (
                      <button 
                        onClick={handleDeactivatePopup}
                        disabled={isProcessing}
                        className="px-10 py-5 bg-red-600/10 text-red-500 border border-red-500/20 rounded-3xl font-black text-lg hover:bg-red-600 hover:text-white transition-all"
                      >
                         إيقاف
                      </button>
                    )}
                 </div>
              </div>
           </div>
         )}

         {/* Verification Requests Section */}
         {activeTab === 'requests' && isTabPermitted('requests') && (
           <div className="space-y-8">
              <SectionHeader title="طلبات التوثيق" count={requests.length} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {requests.map(req => (
                   <div key={req.id} className="bg-zinc-900 border border-white/5 p-8 rounded-[3.5rem] space-y-6 shadow-2xl relative overflow-hidden group">
                      <div className="flex items-center gap-5">
                         <img src={req.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-xl border border-white/10" />
                         <div className="text-right">
                            <h4 className="text-white font-black text-xl">{req.displayName}</h4>
                            <p className="text-lime-500 font-bold ltr text-sm">@{req.username}</p>
                         </div>
                      </div>

                      <div className="bg-zinc-950/50 p-6 rounded-2xl border border-white/5 space-y-4">
                        {req.subscriberCount && (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">عدد المشتركين:</span>
                            <span className="text-white font-black text-xs">{req.subscriberCount}</span>
                          </div>
                        )}
                        {req.verificationReason && (
                          <div className="space-y-2">
                             <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest block">السبب:</span>
                             <p className="text-zinc-400 text-xs font-medium leading-relaxed italic">"{req.verificationReason}"</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                         {req.channelUrl && (
                           <a href={req.channelUrl} target="_blank" className="block p-4 bg-red-600/10 text-red-500 rounded-2xl text-[10px] font-black flex items-center justify-between hover:bg-red-600 hover:text-white transition-all">
                              <span>رابط القناة</span> <Youtube size={18} />
                           </a>
                         )}
                         {req.verificationVideoUrl && (
                           <a href={req.verificationVideoUrl} target="_blank" className="block p-4 bg-blue-600/10 text-blue-500 rounded-2xl text-[10px] font-black flex items-center justify-between hover:bg-blue-600 hover:text-white transition-all">
                              <span>فيديو الإثبات</span> <ExternalLink size={18} />
                           </a>
                         )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4">
                         <button onClick={() => db.resolveVerification(req.id, 'verified').then(loadData)} className="py-4 bg-lime-500 text-black rounded-2xl font-black text-xs active:scale-95 transition-all shadow-xl shadow-lime-900/20">قبول التوثيق</button>
                         <button onClick={() => db.resolveVerification(req.id, 'none').then(loadData)} className="py-4 bg-zinc-800 text-zinc-500 rounded-2xl font-black text-xs hover:bg-red-600 hover:text-white transition-all">رفض الطلب</button>
                      </div>
                   </div>
                 ))}
                 {requests.length === 0 && <div className="col-span-full py-40 text-center border-2 border-dashed border-zinc-900 rounded-[4rem] text-zinc-700 font-black">لا توجد طلبات معلقة</div>}
              </div>
           </div>
         )}

         {/* Staff Message (Operations) Section - RESTORED */}
         {activeTab === 'staff_chat' && (
           <div className="flex flex-col h-[70vh] bg-zinc-950 rounded-[4rem] border border-white/5 overflow-hidden shadow-2xl animate-in slide-in-from-bottom-6">
              <div className="p-8 bg-zinc-900/50 border-b border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-lime-500/10 text-lime-500 rounded-2xl flex items-center justify-center shadow-lg border border-lime-500/20">
                       <MessageSquare size={28} />
                    </div>
                    <div className="text-right">
                       <h4 className="text-white font-black text-xl">دردشة الطاقم</h4>
                       <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Team Communication Channel</p>
                    </div>
                 </div>
                 <button onClick={loadStaffMessages} className="p-3 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all"><RefreshCw size={20}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                 {staffMessages.map(msg => (
                   <div key={msg.id} className={`flex items-start gap-4 ${msg.userId === currentUser?.id ? 'flex-row-reverse' : ''}`}>
                      <img src={msg.userAvatar} className="w-10 h-10 rounded-xl object-cover shadow-lg border border-white/10 shrink-0" />
                      <div className={`max-w-[70%] space-y-1 ${msg.userId === currentUser?.id ? 'text-left' : 'text-right'}`}>
                         <div className="flex items-center gap-2 mb-1 px-1">
                            <span className="text-zinc-500 text-[9px] font-black">{msg.userName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${msg.userRole === 'Admin' ? 'bg-red-600/20 text-red-500' : 'bg-lime-500/20 text-lime-500'}`}>{msg.userRole}</span>
                         </div>
                         <div className={`p-5 rounded-2xl text-sm font-medium ${msg.userId === currentUser?.id ? 'bg-lime-500 text-black rounded-tr-none' : 'bg-zinc-900 text-white border border-white/5 rounded-tl-none'}`}>
                            {msg.text}
                            <p className={`text-[8px] mt-2 opacity-40 font-bold ${msg.userId === currentUser?.id ? 'text-black' : 'text-zinc-500'}`}>{new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                         </div>
                      </div>
                   </div>
                 ))}
                 <div ref={staffChatEndRef} />
              </div>

              <form onSubmit={handleSendStaffMessage} className="p-8 bg-zinc-900/50 border-t border-white/5">
                 <div className="relative group">
                    <input 
                      type="text" 
                      value={staffMsgInput}
                      onChange={e=>setStaffMsgInput(e.target.value)}
                      placeholder="اكتب رسالة للطاقم..." 
                      className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-5 pr-6 pl-16 text-white text-sm outline-none focus:border-lime-500/50 transition-all shadow-inner"
                    />
                    <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-lime-500 text-black rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all">
                       <Send size={20} />
                    </button>
                 </div>
              </form>
           </div>
         )}

         {/* News Section - RESTORED */}
         {activeTab === 'news' && isTabPermitted('news') && (
           <div className="space-y-10 animate-in slide-in-from-right-6">
              <div className="flex items-center justify-between">
                 <SectionHeader title="إدارة الأخبار" count={news.length} />
                 <button 
                  onClick={() => setIsAddingNews(!isAddingNews)}
                  className={`px-8 py-4 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-xl flex items-center gap-3 ${isAddingNews ? 'bg-zinc-800 text-zinc-400' : 'bg-lime-500 text-black shadow-lime-900/20'}`}
                 >
                    {isAddingNews ? <X size={18}/> : <Plus size={18}/>}
                    {isAddingNews ? 'إلغاء' : 'إضافة خبر جديد'}
                 </button>
              </div>

              {isAddingNews && (
                <form onSubmit={handlePostNews} className="bg-zinc-900 border border-white/10 p-10 rounded-[3.5rem] space-y-8 shadow-2xl animate-in zoom-in">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">عنوان الخبر</label>
                            <input 
                              type="text" value={newsTitle} onChange={e=>setNewsTitle(e.target.value)}
                              className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm outline-none focus:border-lime-500/50" 
                              required
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">محتوى الخبر</label>
                            <textarea 
                              value={newsContent} onChange={e=>setNewsContent(e.target.value)}
                              className="w-full bg-zinc-950 border border-white/5 rounded-3xl py-5 px-6 text-white font-medium text-sm outline-none focus:border-lime-500/50 resize-none" 
                              rows={6} required
                            />
                         </div>
                      </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">صور الخبر (روابط)</label>
                         <div className="space-y-3">
                            {[0, 1, 2].map(i => (
                              <input 
                                key={i} type="url" placeholder={`رابط صورة ${i+1}...`}
                                className="w-full bg-zinc-950 border border-white/5 rounded-xl py-4 px-5 text-white text-xs outline-none focus:border-lime-500/50"
                                onChange={e => {
                                   const newImgs = [...newsImages];
                                   newImgs[i] = e.target.value;
                                   setNewsImages(newImgs.filter(v => !!v));
                                }}
                              />
                            ))}
                         </div>
                      </div>
                   </div>
                   <button type="submit" disabled={isProcessing} className="w-full py-6 bg-lime-500 text-black rounded-3xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-lime-900/20">نشر الخبر الآن</button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {news.map(item => (
                   <div key={item.id} className="bg-zinc-900/40 border border-white/5 rounded-[3rem] p-8 space-y-6 relative group hover:border-white/10 transition-all">
                      <div className="flex items-start justify-between">
                         <div className="space-y-1">
                            <h4 className="text-white font-black text-xl leading-tight">{item.title}</h4>
                            <p className="text-zinc-600 text-[10px] font-bold">{new Date(item.createdAt).toLocaleDateString('ar-EG')}</p>
                         </div>
                         <button onClick={() => handleDeleteNews(item.id)} className="p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all active:scale-90"><Trash2 size={18}/></button>
                      </div>
                      <p className="text-zinc-500 text-sm font-medium line-clamp-3 leading-relaxed">{item.content}</p>
                      {item.images?.[0] && (
                        <div className="h-32 rounded-2xl overflow-hidden">
                           <img src={item.images[0]} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                   </div>
                 ))}
              </div>
           </div>
         )}

         {/* Notifications Broadcast Section - RESTORED */}
         {activeTab === 'notifications' && isTabPermitted('notifications') && (
           <div className="space-y-10 animate-in slide-in-from-right-6">
              <SectionHeader title="البث الإداري" />
              
              <div className="bg-zinc-900 border border-white/10 p-10 md:p-14 rounded-[4rem] space-y-12 shadow-2xl">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <form onSubmit={handleSendNotification} className="space-y-6">
                       <div className="flex p-1 bg-zinc-950 rounded-2xl gap-1 mb-8">
                          <button type="button" onClick={() => setNotifMode('all')} className={`flex-1 py-4 rounded-xl text-[10px] font-black transition-all ${notifMode === 'all' ? 'bg-lime-500 text-black shadow-xl' : 'text-zinc-600 hover:text-white'}`}>كافة الأعضاء</button>
                          <button type="button" onClick={() => setNotifMode('specific')} className={`flex-1 py-4 rounded-xl text-[10px] font-black transition-all ${notifMode === 'specific' ? 'bg-lime-500 text-black shadow-xl' : 'text-zinc-600 hover:text-white'}`}>أعضاء محددين</button>
                       </div>

                       <div className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">عنوان التنبيه</label>
                             <input type="text" value={notifTitle} onChange={e=>setNotifTitle(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm outline-none focus:border-lime-500/50" placeholder="مثلاً: تحديث جديد متوفر..." required />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">رسالة التنبيه</label>
                             <textarea value={notifMsg} onChange={e=>setNotifMsg(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-3xl py-5 px-6 text-white font-medium text-sm outline-none focus:border-lime-500/50 resize-none" rows={4} placeholder="اكتب تفاصيل التنبيه هنا..." required />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">الأيقونة</label>
                                <select value={notifIcon} onChange={e=>setNotifIcon(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-xl py-4 px-5 text-white text-xs font-black outline-none focus:border-lime-500/50">
                                   {iconOptions.map(opt => <option key={opt.name} value={opt.name}>{opt.name}</option>)}
                                </select>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">وقت البث</label>
                                <input type="datetime-local" value={notifTime} onChange={e=>setNotifTime(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-xl py-4 px-5 text-white text-xs font-black outline-none focus:border-lime-500/50" />
                             </div>
                          </div>
                       </div>

                       <button type="submit" disabled={isProcessing} className="w-full py-6 bg-lime-500 text-black rounded-3xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-lime-900/20 flex items-center justify-center gap-3">
                          {isProcessing ? <Loader2 className="animate-spin" size={24}/> : <Send size={24}/>}
                          {notifMode === 'all' ? 'بث لكافة المنصة' : `إرسال لـ ${multiTargetUsers.length} عضو`}
                       </button>
                    </form>

                    <div className={`space-y-6 ${notifMode === 'specific' ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                       <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2 px-2">تحديد المستهدفين ({multiTargetUsers.length})</label>
                       <div className="relative">
                          <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-700" size={20} />
                          <input type="text" placeholder="بحث عن أعضاء..." value={targetSearch} onChange={e=>setTargetSearch(e.target.value)} className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-5 pr-14 pl-6 text-white font-black text-sm outline-none focus:border-lime-500/50" />
                       </div>
                       <div className="bg-zinc-950 rounded-[2.5rem] border border-white/5 p-6 h-[400px] overflow-y-auto no-scrollbar space-y-2 shadow-inner">
                          {users.filter(u => u.displayName.toLowerCase().includes(targetSearch.toLowerCase()) && u.email !== OWNER_EMAIL).map(u => (
                            <div key={u.id} onClick={() => multiTargetUsers.includes(u.id) ? setMultiTargetUsers(multiTargetUsers.filter(id => id !== u.id)) : setMultiTargetUsers([...multiTargetUsers, u.id])} className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between border ${multiTargetUsers.includes(u.id) ? 'bg-lime-500/10 border-lime-500/40' : 'bg-zinc-900/40 border-transparent hover:border-white/10'}`}>
                               <div className="flex items-center gap-4">
                                  <img src={u.avatar} className="w-10 h-10 rounded-xl object-cover" />
                                  <div className="text-right">
                                     <h5 className={`text-sm font-black transition-colors ${multiTargetUsers.includes(u.id) ? 'text-lime-500' : 'text-white'}`}>{u.displayName}</h5>
                                     <p className="text-zinc-600 text-[9px] ltr">@{u.username}</p>
                                  </div>
                                </div>
                               <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${multiTargetUsers.includes(u.id) ? 'bg-lime-500 border-lime-500 text-black' : 'border-zinc-800'}`}>
                                  {multiTargetUsers.includes(u.id) && <Check size={14} strokeWidth={4}/>}
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
         )}

         {/* Reports Section - Keeping existing logic */}
         {activeTab === 'reports' && isTabPermitted('reports') && (
           <div className="space-y-8">
              <SectionHeader title="بلاغات المحتوى" count={reports.filter(r=>r.status==='pending').length} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {reports.map(rep => (
                   <div key={rep.id} className="bg-zinc-900 border border-white/5 p-8 rounded-[3.5rem] space-y-6 shadow-2xl relative">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-600/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-lg"><Flag size={24} /></div>
                            <div className="text-right">
                               <h4 className="text-white font-black text-lg truncate max-w-[200px]">{rep.modTitle}</h4>
                               <p className="text-zinc-600 text-[10px] font-bold">المبلغ: {rep.reporterName}</p>
                            </div>
                         </div>
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black ${rep.status === 'reviewed' ? 'bg-lime-500/10 text-lime-500' : 'bg-red-600/10 text-red-500 animate-pulse'}`}>
                            {rep.status === 'reviewed' ? 'تمت المراجعة' : 'بلاغ جديد'}
                         </span>
                      </div>
                      <div className="bg-zinc-950/50 p-6 rounded-2xl border border-white/5 italic">
                         <p className="text-zinc-400 text-xs font-medium leading-relaxed">"{rep.reason}"</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <button onClick={() => db.resolveReport(rep.id).then(loadData)} className="py-4 bg-lime-500 text-black rounded-2xl font-black text-xs active:scale-95 transition-all">تحديد كمراجع</button>
                         <button onClick={() => db.deleteReport(rep.id).then(loadData)} className="py-4 bg-zinc-800 text-zinc-500 rounded-2xl font-black text-xs hover:text-white transition-all">حذف البلاغ</button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
         )}

         {/* Support Section - Keeping existing logic */}
         {activeTab === 'support' && isTabPermitted('support') && (
           <div className="space-y-8">
              <SectionHeader title="مركز المساعدة" count={complaints.filter(c=>c.status==='pending').length} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {complaints.map(c => (
                   <div key={c.id} className="bg-zinc-900 border border-white/5 p-8 rounded-[3.5rem] space-y-6 shadow-2xl">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-pink-600/10 text-pink-500 rounded-2xl flex items-center justify-center border border-pink-500/20 shadow-lg"><HeartHandshake size={24} /></div>
                            <div className="text-right">
                               <h4 className="text-white font-black text-lg">{c.username}</h4>
                               <p className="text-zinc-600 text-[10px] font-bold">{new Date(c.createdAt).toLocaleDateString('ar-EG')}</p>
                            </div>
                         </div>
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black ${c.status === 'resolved' ? 'bg-lime-500/10 text-lime-500' : 'bg-pink-600/10 text-pink-500'}`}>
                            {c.status === 'resolved' ? 'تم الحل' : 'تذكرة نشطة'}
                         </span>
                      </div>
                      <div className="space-y-4">
                         <h5 className="text-white font-black text-sm">{c.subject}</h5>
                         <p className="text-zinc-500 text-xs font-medium leading-relaxed bg-zinc-950/50 p-4 rounded-xl border border-white/5">{c.message}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                         <button onClick={() => db.resolveComplaint(c.id).then(loadData)} className="py-4 bg-lime-500 text-black rounded-2xl font-black text-xs active:scale-95 transition-all">تم الحل</button>
                         <button onClick={() => db.deleteComplaint(c.id).then(loadData)} className="py-4 bg-zinc-800 text-zinc-500 rounded-2xl font-black text-xs hover:text-white transition-all">حذف التذكرة</button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
         )}

         {/* Assistants (Helpers) Section - Keeping existing logic */}
         {activeTab === 'helpers' && isTabPermitted('helpers') && (
           <div className="space-y-10 animate-in slide-in-from-right-6">
              <SectionHeader title="إدارة طاقم المساعدين" />
              <div className="bg-zinc-950 border border-white/5 p-8 md:p-12 rounded-[4rem] space-y-8 shadow-2xl">
                 <div className="relative group">
                    <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-700" size={20} />
                    <input type="text" placeholder="ابحث عن عضو لترقيته لمساعد..." value={helperSearch} onChange={e=>setHelperSearch(e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-6 pr-14 pl-6 text-white font-black outline-none focus:border-lime-500 transition-all" />
                    {helperSearch && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-zinc-900 border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[100] max-h-64 overflow-y-auto no-scrollbar">
                         {users.filter(u => u.displayName.toLowerCase().includes(helperSearch.toLowerCase()) && u.role === 'User').map(u => (
                           <div key={u.id} onClick={()=>{setEditingHelper({...u, adminPermissions: { canBan: false, canReplySupport: true, canDeleteMods: false, canManageReports: true, canSendNotifications: false, canManageVerifications: false, canManageNews: false, canViewUserList: true, canViewConversations: false, canViewUserDetails: true }}); setHelperSearch('');}} className="p-5 flex items-center justify-between hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 group">
                              <div className="flex items-center gap-4">
                                 <img src={u.avatar} className="w-10 h-10 rounded-xl object-cover" />
                                 <div className="text-right"><h5 className="text-white font-black text-sm">{u.displayName}</h5><p className="text-zinc-600 text-[10px]">@{u.username}</p></div>
                              </div>
                              <Plus size={20} className="text-lime-500 opacity-0 group-hover:opacity-100 transition-all" />
                           </div>
                         ))}
                      </div>
                    )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.filter(u => u.role === 'Helper').map(h => (
                      <div key={h.id} className="bg-zinc-900/40 border border-white/5 p-6 rounded-[2.5rem] flex flex-col gap-6 shadow-xl">
                         <div className="flex items-center gap-4">
                            <img src={h.avatar} className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
                            <div className="text-right flex-1">
                               <h4 className="text-white font-black">{h.displayName}</h4>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="bg-lime-500 text-black px-2 py-0.5 rounded text-[8px] font-black uppercase">Helper</span>
                                  <span className="text-zinc-600 text-[8px] font-black ltr tracking-wider">{h.adminCode}</span>
                               </div>
                            </div>
                            <button onClick={() => setEditingHelper(h)} className="p-3 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all"><Settings size={18}/></button>
                         </div>
                         <button onClick={()=>db.updatePermissions(h.id, {} as any, 'User').then(loadData)} className="w-full py-4 bg-red-600/10 text-red-500 rounded-2xl font-black text-[10px] hover:bg-red-600 hover:text-white transition-all">إزالة من الطاقم</button>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
         )}
      </div>

      {/* Staff Message Overlay */}
      {monitorUser && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl animate-in fade-in" onClick={() => setMonitorUser(null)}></div>
          <div className="bg-[#0a0a0a] border border-white/10 p-8 sm:p-12 rounded-[4rem] w-full max-w-6xl h-[85vh] relative z-10 shadow-2xl flex flex-col animate-in zoom-in duration-500 overflow-hidden">
             <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-8 shrink-0">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-blue-600/10 text-blue-500 rounded-[1.5rem] flex items-center justify-center border border-blue-500/20 shadow-xl shadow-blue-900/5"><Shield size={32} /></div>
                   <div className="text-right">
                      <h3 className="text-2xl font-black text-white">مراقبة دردشة: {monitorUser.displayName}</h3>
                      <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Active Safety Protocol • View Only Mode</p>
                   </div>
                </div>
                <button onClick={() => setMonitorUser(null)} className="p-4 bg-zinc-900 text-zinc-500 hover:text-white rounded-2xl transition-all active:scale-90"><X size={28} /></button>
             </div>
             
             <div className="flex-1 flex flex-col md:flex-row gap-8 overflow-hidden min-h-0">
                <div className="w-full md:w-80 bg-zinc-900/30 rounded-[2.5rem] border border-white/5 p-6 flex flex-col gap-3 overflow-y-auto no-scrollbar shrink-0">
                   <h4 className="text-[10px] text-zinc-700 font-black uppercase tracking-[0.3em] mb-4 px-2">جهات الاتصال النشطة</h4>
                   {monitorPartners.map(p => (
                     <div key={p.id} onClick={() => setMonitorSelectedPartner(p)} className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 border ${monitorSelectedPartner?.id === p.id ? 'bg-blue-600 text-white border-blue-400 shadow-xl' : 'bg-zinc-950/50 border-white/5 text-zinc-400 hover:border-white/20'}`}>
                        <img src={p.avatar} className="w-10 h-10 rounded-xl object-cover shadow-lg border border-white/10" />
                        <span className="text-sm font-black truncate">{p.displayName}</span>
                     </div>
                   ))}
                </div>
                
                <div className="flex-1 bg-[#050505] rounded-[3rem] border border-white/5 flex flex-col overflow-hidden shadow-inner">
                   {monitorSelectedPartner ? (
                     <>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                           {monitorMessages.map(m => (
                             <div key={m.id} className={`flex ${m.senderId === monitorUser.id ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[75%] p-6 rounded-3xl text-sm font-medium ${m.senderId === monitorUser.id ? 'bg-blue-600/10 text-blue-200 border border-blue-500/20 rounded-tl-none shadow-lg shadow-blue-900/5' : 'bg-zinc-900 text-white border border-white/5 rounded-tr-none shadow-md'}`}>
                                   {m.text}
                                   <p className={`text-[8px] mt-2 opacity-40 font-bold uppercase ${m.senderId === monitorUser.id ? 'text-blue-200' : 'text-zinc-500'}`}>{new Date(m.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                             </div>
                           ))}
                        </div>
                     </>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                        <MessageSquare size={64} className="text-zinc-900 mb-6" />
                        <h4 className="text-xl font-black text-zinc-800">اختر جهة اتصال للبدء</h4>
                        <p className="text-zinc-900 font-bold text-xs mt-2 uppercase tracking-widest">Select a message thread to monitor safety</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Editing Helper Overlay */}
      {editingHelper && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/98 backdrop-blur-2xl" onClick={()=>setEditingHelper(null)}></div>
           <form onSubmit={handleHelperPerms} className="bg-[#0f0f0f] border border-white/10 p-8 sm:p-12 rounded-[4.5rem] w-full max-w-2xl relative z-10 space-y-10 animate-in zoom-in shadow-2xl shadow-black overflow-y-auto max-h-[90vh] no-scrollbar">
              <div className="flex items-center gap-6 pb-6 border-b border-white/5">
                 <img src={editingHelper.avatar} className="w-20 h-20 rounded-[1.8rem] object-cover shadow-2xl border border-white/10" />
                 <div className="text-right">
                    <h3 className="text-3xl font-black text-white">{editingHelper.displayName}</h3>
                    <p className="text-lime-500 font-bold ltr text-lg">@{editingHelper.username}</p>
                 </div>
              </div>
              
              <div className="space-y-4">
                 <h4 className="text-zinc-500 font-black text-xs uppercase tracking-widest px-2">صلاحيات المساعد</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(Object.keys(PERMISSION_LABELS) as Array<keyof AdminPermissions>).map(key => (
                      <label key={key} className="flex items-center justify-between p-5 bg-zinc-900/50 rounded-2xl border border-white/5 cursor-pointer hover:bg-zinc-900 transition-all group active:scale-[0.98]">
                         <span className="text-xs font-black text-zinc-400 group-hover:text-white transition-colors">{PERMISSION_LABELS[key]}</span>
                         <div className={`w-12 h-6 rounded-full relative transition-all ${editingHelper.adminPermissions?.[key] ? 'bg-lime-500' : 'bg-zinc-800'}`}>
                            <input 
                                type="checkbox" 
                                checked={editingHelper.adminPermissions?.[key]} 
                                onChange={e => setEditingHelper({...editingHelper, adminPermissions: {...editingHelper.adminPermissions!, [key]: e.target.checked}})}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                            />
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingHelper.adminPermissions?.[key] ? 'right-7' : 'right-1'}`}></div>
                         </div>
                      </label>
                    ))}
                 </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                 <button type="submit" className="flex-1 py-6 bg-lime-500 text-black rounded-3xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-lime-900/20">حفظ الصلاحيات</button>
                 <button type="button" onClick={()=>setEditingHelper(null)} className="flex-1 py-6 bg-zinc-800 text-zinc-500 rounded-3xl font-black text-lg hover:text-white">إلغاء</button>
              </div>
           </form>
        </div>
      )}

      {userDetailModal && (
         <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl animate-in fade-in" onClick={() => setUserDetailModal(null)}></div>
            <div className="bg-[#0a0a0a] border border-white/10 p-12 rounded-[5rem] w-full max-w-xl relative z-10 shadow-2xl animate-in zoom-in duration-500 no-scrollbar max-h-[90vh] overflow-y-auto">
               <div className="flex flex-col items-center gap-8 mb-12">
                  <div className="p-2.5 bg-gradient-to-tr from-lime-500 to-zinc-800 rounded-[4rem] shadow-2xl">
                    <img src={userDetailModal.avatar} className="w-48 h-48 rounded-[3.5rem] object-cover border-[10px] border-black" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-4xl font-black text-white tracking-tight">{userDetailModal.displayName}</h3>
                    <div className="flex items-center justify-center gap-3 mt-2">
                       <p className="text-lime-500 font-bold text-lg ltr">@{userDetailModal.username}</p>
                       <span className="bg-zinc-900 text-zinc-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{userDetailModal.role}</span>
                    </div>
                  </div>
               </div>
               <div className="space-y-4">
                  {[
                    { label: 'المعرف الرقمي', val: userDetailModal.numericId || '---', icon: <Hash size={18}/> },
                    { label: 'البريد الإلكتروني', val: userDetailModal.email || 'مخفي', icon: <Mail size={18}/>, isLtr: true },
                    { label: 'تاريخ الانضمام', val: userDetailModal.createdAt ? new Date(userDetailModal.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) : '---', icon: <Calendar size={18}/> },
                    { label: 'الحالة الإدارية', val: userDetailModal.isBlocked ? 'محظور حالياً' : 'نشط', icon: <Shield size={18}/>, isRed: userDetailModal.isBlocked }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-zinc-900/40 p-6 rounded-[2rem] border border-white/5 flex items-center justify-between group transition-all hover:bg-zinc-900">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-700 group-hover:text-lime-500 transition-colors shadow-inner`}>{item.icon}</div>
                          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{item.label}</span>
                       </div>
                       <span className={`font-black text-sm ${item.isLtr ? 'ltr' : ''} ${item.isRed ? 'text-red-500' : 'text-white'}`}>{item.val}</span>
                    </div>
                  ))}
               </div>
               <button onClick={() => setUserDetailModal(null)} className="w-full py-7 bg-zinc-800 text-white rounded-[2.5rem] font-black text-xl mt-12 active:scale-95 transition-all hover:bg-zinc-700">إلغاء النافذة</button>
            </div>
         </div>
      )}
    </div>
  );
};

export default AdminDashboard;