import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { Mail, ShieldCheck, Loader2, Image as ImageIcon, AlertCircle, Send, CheckCircle2, User as UserIcon, Lock, Camera, CheckCircle, ArrowRight, Eye, EyeOff, Hash, AlertTriangle, FileText, Check as CheckIcon, X } from 'lucide-react';
import { db, auth } from '../db';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('register');
  const [registerStep, setRegisterStep] = useState<'select' | 'form'>('select');
  const [regMethod, setRegMethod] = useState<'email' | 'username'>('email');
  
  // Form State
  const [identifier, setIdentifier] = useState(''); // For login (email or username)
  const [regEmail, setRegEmail] = useState(''); // For registration
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  
  // File State
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<{ field?: string, message: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  
  // Legal Modal States
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean, type: 'privacy' | 'terms' }>({ isOpen: false, type: 'privacy' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error) setError(null);
  }, [identifier, regEmail, password, displayName, username, confirmPassword, avatarFile, agreedToPolicies, regMethod]);

  // Reset states when tab changes
  useEffect(() => {
    setRegisterStep('select');
    setError(null);
    setIdentifier('');
    setRegEmail('');
    setUsername('');
    setDisplayName('');
    setPassword('');
    setConfirmPassword('');
    setAvatarFile(null);
    setAvatarPreview('');
  }, [activeTab]);

  const translateAuthError = (err: any): string => {
    const msg = err.code || err.message || '';
    // console.log("Auth Error:", msg); // For debugging
    
    if (msg.includes('auth/email-already-in-use')) {
      return 'هذا البريد الإلكتروني مسجل بالفعل. يرجى استخدام بريد آخر أو تسجيل الدخول.';
    }
    if (msg.includes('auth/invalid-email')) {
      return 'البريد الإلكتروني المدخل غير صالح.';
    }
    if (msg.includes('auth/weak-password')) {
      return 'كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أقوى (6 أحرف على الأقل).';
    }
    if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
      return 'بيانات الدخول غير صحيحة. تأكد من البريد/اسم المستخدم وكلمة المرور.';
    }
    if (msg.includes('auth/network-request-failed')) {
      return 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
    }
    
    // Return custom error messages directly
    if (!msg.includes('auth/')) return msg;

    return `حدث خطأ غير متوقع: ${msg}`;
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Always set the file first so registration isn't blocked by preview issues
      setAvatarFile(file);
      setError(null);

      try {
        // Attempt to resize for a nice preview
        const resized = await db.resizeImage(file, 400, 400);
        if (resized) {
          setAvatarPreview(resized);
        } else {
          // Fallback if resize returns empty (fail-safe)
          setAvatarPreview(URL.createObjectURL(file));
        }
      } catch (err) {
        // If resizing crashes completely, just show the raw file
        console.warn("Preview generation failed, using raw file", err);
        setAvatarPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      triggerShake();
      return setError({ message: 'يرجى إدخال البريد/اسم المستخدم وكلمة المرور' });
    }

    setIsLoading(true);
    setStatusMessage('جاري التحقق...');
    setError(null);

    try {
      const firebaseUser = await db.login(identifier.trim(), password);
      const profile = await db.get('users', firebaseUser.uid);
      
      if (profile) {
        if (profile.isBlocked) {
          await db.logout();
          const reason = profile.blockedReason || 'مخالفة سياسات المنصة';
          throw new Error(`هذا الحساب محظور حالياً. السبب: ${reason}`);
        }
        onLogin(profile as User);
      } else {
        throw new Error('تعذر العثور على بيانات الملف الشخصي.');
      }
    } catch (err: any) {
      triggerShake();
      setError({ message: translateAuthError(err) });
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!displayName.trim()) return setError({ field: 'displayName', message: 'يرجى كتابة اسمك' });
    if (!username.trim() || username.length < 3) return setError({ field: 'username', message: 'اسم المستخدم قصير جداً' });
    
    // Validate email ONLY if method is email
    if (regMethod === 'email') {
       if (!regEmail.trim()) return setError({ field: 'email', message: 'البريد الإلكتروني مطلوب' });
       if (!regEmail.includes('@') || !regEmail.includes('.')) return setError({ field: 'email', message: 'تنسيق البريد الإلكتروني غير صحيح' });
    }

    if (password.length < 6) return setError({ field: 'password', message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    if (password !== confirmPassword) return setError({ field: 'confirm', message: 'كلمات المرور غير متطابقة' });
    // Avatar is optional but recommended; if null, DB will generate a default one.
    // if (!avatarFile) return setError({ field: 'avatar', message: 'يجب اختيار صورة شخصية' }); 
    if (!agreedToPolicies) return setError({ message: 'يجب الموافقة على الشروط' });

    setIsLoading(true);
    setStatusMessage('جاري إنشاء الحساب...');

    try {
      const emailToRegister = regMethod === 'email' ? regEmail.trim() : null;
      // We pass the avatarFile even if null; db.register handles fallback
      const newUser = await db.register(emailToRegister, password, displayName, username, avatarFile!);
      
      if (newUser) {
        setSuccessMsg('تم إنشاء الحساب بنجاح! جاري تحويلك...');
        // Auto-login since creation was successful
        setTimeout(() => {
           onLogin(newUser);
        }, 1500);
      } else {
        throw new Error('فشل إنشاء ملف المستخدم');
      }

    } catch (err: any) {
      triggerShake();
      setError({ message: translateAuthError(err) });
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const LegalContent = () => {
    if (legalModal.type === 'privacy') {
      return (
        <div className="space-y-6 text-right" dir="rtl">
          <h2 className="text-2xl font-black theme-text-primary">سياسة الخصوصية</h2>
          <div className="space-y-4 text-zinc-400 font-medium text-sm leading-relaxed">
            <p>مرحباً بك في Over Mods. نحن نولي خصوصيتك أهمية قصوى ونلتزم بحماية بياناتك الشخصية.</p>
            <ul className="list-disc pr-5 space-y-2">
              <li>بياناتك في أمان تام ومحمية بأفضل المعايير الأمنية المتاحة.</li>
              <li>نحن <span className="text-white font-black">لا نقوم ببيع</span> أو تسريب أو مشاركة بياناتك الشخصية مع أي طرف ثالث لأي أغراض تسويقية.</li>
              <li>تُستخدم المعلومات التي تقدمها فقط لتوفير ميزات التطبيق الأساسية مثل (إنشاء الحساب، الدردشة مع الأصدقاء، رفع المودات، وإضافة السيرفرات).</li>
              <li>نطبق تدابير أمنية تقنية وإدارية لحماية حسابك ومعلوماتك من الوصول غير المصرح به.</li>
              <li>يحق لمديري المنصة مراجعة المحتوى العام والخاص (عند الضرورة) لأغراض الإشراف، منع الاستغلال، وضمان سلامة المجتمع فقط.</li>
              <li>يمكنك في أي وقت إدارة خيارات الخصوصية الخاصة بك من قسم الإعدادات داخل التطبيق.</li>
            </ul>
            <div className="pt-4 border-t border-white/5">
              <p>لأي استفسارات تتعلق بالخصوصية، يمكنك التواصل معنا عبر:</p>
              <p className="text-white font-black mt-1">privacy@overmods.com</p>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-6 text-right" dir="rtl">
          <h2 className="text-2xl font-black theme-text-primary">شروط الاستخدام</h2>
          <div className="space-y-4 text-zinc-400 font-medium text-sm leading-relaxed">
            <p>باستخدامك لمنصة Over Mods، فإنك توافق على الالتزام بالشروط والقواعد التالية:</p>
            <ul className="list-disc pr-5 space-y-2">
              <li>يجب على جميع المستخدمين اتباع قواعد المنصة وإرشادات المجتمع العامة واحترام الآخرين.</li>
              <li>للمسؤولين والمشرفين الحق الكامل والمطلق في:
                <ul className="list-circle pr-5 mt-2 space-y-1">
                  <li>تقييد الوصول إلى ميزات معينة.</li>
                  <li>تعليق الحسابات مؤقتاً.</li>
                  <li>حظر الحسابات نهائياً من المنصة.</li>
                </ul>
              </li>
              <li>يحق للإدارة اتخاذ أي إجراء إداري تراه مناسباً <span className="text-white font-black">بذكر أو بدون ذكر الأسباب</span> لضمان استقرار وسلامة المنصة.</li>
              <li>يُمنع منعاً باتاً الإساءة للآخرين، إرسال الرسائل المزعجة (Spam)، محاولات الاختراق، الاستغلال، أو أي سلوك ضار بالمجتمع.</li>
              <li>المنصة غير مسؤولة قانونياً عن المحتوى الذي يتم إنشاؤه أو رفعه من قبل المستخدمين، ولكننا نقوم بمراقبته لضمان الجودة.</li>
              <li>أي مخالفة لهذه الشروط قد تؤدي إلى تعليق حسابك أو حظره نهائياً دون سابق إنذار.</li>
              <li>استمرارك في استخدام التطبيق يعتبر موافقة ضمنية ومتجددة على هذه الشروط.</li>
            </ul>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className={`max-w-md w-full transition-transform duration-500 ${shake ? 'animate-shake' : ''}`}>
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
          }
          .animate-shake { animation: shake 0.3s ease-in-out; }
        `}</style>
        
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
          {/* Tabs header */}
          <div className="flex border-b border-white/5">
            <button 
              disabled={isLoading}
              onClick={() => { setActiveTab('login'); }}
              className={`flex-1 py-6 text-sm font-black transition-all ${activeTab === 'login' ? 'theme-text-primary bg-primary-alpha' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              تسجيل دخول
            </button>
            <button 
              disabled={isLoading}
              onClick={() => { setActiveTab('register'); }}
              className={`flex-1 py-6 text-sm font-black transition-all ${activeTab === 'register' ? 'theme-text-primary bg-primary-alpha' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              إنشاء حساب
            </button>
          </div>

          <div className="p-8 md:p-10">
            {/* Alerts */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-[11px] font-black animate-in slide-in-from-top-2">
                <AlertTriangle size={18} className="shrink-0" />
                <span className="leading-relaxed">{error.message}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-6 p-4 theme-bg-primary-alpha theme-border-primary-alpha rounded-2xl flex items-center gap-3 theme-text-primary text-[11px] font-black">
                <CheckCircle2 size={18} /> {successMsg}
              </div>
            )}

            {/* --- LOGIN FORM --- */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4 animate-in slide-in-from-right duration-300">
                <div className="relative group">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:theme-text-primary transition-colors" size={18} />
                  <input 
                    type="text" 
                    value={identifier} 
                    onChange={e => setIdentifier(e.target.value)} 
                    placeholder="البريد الإلكتروني أو اسم المستخدم" 
                    className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white text-sm ltr outline-none focus:theme-border-primary-alpha" 
                    required 
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:theme-text-primary transition-colors" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="كلمة المرور" 
                    className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pr-12 pl-12 text-white text-sm ltr outline-none focus:theme-border-primary-alpha" 
                    required 
                  />
                  <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-white">
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>

                <div className="pt-4">
                  {isLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="animate-spin theme-text-primary mx-auto mb-2" size={28} />
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{statusMessage}</p>
                    </div>
                  ) : (
                    <button type="submit" className="w-full py-5 theme-bg-primary text-black rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                      دخول آمن <Send size={20} />
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* --- REGISTER FORM --- */}
            {activeTab === 'register' && (
              <>
                {/* Step 1: Method Selection */}
                {registerStep === 'select' ? (
                  <div className="flex flex-col gap-3 py-4 animate-in slide-in-from-right duration-300">
                    <h3 className="text-center text-white font-black text-xs mb-2">اختر طريقة التسجيل المناسبة لك</h3>
                    
                    <button 
                      type="button" 
                      onClick={() => { setRegMethod('email'); setRegisterStep('form'); }} 
                      className="p-4 bg-zinc-900 border border-white/5 rounded-[1.5rem] flex items-center gap-4 hover:border-lime-500 hover:bg-zinc-800 transition-all group active:scale-98"
                    >
                       <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:theme-text-primary transition-colors border border-white/5 shadow-lg">
                          <Mail size={20} />
                       </div>
                       <div className="text-right flex-1">
                          <h4 className="text-white font-black text-sm">البريد الإلكتروني</h4>
                          <p className="text-zinc-600 text-[10px] font-bold mt-0.5">التسجيل التقليدي (يحتاج تفعيل)</p>
                       </div>
                       <div className="w-6 h-6 rounded-full bg-zinc-950 flex items-center justify-center group-hover:theme-bg-primary group-hover:text-black transition-all">
                          <ArrowRight size={12} className="rotate-180" />
                       </div>
                    </button>

                    <button 
                      type="button" 
                      onClick={() => { setRegMethod('username'); setRegisterStep('form'); }} 
                      className="p-4 bg-zinc-900 border border-white/5 rounded-[1.5rem] flex items-center gap-4 hover:border-lime-500 hover:bg-zinc-800 transition-all group active:scale-98"
                    >
                       <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-zinc-500 group-hover:theme-text-primary transition-colors border border-white/5 shadow-lg">
                          <Hash size={20} />
                       </div>
                       <div className="text-right flex-1">
                          <h4 className="text-white font-black text-sm">اسم المستخدم</h4>
                          <p className="text-zinc-600 text-[10px] font-bold mt-0.5">تسجيل سريع ومباشر</p>
                       </div>
                       <div className="w-6 h-6 rounded-full bg-zinc-950 flex items-center justify-center group-hover:theme-bg-primary group-hover:text-black transition-all">
                          <ArrowRight size={12} className="rotate-180" />
                       </div>
                    </button>
                  </div>
                ) : (
                  /* Step 2: Input Form */
                  <form onSubmit={handleRegister} className="space-y-4 animate-in slide-in-from-left duration-300">
                    <button 
                      type="button" 
                      onClick={() => setRegisterStep('select')} 
                      className="flex items-center gap-2 text-zinc-500 hover:text-white font-black text-xs mb-6 transition-colors group"
                    >
                       <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /> العودة للاختيار
                    </button>

                    <div className="flex flex-col items-center mb-8">
                       <div 
                        onClick={() => !isLoading && fileInputRef.current?.click()}
                        className={`w-24 h-24 rounded-[2rem] border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden bg-zinc-950 relative group ${error?.field === 'avatar' ? 'border-red-500' : 'border-zinc-800 hover:theme-border-primary'}`}
                       >
                         {avatarPreview ? (
                           <img src={avatarPreview} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                         ) : (
                           <Camera size={32} className="text-zinc-800 group-hover:theme-text-primary" />
                         )}
                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] font-black text-white uppercase">تغيير الصورة</span>
                         </div>
                       </div>
                       <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                       {/* Removed strict error for avatar to allow default fallback */}
                    </div>

                    <div className="space-y-4">
                      <div className="relative group">
                        <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:theme-text-primary transition-colors" size={18} />
                        <input type="text" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="الاسم الكامل" className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white text-sm outline-none focus:theme-border-primary-alpha" required />
                      </div>

                      <div className="relative group">
                        <Hash className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:theme-text-primary transition-colors" size={18} />
                        <input type="text" value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="اسم المستخدم (بالإنجليزي)" className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white text-sm ltr outline-none focus:theme-border-primary-alpha" required />
                      </div>

                      {/* Email Field - Visible only if method is email */}
                      {regMethod === 'email' && (
                        <div className="relative group animate-in slide-in-from-top-2">
                          <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:theme-text-primary transition-colors" size={18} />
                          <input 
                            type="email" 
                            value={regEmail} 
                            onChange={e=>setRegEmail(e.target.value)} 
                            placeholder="البريد الإلكتروني *"
                            className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white text-sm ltr outline-none focus:theme-border-primary-alpha" 
                            required 
                          />
                        </div>
                      )}

                      <div className="relative group">
                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:theme-text-primary transition-colors" size={18} />
                        <input type="showPassword" value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور" className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pr-12 pl-12 text-white text-sm ltr outline-none focus:theme-border-primary-alpha" required />
                        <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-white">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                      </div>

                      <div className="relative group">
                        <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:theme-text-primary transition-colors" size={18} />
                        <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="تأكيد كلمة المرور" className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white text-sm ltr outline-none focus:theme-border-primary-alpha" required />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-zinc-900/40 border border-white/5 rounded-2xl mt-4">
                      <div 
                        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${agreedToPolicies ? 'theme-bg-primary theme-border-primary' : 'border-zinc-800 bg-zinc-950'}`}
                        onClick={() => setAgreedToPolicies(!agreedToPolicies)}
                      >
                        {agreedToPolicies && <CheckIcon size={12} className="text-black" strokeWidth={4} />}
                      </div>
                      <div className="text-[10px] font-bold text-zinc-500 leading-relaxed">
                        أوافق على <span className="text-white underline cursor-pointer hover:theme-text-primary transition-colors" onClick={() => setLegalModal({ isOpen: true, type: 'privacy' })}>سياسة الخصوصية</span> و <span className="text-white underline cursor-pointer hover:theme-text-primary transition-colors" onClick={() => setLegalModal({ isOpen: true, type: 'terms' })}>شروط الاستخدام</span> الخاصة بمنصة Over Mods.
                      </div>
                    </div>

                    <div className="pt-4">
                      {isLoading ? (
                        <div className="text-center py-4">
                          <Loader2 className="animate-spin theme-text-primary mx-auto mb-2" size={28} />
                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{statusMessage}</p>
                        </div>
                      ) : (
                        <button type="submit" className="w-full py-5 theme-bg-primary text-black rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                          بدء رحلة الإبداع <Send size={20} />
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legal Modal Overlay */}
      {legalModal.isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setLegalModal({ ...legalModal, isOpen: false })}></div>
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
               <div className="w-12 h-12 theme-bg-primary-alpha theme-text-primary rounded-2xl flex items-center justify-center">
                  <ShieldCheck size={28} />
               </div>
               <button onClick={() => setLegalModal({ ...legalModal, isOpen: false })} className="p-3 bg-zinc-900 text-zinc-500 hover:text-white rounded-xl transition-all active:scale-90">
                  <X size={24} />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 md:p-12 no-scrollbar">
              <LegalContent />
            </div>
            
            <div className="p-8 border-t border-white/5 shrink-0">
              <button 
                onClick={() => setLegalModal({ ...legalModal, isOpen: false })}
                className="w-full py-5 theme-bg-primary text-black rounded-[1.5rem] font-black text-lg active:scale-95 transition-all"
              >
                فهمت وأوافق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginView;