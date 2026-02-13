
import React, { useState } from 'react';
import { ArrowRight, Youtube, CheckCircle2, AlertCircle, Sparkles, UserCheck, PlayCircle, Clock, CheckCircle, ExternalLink, ShieldCheck, FileCheck, HelpCircle, ChevronLeft } from 'lucide-react';
import { VerificationStatus, User } from '../types';

interface CreatorVerificationProps {
  onBack: () => void;
  onSuccess: (data: { reason?: string, channelUrl?: string, subscriberCount?: string }, status: VerificationStatus, videoUrl?: string) => void;
  currentUser: User;
}

const CreatorVerification: React.FC<CreatorVerificationProps> = ({ onBack, onSuccess, currentUser }) => {
  // 0: Initial Question, 1: Option A (Independent), 2: Option B Step 1 (YT Info), 3: Option B Step 2 (Video Proof)
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  
  const [reason, setReason] = useState('');
  const [subCount, setSubCount] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleOptionA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.length < 10) {
      setError('يرجى كتابة سبب مقنع (10 أحرف على الأقل)');
      return;
    }
    onSuccess({ reason: reason.trim() }, 'pending');
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelUrl.trim() || !channelUrl.includes('youtube.com')) {
      setError('الرجاء إدخال رابط قناة يوتيوب صحيح');
      return;
    }
    if (!subCount.trim()) {
      setError('يرجى إدخال عدد المشتركين');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim() || !videoUrl.includes('youtube.com')) {
      setError('الرجاء وضع رابط فيديو الإثبات الصحيح');
      return;
    }
    onSuccess({ channelUrl: channelUrl.trim(), subscriberCount: subCount.trim() }, 'pending', videoUrl.trim());
  };

  const handleSkipVideo = () => {
    onSuccess({ channelUrl: channelUrl.trim(), subscriberCount: subCount.trim() }, 'youtuber_no_video');
  };

  return (
    <div className="max-w-2xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4">
      <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-all font-bold group">
        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        <span>العودة للرئيسية</span>
      </button>

      <div className="bg-zinc-950 border border-white/5 p-8 md:p-14 rounded-[4rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-1.5 theme-bg-primary-alpha opacity-30"></div>
        
        {step === 0 && (
          <div className="space-y-12 text-center animate-in zoom-in duration-300">
            <div className="space-y-4">
               <div className="w-20 h-20 theme-bg-primary-alpha rounded-[2rem] flex items-center justify-center theme-text-primary mx-auto mb-6 border theme-border-primary-alpha shadow-2xl">
                 <HelpCircle size={40} />
               </div>
               <h2 className="text-3xl md:text-4xl font-black mb-3">هل أنت يوتيوبر؟</h2>
               <p className="text-zinc-500 font-medium leading-relaxed">
                  نحن بحاجة للتعرف عليك بشكل أفضل لتفعيل ميزات النشر في حسابك.
               </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <button 
                onClick={() => setStep(2)}
                className="group p-10 rounded-[2.5rem] border-2 border-white/5 bg-zinc-900/50 hover:bg-zinc-900 hover:theme-border-primary-alpha transition-all flex flex-col items-center gap-5 active:scale-95 shadow-xl"
               >
                  <div className="w-16 h-16 bg-red-600/10 text-red-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Youtube size={36} />
                  </div>
                  <span className="block text-white font-black text-xl">نعم، أملك قناة</span>
               </button>

               <button 
                onClick={() => setStep(1)}
                className="group p-10 rounded-[2.5rem] border-2 border-white/5 bg-zinc-900/50 hover:bg-zinc-900 hover:theme-border-primary-alpha transition-all flex flex-col items-center gap-5 active:scale-95 shadow-xl"
               >
                  <div className="w-16 h-16 bg-zinc-950 text-zinc-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Sparkles size={36} />
                  </div>
                  <span className="block text-white font-black text-xl">لا، أنا مبدع مستقل</span>
               </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
             <div className="text-center">
                <h3 className="text-2xl font-black text-white mb-2">لماذا تريد النشر في Over Mods؟</h3>
                <p className="text-zinc-500 text-sm">أخبرنا قليلاً عن هدفك أو نوع المحتوى الذي ستقدمه</p>
             </div>
             
             <form onSubmit={handleOptionA} className="space-y-6">
                <textarea 
                  value={reason} 
                  onChange={e=>setReason(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-3xl p-6 text-white font-medium text-base outline-none focus:theme-border-primary transition-all resize-none shadow-inner" 
                  rows={5}
                  placeholder="اكتب هنا..."
                  required
                />
                
                {error && <div className="text-red-500 text-[10px] font-black mr-2">⚠️ {error}</div>}

                <div className="flex gap-3">
                   <button type="button" onClick={() => setStep(0)} className="p-5 bg-zinc-900 text-zinc-500 rounded-2xl hover:text-white transition-all"><ArrowRight className="rotate-180" /></button>
                   <button type="submit" className="flex-1 py-5 theme-bg-primary text-black rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl">إرسال الطلب</button>
                </div>
             </form>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
             <div className="text-center">
                <h3 className="text-2xl font-black text-white mb-2">بيانات القناة</h3>
                <p className="text-zinc-500 text-sm">سنحتاج لهذه المعلومات للتحقق من هويتك</p>
             </div>

             <form onSubmit={handleStep2Submit} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">رابط القناة (YouTube Link)</label>
                   <input 
                    type="url" value={channelUrl} onChange={e=>setChannelUrl(e.target.value)} 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm ltr outline-none focus:theme-border-primary shadow-inner" 
                    placeholder="https://youtube.com/@yourchannel" required
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">عدد المشتركين</label>
                   <input 
                    type="text" value={subCount} onChange={e=>setSubCount(e.target.value)} 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm outline-none focus:theme-border-primary shadow-inner" 
                    placeholder="مثلاً: 50,000" required
                   />
                </div>

                {error && <div className="text-red-500 text-[10px] font-black mr-2">⚠️ {error}</div>}

                <div className="flex gap-3 pt-4">
                   <button type="button" onClick={() => setStep(0)} className="p-5 bg-zinc-900 text-zinc-500 rounded-2xl hover:text-white transition-all"><ArrowRight className="rotate-180" /></button>
                   <button type="submit" className="flex-1 py-5 theme-bg-primary text-black rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl">التالي <ChevronLeft size={20} className="inline-block mr-2" /></button>
                </div>
             </form>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
             <div className="text-center">
                <div className="w-16 h-16 bg-red-600/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6"><Youtube size={32} /></div>
                <h3 className="text-2xl font-black text-white mb-2">إثبات ملكية القناة</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                   للتأكد من أنك صاحب القناة، قم برفع فيديو <span className="text-white font-black">"غير مدرج" (Unlisted)</span> تتحدث فيه عن <span className="theme-text-primary">Over Mods</span> ثم ضع الرابط هنا.
                </p>
             </div>

             <form onSubmit={handleStep3Submit} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">رابط الفيديو (Unlisted Video URL)</label>
                   <input 
                    type="url" value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 px-6 text-white font-black text-sm ltr outline-none focus:theme-border-primary shadow-inner" 
                    placeholder="https://youtu.be/..." required
                   />
                </div>

                {error && <div className="text-red-500 text-[10px] font-black mr-2">⚠️ {error}</div>}

                <div className="flex flex-col gap-3 pt-4">
                   <button type="submit" className="w-full py-6 theme-bg-primary text-black rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl">إرسال للمراجعة <CheckCircle size={22} className="inline-block mr-2" /></button>
                   <div className="flex gap-2">
                      <button type="button" onClick={() => setStep(2)} className="flex-1 py-4 bg-zinc-900 text-zinc-500 rounded-2xl font-black text-xs hover:text-white">رجوع</button>
                      <button type="button" onClick={handleSkipVideo} className="flex-1 py-4 bg-zinc-900/50 text-zinc-600 rounded-2xl font-black text-xs hover:text-red-500">سأقوم بذلك لاحقاً</button>
                   </div>
                </div>
             </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorVerification;
