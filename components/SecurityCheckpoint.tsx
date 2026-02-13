import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, LogOut, Loader2 } from 'lucide-react';
import { db } from '../db';
import { User } from '../types';

interface SecurityCheckpointProps {
  user: User;
  onSuccess: () => void;
  onLogout: () => void;
}

const SecurityCheckpoint: React.FC<SecurityCheckpointProps> = ({ user, onSuccess, onLogout }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setIsVerifying(true);
    
    // In a real implementation with hashing, verification would happen backend side or via secure compare
    // Since we are storing plain/simple for this demo context:
    if (code === user.securityCode) {
      try {
        await db.verifySecurityCheck(user.id);
        onSuccess();
      } catch (err) {
        setError('حدث خطأ في الاتصال');
      }
    } else {
      setError('الرمز الأمني غير صحيح');
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden animate-in zoom-in duration-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 blur-[100px] pointer-events-none"></div>
        
        <div className="text-center mb-10 relative z-10">
           <div className="w-20 h-20 bg-lime-500/10 text-lime-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-lime-500/20 shadow-lg">
              <ShieldCheck size={40} />
           </div>
           <h2 className="text-2xl font-black text-white mb-2">التحقق الأمني</h2>
           <p className="text-zinc-500 text-sm font-bold">
             يرجى إدخال رمز الأمان الإضافي للمتابعة
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
           <div className="relative">
              <Lock className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="password" 
                value={code}
                onChange={e => { setCode(e.target.value); setError(''); }}
                placeholder="أدخل الرمز هنا"
                className="w-full bg-zinc-950 border border-white/10 rounded-[2rem] py-5 pr-14 pl-6 text-white text-center font-black text-lg outline-none focus:border-lime-500 transition-all tracking-[0.5em]"
                autoFocus
              />
           </div>

           {error && (
             <div className="text-red-500 text-xs font-black text-center animate-in shake">
                {error}
             </div>
           )}

           <button 
             type="submit" 
             disabled={isVerifying || code.length < 8}
             className="w-full py-5 bg-lime-500 text-black rounded-[2rem] font-black text-lg shadow-xl shadow-lime-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
           >
              {isVerifying ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} className="rotate-180" />}
              {isVerifying ? 'جاري التحقق...' : 'تأكيد ودخول'}
           </button>
        </form>

        <div className="mt-8 text-center relative z-10">
           <button 
             onClick={onLogout}
             className="text-zinc-600 text-xs font-bold hover:text-white flex items-center justify-center gap-2 mx-auto transition-colors"
           >
              <LogOut size={14} /> تسجيل الخروج
           </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityCheckpoint;