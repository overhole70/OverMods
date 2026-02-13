
import React, { useState, useEffect } from 'react';
import { Wallet, Sparkles, Clock, Rocket, Zap, Heart, ShieldCheck, Coins, Send, AlertTriangle, CheckCircle2, Copy, Loader2, ArrowRight, ShoppingBag, Download, Trophy, Users, Search, Dice5 } from 'lucide-react';
import { db, auth } from '../db';
import { User, Mod } from '../types';
import ModCard from './ModCard';
import { useTranslation } from '../LanguageContext';

interface MonetizationViewProps {
  onNavigate: (view: any) => void;
}

const OWNER_EMAIL = 'overmods1@gmail.com';

const MonetizationView: React.FC<MonetizationViewProps> = ({ onNavigate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [recipientInput, setRecipientInput] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [tab, setTab] = useState<'balance' | 'transfer' | 'purchases'>('balance');
  const [purchasedMods, setPurchasedMods] = useState<Mod[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Owner Tool States
  const [showOwnerTool, setShowOwnerTool] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerUsersList, setOwnerUsersList] = useState<User[]>([]);
  const [ownerSelectedUser, setOwnerSelectedUser] = useState<User | null>(null);
  const [ownerAmount, setOwnerAmount] = useState('');
  const [isOwnerSending, setIsOwnerSending] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (auth.currentUser) {
        let u = await db.get('users', auth.currentUser.uid);
        // Ensure existing users get their wallet initialized (Retroactive Gift)
        if (u && !u.wallet) {
           await db.checkAndInitWallet(u.id);
           u = await db.get('users', auth.currentUser.uid);
        }
        if (u) setUser(u as User);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (tab === 'purchases' && user) {
      loadPurchases();
    }
  }, [tab, user]);

  useEffect(() => {
    if (showOwnerTool && user?.email === OWNER_EMAIL) {
      db.getAllUsers().then(users => setOwnerUsersList(users));
    }
  }, [showOwnerTool, user]);

  const loadPurchases = async () => {
    if (!user) return;
    setLoadingPurchases(true);
    try {
      const purchases = await db.getPurchasedMods(user.id);
      setPurchasedMods(purchases);
    } catch (e) {
      console.error("Failed to load purchases", e);
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !recipientInput) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
       setMessage({ type: 'error', text: 'يرجى إدخال مبلغ صحيح' });
       return;
    }
    
    setIsTransferring(true);
    setMessage(null);
    try {
      await db.transferPoints(user.id, recipientInput.trim(), val);
      setMessage({ type: 'success', text: `تم تحويل ${val} نقطة بنجاح!` });
      setAmount('');
      setRecipientInput('');
      
      // Refresh user data
      const u = await db.get('users', user.id);
      if (u) setUser(u as User);
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'فشل التحويل' });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleOwnerDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerSelectedUser || !ownerAmount) return;
    setIsOwnerSending(true);
    try {
      await db.adminDistributePoints(ownerSelectedUser.id, parseFloat(ownerAmount));
      alert(`تم إرسال ${ownerAmount} نقطة إلى ${ownerSelectedUser.displayName}`);
      setOwnerAmount('');
      setOwnerSelectedUser(null);
    } catch (err) {
      alert('فشل الإرسال');
    } finally {
      setIsOwnerSending(false);
    }
  };

  const selectRandomUser = () => {
    if (ownerUsersList.length > 0) {
      const random = ownerUsersList[Math.floor(Math.random() * ownerUsersList.length)];
      setOwnerSelectedUser(random);
    }
  };

  const copyId = () => {
    if (user?.numericId) {
      navigator.clipboard.writeText(user.numericId);
      alert('تم نسخ المعرف: ' + user.numericId);
    }
  };

  if (!user) return <div className="py-40 flex justify-center"><Loader2 className="animate-spin text-lime-500" /></div>;

  const totalPoints = (user.wallet?.gift || 0) + (user.wallet?.earned || 0);
  const isOwner = user.email === OWNER_EMAIL;

  const filteredOwnerList = ownerUsersList.filter(u => 
    u.displayName.toLowerCase().includes(ownerSearch.toLowerCase()) || 
    u.username.toLowerCase().includes(ownerSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto pb-32 animate-in fade-in slide-in-from-bottom-6 duration-700 px-4 sm:px-0">
      
      {/* Header Wallet Card */}
      <div className="bg-zinc-900/60 border border-white/5 p-8 md:p-12 rounded-[4rem] flex flex-col items-center text-center shadow-2xl relative overflow-hidden mb-8">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lime-500 to-transparent opacity-50"></div>
         <div className="absolute -top-24 -right-24 w-96 h-96 bg-lime-500/5 blur-[100px] pointer-events-none"></div>

         <div className="relative z-10 w-full">
            <div className="flex flex-wrap items-center justify-between mb-8 px-4 gap-4">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-lime-500/10 text-lime-500 rounded-2xl flex items-center justify-center border border-lime-500/20">
                     <Coins size={24} />
                  </div>
                  <div className="text-right">
                     <h2 className="text-white font-black text-lg">النقاط</h2>
                     <p className="text-zinc-500 text-xs font-bold">Over Mods Points</p>
                  </div>
               </div>
               <div className="flex gap-2 flex-wrap justify-center">
                 <button onClick={() => setTab('balance')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${tab === 'balance' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                    الرصيد
                 </button>
                 <button onClick={() => setTab('transfer')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${tab === 'transfer' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                    تحويل
                 </button>
                 <button onClick={() => setTab('purchases')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${tab === 'purchases' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                    المشتريات
                 </button>
                 <button onClick={() => onNavigate('contests')} className="px-4 py-2 bg-yellow-500 text-black rounded-xl text-[10px] font-black hover:bg-yellow-400 transition-all flex items-center gap-2">
                    <Trophy size={14} /> المسابقات
                 </button>
               </div>
            </div>

            {tab === 'balance' && (
              <div className="animate-in zoom-in duration-300">
                <div className="mb-10">
                   <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-2">
                      {totalPoints.toFixed(1)} <span className="text-2xl md:text-3xl text-lime-500">PTS</span>
                   </h1>
                   <p className="text-zinc-500 font-medium">الرصيد الكلي</p>
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-8 max-w-lg mx-auto">
                   <div className="bg-zinc-950/50 p-6 rounded-3xl border border-white/5">
                      <div className="flex items-center justify-center gap-2 mb-2 text-zinc-400">
                         <ShieldCheck size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">نقاط الهدايا</span>
                      </div>
                      <p className="text-2xl font-black text-white">{(user.wallet?.gift || 0).toFixed(0)}</p>
                      <p className="text-[9px] text-zinc-600 mt-2 font-bold">غير قابلة للتحويل</p>
                   </div>
                   
                   <div className="bg-lime-500/5 p-6 rounded-3xl border border-lime-500/10">
                      <div className="flex items-center justify-center gap-2 mb-2 text-lime-500">
                         <Zap size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">نقاط المشاهدات</span>
                      </div>
                      <p className="text-2xl font-black text-white">{(user.wallet?.earned || 0).toFixed(1)}</p>
                      <p className="text-[9px] text-lime-500/60 mt-2 font-bold">قابلة للتحويل</p>
                   </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
                   <p className="text-zinc-500 text-xs font-medium">معرفك الخاص للاستلام</p>
                   <div onClick={copyId} className="flex items-center gap-3 bg-zinc-950 px-6 py-3 rounded-2xl border border-white/10 cursor-pointer hover:border-lime-500/50 transition-all group">
                      <span className="font-black text-lg text-white tracking-widest">{user.numericId}</span>
                      <Copy size={16} className="text-zinc-600 group-hover:text-lime-500" />
                   </div>
                </div>
              </div>
            )}
            
            {tab === 'transfer' && (
              <div className="max-w-md mx-auto animate-in slide-in-from-right duration-300">
                 <h3 className="text-2xl font-black text-white mb-6">تحويل النقاط</h3>
                 
                 <form onSubmit={handleTransfer} className="space-y-6 text-right">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mr-2">معرف المستلم (10 أرقام)</label>
                       <div className="relative">
                          <input 
                            type="text" 
                            value={recipientInput}
                            onChange={e => setRecipientInput(e.target.value)}
                            className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-5 px-6 text-white font-black text-sm outline-none focus:border-lime-500 transition-all text-center tracking-widest"
                            placeholder="XXXXXXXXXX"
                            required
                          />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mr-2">المبلغ المراد تحويله</label>
                       <div className="relative">
                          <input 
                            type="number" 
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full bg-zinc-950 border border-white/10 rounded-2xl py-5 px-6 text-white font-black text-sm outline-none focus:border-lime-500 transition-all text-center"
                            placeholder="0.00"
                            min="0.1"
                            step="0.1"
                            required
                          />
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lime-500 font-black text-xs">PTS</span>
                       </div>
                       <p className="text-[10px] text-zinc-600 mr-2 font-bold">
                          الرصيد المتاح للتحويل: <span className="text-white">{(user.wallet?.earned || 0).toFixed(1)}</span>
                       </p>
                    </div>

                    {message && (
                      <div className={`p-4 rounded-2xl text-xs font-black flex items-center gap-3 ${message.type === 'success' ? 'bg-lime-500/10 text-lime-500 border border-lime-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                         {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                         {message.text}
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={isTransferring}
                      className="w-full py-5 bg-lime-500 text-black rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-lime-900/20 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                       {isTransferring ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                       {isTransferring ? 'جاري التحويل...' : 'تأكيد الإرسال'}
                    </button>
                 </form>
              </div>
            )}

            {tab === 'purchases' && (
              <div className="animate-in slide-in-from-right duration-300 w-full text-right">
                 <h3 className="text-2xl font-black text-white mb-6 text-center">مشترياتك</h3>
                 {loadingPurchases ? (
                   <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-lime-500" /></div>
                 ) : purchasedMods.length > 0 ? (
                   <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto no-scrollbar">
                      {purchasedMods.map(mod => (
                        <div key={mod.id} onClick={() => window.open(mod.downloadUrl, '_blank')} className="bg-zinc-950/50 p-4 rounded-3xl border border-white/5 flex items-center gap-4 cursor-pointer hover:border-lime-500/50 transition-all">
                           <img src={mod.mainImage} className="w-16 h-16 rounded-2xl object-cover" />
                           <div className="flex-1">
                              <h4 className="text-white font-black text-sm">{mod.title}</h4>
                              <p className="text-zinc-500 text-[10px] mt-1">{new Date(mod.createdAt).toLocaleDateString('ar-EG')}</p>
                           </div>
                           <div className="text-lime-500 p-3 bg-lime-500/10 rounded-xl">
                              <Download size={20} />
                           </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="py-20 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-zinc-950 rounded-2xl flex items-center justify-center mb-4 text-zinc-700">
                         <ShoppingBag size={32} />
                      </div>
                      <p className="text-zinc-500 font-bold text-sm">لم تقم بشراء أي إضافات بعد</p>
                   </div>
                 )}
              </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { icon: <Zap size={20} />, title: 'كيف أجمع النقاط؟', desc: 'تحصل على 0.1 نقطة مقابل كل مشاهدة فريدة لإبداعاتك (1000 مشاهدة = 100 نقطة).', color: 'text-yellow-500' },
           { icon: <ShieldCheck size={20} />, title: 'حماية الاحتيال', desc: 'نظام ذكي يمنع احتساب المشاهدات المكررة أو الوهمية لضمان العدالة.', color: 'text-blue-500' },
           { icon: <Coins size={20} />, title: 'نقاط الهدايا', desc: 'يحصل كل مستخدم جديد حقيقي على 10 نقاط هدية غير قابلة للتحويل.', color: 'text-purple-500' }
         ].map((item, i) => (
           <div key={i} className="bg-zinc-900/30 border border-white/5 p-6 rounded-[2.5rem] flex flex-col gap-4">
              <div className={`w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center border border-white/5 shadow-lg ${item.color}`}>
                 {item.icon}
              </div>
              <div>
                 <h4 className="text-white font-black text-sm mb-1">{item.title}</h4>
                 <p className="text-zinc-500 text-xs leading-relaxed font-medium">{item.desc}</p>
              </div>
           </div>
         ))}
      </div>

      {/* Owner-Only Points Distribution Tool */}
      {isOwner && (
        <div className="mt-12">
           <button 
             onClick={() => setShowOwnerTool(!showOwnerTool)} 
             className="mx-auto block text-zinc-700 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
           >
             أداة المالك (سري)
           </button>

           {showOwnerTool && (
             <div className="mt-6 bg-zinc-950 border border-white/10 p-8 rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-4">
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                   <Coins className="text-yellow-500" /> توزيع نقاط مباشر
                </h3>
                
                <div className="space-y-6">
                   <div className="flex gap-4">
                      <div className="relative flex-1">
                         <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                         <input 
                           type="text" 
                           placeholder="بحث عن مستخدم..." 
                           value={ownerSearch}
                           onChange={e => setOwnerSearch(e.target.value)}
                           className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pr-12 pl-4 text-white text-sm outline-none focus:border-yellow-500" 
                         />
                      </div>
                      <button onClick={selectRandomUser} className="px-4 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all" title="اختيار عشوائي">
                         <Dice5 size={20} />
                      </button>
                   </div>

                   {ownerSelectedUser && (
                     <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl flex items-center gap-4">
                        <img src={ownerSelectedUser.avatar} className="w-10 h-10 rounded-xl object-cover" />
                        <div>
                           <p className="text-white font-black text-sm">{ownerSelectedUser.displayName}</p>
                           <p className="text-zinc-500 text-xs">@{ownerSelectedUser.username}</p>
                        </div>
                        <button onClick={() => setOwnerSelectedUser(null)} className="mr-auto text-zinc-500 hover:text-white"><ArrowRight size={16}/></button>
                     </div>
                   )}

                   {!ownerSelectedUser && ownerSearch && (
                     <div className="max-h-40 overflow-y-auto bg-zinc-900 rounded-2xl p-2 space-y-1">
                        {filteredOwnerList.slice(0, 5).map(u => (
                          <button key={u.id} onClick={() => setOwnerSelectedUser(u)} className="w-full flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-xl transition-all">
                             <img src={u.avatar} className="w-8 h-8 rounded-lg object-cover" />
                             <span className="text-xs text-white">{u.displayName}</span>
                          </button>
                        ))}
                     </div>
                   )}

                   <div className="flex gap-4">
                      <input 
                        type="number" 
                        placeholder="الكمية" 
                        value={ownerAmount}
                        onChange={e => setOwnerAmount(e.target.value)}
                        className="flex-1 bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white text-center font-black outline-none focus:border-yellow-500" 
                      />
                      <button 
                        onClick={handleOwnerDistribute}
                        disabled={isOwnerSending || !ownerSelectedUser}
                        className="flex-1 bg-yellow-500 text-black rounded-2xl font-black hover:bg-yellow-400 transition-all disabled:opacity-50"
                      >
                         {isOwnerSending ? <Loader2 className="animate-spin mx-auto"/> : 'إرسال'}
                      </button>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}

    </div>
  );
};

export default MonetizationView;
