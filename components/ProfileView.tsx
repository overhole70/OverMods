
import React, { useState, useEffect } from 'react';
import { User, Mod } from '../types';
import ModCard from './ModCard';
import { db } from '../db';
import { 
  LogOut, ShieldCheck, UserPlus, UserMinus, Calendar, 
  Download, Eye, Award, Info, BadgeCheck, 
  Layers, UserCircle, Hash, User as UserIcon, AlertTriangle, Clock,
  Youtube, ExternalLink, Globe, Heart, MessageSquare, Edit3, Sparkles, Ban, Unlock, Ghost, Loader2, Zap, Inbox, Shield, Trash2, Send,
  Layout, Mail, CheckCircle, Facebook, Instagram, X, ShieldAlert, ArrowRight
} from 'lucide-react';
import { useTranslation } from '../LanguageContext';

interface ProfileViewProps {
  user: User;
  currentUser: User | null;
  isOwnProfile: boolean;
  mods: Mod[];
  onLogout: () => void;
  onEditMod: (mod: Mod) => void;
  onModClick: (mod: Mod) => void;
  onFollow: () => Promise<void>;
  onEditProfile?: () => void;
  onBack?: () => void;
}

const OWNER_EMAIL = 'overmods1@gmail.com';

const DiscordIcon = ({ className, size = 24 }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

export const ProfileView: React.FC<ProfileViewProps> = ({ 
  user: initialUser, currentUser, isOwnProfile, mods: initialMods, onLogout, 
  onEditMod, onModClick, onFollow, onEditProfile, onBack 
}) => {
  const { isRTL } = useTranslation();
  const [user, setUser] = useState<User>(initialUser);
  const [fullMods, setFullMods] = useState<Mod[]>(initialMods);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'mods' | 'about'>('mods');
  const [isOwnerProcessing, setIsOwnerProcessing] = useState(false);
  
  // Followers List State
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersList, setFollowersList] = useState<User[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);

  // Confirmation Modal States
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    type: 'ban' | 'unban' | 'delete' | 'verify' | 'unverify' | 'notify'; 
  } | null>(null);

  useEffect(() => {
    const fetchUserMods = async () => {
      if (user.id) {
        try {
          const m = await db.getUserMods(user.id);
          setFullMods(m);
        } catch (e) {
          console.error("Failed to fetch user mods", e);
        }
      }
    };
    fetchUserMods();
  }, [user.id]);

  const isFollowing = currentUser?.following?.includes(user.id);
  const isBlockedByMe = currentUser?.blockedUsers?.includes(user.id);
  const isBlockingMe = user.blockedUsers?.includes(currentUser?.id || '');

  const isProfileOwnerAccount = user.email === OWNER_EMAIL;
  const isCurrentUserOwner = currentUser?.email === OWNER_EMAIL;

  const showStatus = user.privacySettings?.showOnlineStatus !== false;

  const totalDownloads = fullMods.reduce((acc, m) => acc + (Number(m.stats?.downloads) || 0), 0);
  const totalViews = fullMods.reduce((acc, m) => acc + (Number(m.stats?.views) || 0), 0);

  const handleFollowClick = async () => {
    if (isFollowLoading || !currentUser || isBlockingMe || isBlockedByMe) return;
    setIsFollowLoading(true);
    try { await onFollow(); } finally { setIsFollowLoading(false); }
  };

  const handleShowFollowers = async () => {
    if (!isOwnProfile && !user.privacySettings?.showFollowersList) return;
    
    setShowFollowersModal(true);
    setLoadingFollowers(true);
    try {
      const fetchedFollowers = await db.getFollowers(user.id);
      const visibleFollowers = fetchedFollowers.filter(f => f.privacySettings?.showInSearch !== false);
      setFollowersList(visibleFollowers);
    } catch (e) {
      console.error("Failed to load followers", e);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const handleOwnerAction = async () => {
    if (!confirmModal || isOwnerProcessing) return;
    setIsOwnerProcessing(true);
    try {
      switch (confirmModal.type) {
        case 'ban':
          const banReason = prompt('سبب الحظر:');
          if (banReason) await db.banUser(user.id, 9999, banReason);
          break;
        case 'unban':
          await db.unbanUser(user.id);
          break;
        case 'delete':
          await db.deleteUser(user.id);
          alert('تم حذف الحساب بنجاح');
          if (onBack) onBack();
          return;
        case 'verify':
          await db.resolveVerification(user.id, 'verified');
          break;
        case 'unverify':
          await db.resolveVerification(user.id, 'none');
          break;
        case 'notify':
          const notifTitle = prompt('عنوان التنبيه:');
          const notifMsg = prompt('محتوى التنبيه:');
          if (notifTitle && notifMsg) {
            await db.sendNotification(user.id, notifTitle, notifMsg, 'admin', 'ShieldAlert');
            alert('تم إرسال التنبيه بنجاح');
          }
          break;
      }
      
      const updated = await db.get('users', user.id);
      if (updated) setUser(updated as User);
    } catch (e) {
      alert('فشلت العملية الإدارية');
    } finally {
      setIsOwnerProcessing(false);
      setConfirmModal(null);
    }
  };

  if (isBlockingMe) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-10 animate-in fade-in duration-500">
         <div className="w-24 h-24 bg-red-600/10 text-red-500 rounded-[2.5rem] flex items-center justify-center mb-8 border border-red-500/20">
            <Ghost size={48} />
         </div>
         <h2 className="text-3xl font-black text-white mb-4">عذراً، الوصول غير مسموح</h2>
         <p className="text-zinc-500 text-lg max-w-md leading-relaxed font-bold">
            قام <span className="text-white">{user.displayName}</span> بحظرك. لا يمكنك التفاعل مع هذا الحساب أو رؤية تفاصيله.
         </p>
         <button onClick={() => window.history.back()} className="mt-10 px-10 py-5 bg-zinc-900 text-zinc-400 rounded-2xl font-black text-sm hover:text-white transition-all">العودة للخلف</button>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-40 animate-in fade-in duration-700 max-w-7xl mx-auto">
      {/* Back Button for non-owner profiles accessed via navigation */}
      {!isOwnProfile && onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all font-black group px-6">
          <ArrowRight size={22} className={`${isRTL ? 'group-hover:translate-x-1' : 'rotate-180 group-hover:-translate-x-1'} transition-transform`} />
          <span className="text-base">العودة</span>
        </button>
      )}

      {/* Refined Header Section */}
      <div className="relative group">
        <div className="h-80 bg-[#080808] rounded-[3rem] overflow-hidden relative border border-white/5 shadow-2xl">
           {user.banner ? (
             <img src={user.banner} className="w-full h-full object-cover opacity-80" alt="Profile Banner" />
           ) : (
             <>
               <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
               <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/80 via-black/50 to-zinc-900/80"></div>
               <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-theme-primary-alpha/20 to-transparent opacity-60"></div>
               <div className="absolute -bottom-24 -left-24 w-96 h-96 theme-bg-primary-alpha blur-[100px] rounded-full animate-pulse opacity-40"></div>
             </>
           )}
           {isOwnProfile && (
             <button 
               onClick={onEditProfile}
               className="absolute top-6 left-6 p-3 bg-black/50 backdrop-blur-md rounded-xl text-white hover:bg-white/20 transition-all border border-white/10 group/edit"
               title="تغيير الغلاف"
             >
                <Edit3 size={18} />
             </button>
           )}
        </div>

        <div className="max-w-6xl mx-auto px-6 md:px-12 -mt-32 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-10">
            {/* Avatar */}
            <div className="relative group/avatar shrink-0">
              <div className="p-2 bg-zinc-950 rounded-[3.5rem] shadow-2xl">
                <img 
                  src={user.avatar} 
                  className="w-40 h-40 md:w-56 md:h-56 rounded-[3rem] object-cover border-4 border-zinc-900 group-hover/avatar:scale-[1.02] transition-transform duration-500" 
                  alt={user.displayName} 
                />
                {(user.isVerified || isProfileOwnerAccount) && (
                  <div className="absolute -bottom-2 -right-2 theme-bg-primary text-black p-3.5 rounded-2xl shadow-xl border-4 border-zinc-950 animate-in zoom-in duration-500">
                    <ShieldCheck size={24} />
                  </div>
                )}
              </div>
            </div>

            {/* Info Section */}
            <div className="flex-1 text-right w-full pb-4">
              <div className="flex flex-col gap-6 mb-4">
                <div className="space-y-4">
                   <div className="flex flex-col items-start gap-2">
                     <div className="flex items-center gap-6 flex-wrap">
                        <h1 className="text-3xl md:text-6xl font-black text-white tracking-tight">
                            {user.displayName}
                        </h1>
                        {isOwnProfile && (
                          <button 
                            onClick={onEditProfile} 
                            className="w-14 h-14 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
                            title="تعديل الحساب"
                          >
                            <Edit3 size={24} />
                          </button>
                        )}
                        {!isOwnProfile && currentUser && !isBlockedByMe && (
                           <button 
                             onClick={handleFollowClick} 
                             className={`w-14 h-14 rounded-xl border border-white/5 flex items-center justify-center transition-all shadow-lg active:scale-95 ${isFollowing ? 'bg-zinc-900 text-white hover:bg-red-600/10 hover:text-red-500' : 'theme-bg-primary text-black hover:theme-bg-primary-hover'}`}
                             title={isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
                           >
                             {isFollowing ? <UserMinus size={24} /> : <UserPlus size={24} />}
                           </button>
                        )}
                     </div>
                     
                     <div className="flex items-center gap-4 text-zinc-500 text-sm font-bold mt-1 flex-wrap">
                        <span className="ltr opacity-70 text-base">@{user.username}</span>
                        <div className="w-1.5 h-1.5 bg-zinc-800 rounded-full"></div>
                        <span className="cursor-pointer hover:text-white transition-colors flex items-center gap-2 px-2" onClick={handleShowFollowers}>
                           <Heart size={16} className="theme-text-primary" />
                           <span className="font-black text-white">{user.followers?.toLocaleString() || 0}</span>
                        </span>
                        <div className="w-1.5 h-1.5 bg-zinc-800 rounded-full"></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border flex items-center gap-2 ${user.role === 'Admin' ? 'bg-red-900/30 text-red-400 border-red-500/20' : 'bg-zinc-900 text-zinc-400 border-white/5'}`}>
                            {user.role === 'Admin' ? <ShieldAlert size={12}/> : <UserIcon size={12}/>}
                            {isProfileOwnerAccount ? 'App Owner' : user.role}
                        </span>
                     </div>

                     {/* Social Media Icons With Names */}
                     <div className="flex flex-wrap gap-4 mt-6">
                        {user.socialLinks?.youtube && (
                          <a href={user.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all">
                             <Youtube size={18} /> <span className="text-xs font-black">YouTube</span>
                          </a>
                        )}
                        {user.socialLinks?.instagram && (
                          <a href={user.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-xl text-pink-500 hover:bg-pink-500 hover:text-white transition-all">
                             <Instagram size={18} /> <span className="text-xs font-black">Instagram</span>
                          </a>
                        )}
                        {user.socialLinks?.facebook && (
                          <a href={user.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500 hover:bg-blue-500 hover:text-white transition-all">
                             <Facebook size={18} /> <span className="text-xs font-black">Facebook</span>
                          </a>
                        )}
                        {user.socialLinks?.discord && (
                          <a href={user.socialLinks.discord} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all">
                             <DiscordIcon size={18} /> <span className="text-xs font-black">Discord</span>
                          </a>
                        )}
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {/* Owner-Only Tools Panel */}
        {isCurrentUserOwner && !isOwnProfile && (
          <div className="mb-12 bg-red-600/5 border border-red-500/20 p-8 md:p-10 rounded-[3rem] space-y-8 animate-in slide-in-from-top-4 duration-700 shadow-2xl relative overflow-hidden">
             <div className="flex items-center justify-between border-b border-red-500/10 pb-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-red-600/10 text-red-500 rounded-2xl flex items-center justify-center shadow-lg border border-red-500/20">
                      <Shield size={24} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-white">لوحة المالك</h3>
                      <p className="text-red-500/60 text-[10px] font-black uppercase tracking-widest">Admin Controls</p>
                   </div>
                </div>
                {isOwnerProcessing && <Loader2 className="animate-spin text-red-500" size={24} />}
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button 
                  onClick={() => setConfirmModal({ isOpen: true, type: user.isVerified ? 'unverify' : 'verify' })}
                  className={`p-4 rounded-2xl border transition-all active:scale-95 flex flex-col items-center gap-2 ${user.isVerified ? 'bg-zinc-900 border-red-500/20 text-red-500' : 'theme-bg-primary-alpha theme-border-primary-alpha theme-text-primary'}`}
                >
                   {user.isVerified ? <BadgeCheck size={24} /> : <ShieldCheck size={24} />}
                   <span className="font-black text-[10px]">{user.isVerified ? 'سحب التوثيق' : 'توثيق الحساب'}</span>
                </button>

                <button 
                  onClick={() => setConfirmModal({ isOpen: true, type: user.isBlocked ? 'unban' : 'ban' })}
                  className={`p-4 rounded-2xl border transition-all active:scale-95 flex flex-col items-center gap-2 ${user.isBlocked ? 'bg-lime-500 border-lime-400 text-black' : 'bg-red-600/10 border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white'}`}
                >
                   {user.isBlocked ? <Unlock size={24} /> : <Ban size={24} />}
                   <span className="font-black text-[10px]">{user.isBlocked ? 'فك الحظر' : 'حظر الحساب'}</span>
                </button>

                <button 
                  onClick={() => setConfirmModal({ isOpen: true, type: 'notify' })}
                  className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-2xl text-blue-500 hover:bg-blue-600 hover:text-white transition-all active:scale-95 flex flex-col items-center gap-2"
                >
                   <Send size={24} />
                   <span className="font-black text-[10px]">إرسال تنبيه</span>
                </button>

                <button 
                  onClick={() => setConfirmModal({ isOpen: true, type: 'delete' })}
                  className="p-4 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-500 hover:bg-red-600 hover:text-white hover:border-red-600/50 transition-all active:scale-95 flex flex-col items-center gap-2"
                >
                   <Trash2 size={24} />
                   <span className="font-black text-[10px]">حذف نهائي</span>
                </button>
             </div>
          </div>
        )}

        {/* Improved Tabs */}
        <div className="flex items-center gap-4 mb-10 p-1.5 bg-zinc-900/50 border border-white/5 rounded-2xl w-fit mx-auto md:mx-0">
          <button 
            onClick={() => setActiveTab('mods')} 
            className={`px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${activeTab === 'mods' ? 'theme-bg-primary text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            <Sparkles size={16} /> أعمال المبدع
          </button>
          <button 
            onClick={() => setActiveTab('about')} 
            className={`px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${activeTab === 'about' ? 'theme-bg-primary text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            <Info size={16} /> عن المبدع
          </button>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           {activeTab === 'mods' ? (
             <div className="space-y-10">
                {fullMods.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                     {fullMods.map(m => (
                       <ModCard 
                        key={m.id} 
                        mod={{...m, isVerified: user.isVerified}} // Visual consistency
                        onClick={() => onModClick(m)} 
                        isFollowing={isFollowing || false} 
                        onFollow={(e) => { e.stopPropagation(); onFollow(); }} 
                       />
                     ))}
                  </div>
                ) : (
                  <div className="py-32 text-center border-2 border-dashed border-zinc-900 rounded-[3rem] bg-zinc-950/20">
                     <div className="w-20 h-20 bg-zinc-900 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-zinc-700">
                        <Inbox size={40} />
                     </div>
                     <h4 className="text-xl font-black text-zinc-600">لا توجد أعمال منشورة حالياً</h4>
                  </div>
                )}
             </div>
           ) : (
             <div className="space-y-8">
                {/* Info Boxes Moved Here */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {[
                     { val: fullMods.length, label: 'منشور', icon: <Layers size={16} />, color: 'bg-zinc-900/50' },
                     { 
                       val: user.followers?.toLocaleString() || 0, 
                       label: 'متابع', 
                       icon: <Heart size={16} />, 
                       color: 'bg-zinc-900/50',
                       onClick: handleShowFollowers,
                       isClickable: isOwnProfile || user.privacySettings?.showFollowersList
                     },
                     { val: totalDownloads?.toLocaleString() || 0, label: 'تحميل', icon: <Download size={16} />, color: 'bg-zinc-900/50' },
                     { val: totalViews?.toLocaleString() || 0, label: 'مشاهدة', icon: <Eye size={16} />, color: 'bg-zinc-900/50' }
                   ].map((s, i) => (
                     <div 
                       key={i} 
                       onClick={s.onClick}
                       className={`${s.color} border border-white/5 backdrop-blur-md p-5 rounded-3xl transition-colors group ${s.isClickable ? 'cursor-pointer hover:bg-zinc-800/80 active:scale-95' : 'cursor-default hover:bg-zinc-800/50'}`}
                     >
                        <div className="flex items-center justify-center gap-2 text-zinc-500 mb-2 group-hover:theme-text-primary transition-colors">
                          {s.icon}
                          <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-white">{s.val}</div>
                     </div>
                   ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                     <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-[3rem] space-y-6">
                        <h3 className="text-xl font-black text-white flex items-center gap-3">
                           <UserCircle className="theme-text-primary" size={24} /> السيرة الذاتية
                        </h3>
                        <div className="bg-zinc-950/50 p-6 rounded-3xl border border-white/5">
                          <p className="text-zinc-400 text-base leading-loose font-medium whitespace-pre-wrap">
                             {user.bio || 'لا توجد نبذة تعريفية متاحة لهذا المبدع حالياً.'}
                          </p>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="bg-zinc-900/30 border border-white/5 p-8 rounded-[3rem] space-y-6">
                        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] px-2">بطاقة المعلومات</h4>
                        <div className="space-y-3">
                           {[
                             { label: 'تاريخ الانضمام', val: user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }) : '---', icon: <Calendar size={16} /> },
                             { label: 'المعرف الرقمي', val: user.numericId || user.id, icon: <Hash size={16} />, isLtr: true },
                             { label: 'الرتبة', val: isProfileOwnerAccount ? 'App Owner' : user.role, icon: <Award size={16} /> }
                           ].map((item, idx) => (
                             <div key={idx} className="bg-zinc-950/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-3 text-zinc-500">
                                   <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shadow-inner">{item.icon}</div>
                                   <span className="text-[10px] font-black">{item.label}</span>
                                </div>
                                <span className={`text-white font-black text-xs ${item.isLtr ? 'ltr' : ''}`}>{item.val}</span>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* Followers List Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in" onClick={() => setShowFollowersModal(false)}></div>
           <div className="bg-[#0f0f0f] border border-white/10 p-8 rounded-[3rem] w-full max-w-md relative z-10 shadow-2xl animate-in zoom-in h-[70vh] flex flex-col">
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5">
                 <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Heart size={20} className="text-red-500" /> المتابعون
                 </h3>
                 <button onClick={() => setShowFollowersModal(false)} className="p-2 bg-zinc-900 text-zinc-500 rounded-xl hover:text-white transition-all"><X size={20}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                 {loadingFollowers ? (
                   <div className="flex justify-center py-10"><Loader2 className="animate-spin theme-text-primary" /></div>
                 ) : followersList.length > 0 ? (
                   followersList.map(follower => (
                     <div key={follower.id} className="flex items-center gap-4 p-4 bg-zinc-900/30 rounded-2xl border border-white/5">
                        <img src={follower.avatar} className="w-10 h-10 rounded-xl object-cover" />
                        <div className="text-right">
                           <h4 className="text-white font-black text-sm">{follower.displayName}</h4>
                           <p className="text-zinc-600 text-[10px] ltr">@{follower.username}</p>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="text-center py-10 text-zinc-600 font-bold">لا يوجد متابعون لعرضهم</div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Owner Action Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md animate-in fade-in duration-300" onClick={() => !isOwnerProcessing && setConfirmModal(null)}></div>
          <div className="bg-[#0a0a0a] border border-white/10 p-10 md:p-14 rounded-[4rem] w-full max-w-lg relative z-10 shadow-2xl text-center animate-in zoom-in duration-300">
             <div className={`w-24 h-24 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 border shadow-xl ${confirmModal.type === 'delete' || confirmModal.type === 'ban' ? 'bg-red-600/10 text-red-500 border-red-500/20' : 'bg-lime-500/10 text-lime-500 border-lime-500/20'}`}>
                {confirmModal.type === 'delete' ? <Trash2 size={56} /> : 
                 confirmModal.type === 'ban' ? <Ban size={56} /> : 
                 confirmModal.type === 'unban' ? <Unlock size={56} /> :
                 confirmModal.type === 'verify' ? <ShieldCheck size={56} /> :
                 confirmModal.type === 'unverify' ? <Shield size={56} /> :
                 <Send size={56} />}
             </div>
             <h3 className="text-3xl font-black text-white mb-4">
                {confirmModal.type === 'delete' ? 'تأكيد حذف الحساب نهائياً؟' : 
                 confirmModal.type === 'ban' ? 'تأكيد حظر الحساب؟' : 
                 confirmModal.type === 'unban' ? 'تأكيد فك الحظر؟' :
                 confirmModal.type === 'verify' ? 'تأكيد توثيق الحساب؟' :
                 confirmModal.type === 'unverify' ? 'تأكيد سحب التوثيق؟' :
                 'تأكيد إرسال التنبيه؟'}
             </h3>
             <p className="text-zinc-500 text-sm font-medium mb-12 leading-relaxed">
                {confirmModal.type === 'delete' ? 'سيتم مسح كافة بيانات المستخدم نهائياً من قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه.' : 
                 'هل أنت متأكد من تنفيذ هذا الإجراء الإداري على حساب المستخدم؟'}
             </p>
             <div className="flex flex-col gap-4">
                <button 
                  onClick={handleOwnerAction}
                  disabled={isOwnerProcessing}
                  className={`w-full py-6 rounded-3xl font-black text-xl active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 ${confirmModal.type === 'delete' || confirmModal.type === 'ban' ? 'bg-red-600 text-white shadow-red-900/20' : 'bg-lime-500 text-black shadow-lime-900/20'}`}
                >
                  {isOwnerProcessing ? <Loader2 className="animate-spin" /> : <CheckCircle size={24} />} تأكيد التنفيذ
                </button>
                <button 
                  onClick={() => setConfirmModal(null)}
                  disabled={isOwnerProcessing}
                  className="w-full py-6 bg-zinc-900 text-zinc-500 rounded-3xl font-black text-xl hover:text-white transition-colors"
                >
                  إلغاء
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
