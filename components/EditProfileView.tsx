
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { ArrowRight, Save, LogOut, Trash2, Camera, Loader2, Mail, User as UserIcon, Hash, CheckCircle, AlertCircle, X, ShieldAlert, FileText, Clock, Youtube, Facebook, Instagram, Image as ImageIcon } from 'lucide-react';
import { db } from '../db';

interface EditProfileViewProps {
  currentUser: User;
  onUpdate: (updated: User) => void;
  onLogout: () => void;
  onDelete: () => void;
  onBack: () => void;
}

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

const EditProfileView: React.FC<EditProfileViewProps> = ({ currentUser, onUpdate, onLogout, onDelete, onBack }) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [username, setUsername] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState(currentUser.banner || '');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  
  // Social Links State
  const [socialLinks, setSocialLinks] = useState(currentUser.socialLinks || {});

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const translateAuthError = (err: any): string => {
    const msg = err.code || err.message || '';
    if (msg.includes('auth/email-already-in-use')) {
      return 'هذا البريد الإلكتروني مستخدم بالفعل في حساب آخر. يرجى اختيار بريد مختلف.';
    }
    if (msg.includes('auth/requires-recent-login')) {
      return 'لأسباب أمنية، يرجى تسجيل الخروج ثم الدخول مرة أخرى قبل محاولة تغيير البريد الإلكتروني.';
    }
    if (msg.includes('auth/invalid-email')) {
      return 'البريد الإلكتروني المدخل غير صالح.';
    }
    return 'حدث خطأ أثناء حفظ البيانات. يرجى المحاولة لاحقاً.';
  };

  const isRestrictedName = (name: string) => {
    const forbidden = "overmods";
    const cleanName = name.toLowerCase().replace(/\s+/g, '');
    return cleanName.includes(forbidden);
  };

  const handleUsernameChange = (val: string) => {
    const latinOnly = val.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setUsername(latinOnly);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setError(null);
        const resizedDataUrl = await db.resizeImage(file);
        setAvatarPreview(resizedDataUrl);
        setAvatarFile(file);
      } catch (err) { setError('فشل في معالجة الصورة'); }
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setError(null);
        // Using a slightly larger dimension for banner
        const resizedDataUrl = await db.resizeImage(file, 1200, 600);
        setBannerPreview(resizedDataUrl);
        setBannerFile(file);
      } catch (err) { setError('فشل في معالجة صورة الغلاف'); }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (isRestrictedName(displayName)) {
      setError('عذراً، هذا الاسم محجوز للنظام');
      return;
    }

    if (/[^a-z0-9_]/.test(username)) {
      setError('اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Sync Email with Firebase Auth if it changed
      if (email.trim() !== currentUser.email) {
        await db.updateAuthEmail(email.trim());
      }

      // 2. Update Firestore profile
      const updateData = {
        displayName: displayName.trim(),
        username: username.toLowerCase().trim(),
        email: email.trim(),
        bio: bio.trim(),
        avatar: avatarPreview,
        banner: bannerPreview,
        socialLinks: socialLinks
      };

      await db.updateAccount(currentUser.id, updateData);
      onUpdate({ ...currentUser, ...updateData });
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(translateAuthError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await db.scheduleAccountDeletion(currentUser.id);
      alert('تم جدولة حذف حسابك بنجاح. سيتم مسح بياناتك نهائياً بعد 24 ساعة من الآن.');
      onLogout();
    } catch (err: any) {
      setError(err.message || 'فشل في طلب حذف الحساب');
      setShowDeleteModal(false);
      setIsDeleting(false);
    }
  };

  const confirmLogout = async () => {
    try { await onLogout(); } catch (err) {
      setError('فشل في تسجيل الخروج');
      setShowLogoutModal(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="px-6 flex items-center justify-between mb-12">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all font-black group active:scale-95">
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          <span>الملف الشخصي</span>
        </button>
        <h2 className="text-2xl font-black text-white">تعديل الحساب</h2>
      </div>

      <div className="space-y-12">
          <form onSubmit={handleSave} className="space-y-10">
            {/* Banner Section */}
            <div className="px-6 space-y-4">
               <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">صورة الغلاف</label>
               <div 
                 onClick={() => !isSaving && bannerInputRef.current?.click()}
                 className="w-full h-40 bg-zinc-900 border border-white/5 rounded-[2rem] overflow-hidden relative group cursor-pointer"
               >
                  {bannerPreview ? (
                    <img src={bannerPreview} className="w-full h-full object-cover group-hover:opacity-60 transition-all" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
                       <ImageIcon size={32} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                     <span className="bg-black/50 text-white px-4 py-2 rounded-xl text-xs font-black backdrop-blur-sm flex items-center gap-2">
                        <Camera size={16} /> تغيير الغلاف
                     </span>
                  </div>
               </div>
               <input ref={bannerInputRef} type="file" className="hidden" accept="image/*" onChange={handleBannerChange} />
            </div>

            <div className="flex flex-col items-center">
              <div 
                onClick={() => !isSaving && fileInputRef.current?.click()}
                className="w-32 h-32 rounded-[3rem] border-4 border-zinc-900 hover:border-lime-500 cursor-pointer overflow-hidden relative group bg-zinc-900 transition-all shadow-2xl -mt-16 z-10"
              >
                <img src={avatarPreview} className="w-full h-full object-cover group-hover:opacity-40 transition-all" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <Camera size={32} className="text-white" />
                </div>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              <span className="text-[10px] mt-4 font-black uppercase text-zinc-600 tracking-[0.3em]">تغيير صورة الهوية</span>
            </div>

            <div className="px-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">الاسم المعروض</label>
                <input 
                  type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} 
                  className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-5 px-6 outline-none transition-all text-white font-black text-base focus:border-lime-500/50 shadow-inner" 
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">نبذة عنك (Bio)</label>
                <textarea 
                  value={bio} onChange={(e) => setBio(e.target.value)} 
                  placeholder="أخبر المجتمع شيئاً عنك..."
                  className="w-full bg-zinc-900/40 border border-white/5 rounded-3xl py-5 px-6 outline-none transition-all text-white font-medium text-base focus:border-lime-500/50 resize-none shadow-inner" 
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">اسم المستخدم</label>
                  <input 
                    type="text" value={username} onChange={(e) => handleUsernameChange(e.target.value)} 
                    className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-5 px-6 outline-none transition-all text-white font-black text-base ltr focus:border-lime-500/50 shadow-inner" 
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">البريد الإلكتروني</label>
                  <input 
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} 
                    className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-5 px-6 outline-none transition-all text-white font-black text-base ltr focus:border-lime-500/50 shadow-inner" 
                    required
                  />
                </div>
              </div>

              {/* Social Media Links Section */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                 <h3 className="text-white font-black text-sm flex items-center gap-2 mb-4">
                    <span className="text-lime-500">#</span> روابط التواصل الاجتماعي
                 </h3>
                 <div className="grid grid-cols-1 gap-4">
                    <div className="relative group">
                       <Youtube className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" size={18} />
                       <input 
                         type="url" 
                         value={socialLinks.youtube || ''} 
                         onChange={e => setSocialLinks({...socialLinks, youtube: e.target.value})} 
                         placeholder="رابط يوتيوب"
                         className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white text-sm outline-none focus:border-red-500/50 ltr placeholder:text-right"
                       />
                    </div>
                    <div className="relative group">
                       <Instagram className="absolute right-4 top-1/2 -translate-y-1/2 text-pink-500" size={18} />
                       <input 
                         type="url" 
                         value={socialLinks.instagram || ''} 
                         onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} 
                         placeholder="رابط انستقرام"
                         className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white text-sm outline-none focus:border-pink-500/50 ltr placeholder:text-right"
                       />
                    </div>
                    <div className="relative group">
                       <Facebook className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                       <input 
                         type="url" 
                         value={socialLinks.facebook || ''} 
                         onChange={e => setSocialLinks({...socialLinks, facebook: e.target.value})} 
                         placeholder="رابط فيسبوك"
                         className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white text-sm outline-none focus:border-blue-500/50 ltr placeholder:text-right"
                       />
                    </div>
                    <div className="relative group">
                       <DiscordIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                       <input 
                         type="url" 
                         value={socialLinks.discord || ''} 
                         onChange={e => setSocialLinks({...socialLinks, discord: e.target.value})} 
                         placeholder="رابط ديسكورد"
                         className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white text-sm outline-none focus:border-indigo-500/50 ltr placeholder:text-right"
                       />
                    </div>
                 </div>
              </div>

              {error && (
                <div className="p-5 bg-red-600/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs font-black animate-in shake">
                  <AlertCircle size={20} className="shrink-0" /> {error}
                </div>
              )}

              {success && (
                <div className="p-5 bg-lime-500/10 border border-lime-500/20 rounded-2xl flex items-center gap-3 text-lime-500 text-xs font-black">
                  <CheckCircle size={20} /> تم حفظ التغييرات بنجاح
                </div>
              )}

              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full py-6 bg-lime-500 hover:bg-lime-400 text-black rounded-3xl font-black text-xl shadow-[0_20px_40px_rgba(132,204,22,0.2)] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save size={24} />}
                  حفظ البيانات
                </button>
              </div>
            </div>
          </form>

          <div className="px-6 pt-12 border-t border-white/5 space-y-4">
             <button 
              onClick={() => setShowLogoutModal(true)}
              className="w-full py-5 bg-zinc-900/50 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 active:scale-95 border border-white/5"
             >
               <LogOut size={16} /> تسجيل الخروج
             </button>
             
             <button 
              onClick={() => setShowDeleteModal(true)}
              className="w-full py-5 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 active:scale-95"
             >
               <Trash2 size={16} /> حذف الحساب نهائياً
             </button>
          </div>
      </div>

      {/* Overlays */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowLogoutModal(false)}></div>
          <div className="bg-[#0f0f0f] border border-white/10 p-10 rounded-[3rem] w-full max-w-md relative z-10 shadow-2xl text-center">
             <div className="w-20 h-20 bg-zinc-900 text-zinc-400 rounded-3xl flex items-center justify-center mx-auto mb-6"><LogOut size={40} /></div>
             <h3 className="text-2xl font-black text-white mb-3">تسجيل الخروج؟</h3>
             <p className="text-zinc-500 text-sm font-medium mb-8">هل أنت متأكد من رغبتك في إنهاء الجلسة؟</p>
             <div className="flex flex-col gap-3">
                <button onClick={confirmLogout} className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg active:scale-95 transition-all">خروج</button>
                <button onClick={() => setShowLogoutModal(false)} className="w-full py-5 bg-zinc-900 text-zinc-500 rounded-2xl font-black text-lg">إلغاء</button>
             </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => !isDeleting && setShowDeleteModal(false)}></div>
          <div className="bg-[#0f0f0f] border border-red-500/20 p-10 rounded-[4rem] w-full max-w-lg relative z-10 shadow-2xl text-center">
             <div className="w-24 h-24 bg-red-600/10 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-xl">
               <AlertCircle size={56} />
             </div>
             <h3 className="text-3xl font-black text-white mb-4">حذف الحساب؟</h3>
             
             <div className="bg-red-600/5 p-6 rounded-3xl mb-10 text-right space-y-4">
                <div className="flex items-center gap-3 text-red-500 font-black text-sm">
                   <Clock size={18} /> انتظار 24 ساعة
                </div>
                <p className="text-zinc-500 text-xs font-medium leading-relaxed">
                   يستغرق تنفيذ الحذف النهائي <span className="text-white font-black">24 ساعة</span>. يمكنك التراجع خلال هذه المدة.
                </p>
             </div>

             <div className="flex flex-col gap-4">
                <button 
                  onClick={confirmDelete} 
                  disabled={isDeleting}
                  className="w-full py-6 bg-red-600 text-white rounded-3xl font-black text-xl active:scale-95 transition-all"
                >
                  {isDeleting ? <Loader2 className="animate-spin" /> : 'تأكيد الحذف'}
                </button>
                <button onClick={() => setShowDeleteModal(false)} className="w-full py-6 bg-zinc-900 text-zinc-500 rounded-3xl font-black text-xl hover:text-white transition-colors">إلغاء</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProfileView;