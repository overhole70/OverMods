
import React, { useState, useEffect } from 'react';
import { User, Contest } from '../types';
import { db } from '../db';
import { Trophy, ArrowRight, Plus, Loader2, Users, Gift, CheckCircle, Clock, Calendar, Check } from 'lucide-react';

interface ContestsViewProps {
  currentUser: User;
  onBack: () => void;
}

const OWNER_EMAIL = 'overmods1@gmail.com';

const ContestsView: React.FC<ContestsViewProps> = ({ currentUser, onBack }) => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Owner Controls
  const isOwner = currentUser.email === OWNER_EMAIL;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newReward, setNewReward] = useState('');
  const [newWinnersCount, setNewWinnersCount] = useState('');

  useEffect(() => {
    loadContests();
  }, []);

  const loadContests = async () => {
    setLoading(true);
    try {
      const data = await db.getContests();
      setContests(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc || !newReward || !newWinnersCount) return;
    
    setIsProcessing(true);
    try {
      await db.createContest({
        title: newTitle,
        description: newDesc,
        rewardPoints: parseInt(newReward),
        numberOfWinners: parseInt(newWinnersCount)
      });
      setShowCreateForm(false);
      setNewTitle('');
      setNewDesc('');
      setNewReward('');
      setNewWinnersCount('');
      loadContests();
    } catch (err) {
      alert('فشل إنشاء المسابقة');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoin = async (contest: Contest) => {
    if (contest.participants.includes(currentUser.id)) return;
    setIsProcessing(true);
    try {
      await db.joinContest(contest.id, currentUser.id);
      loadContests();
    } catch (err) {
      alert('فشل الانضمام');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndContest = async (contestId: string) => {
    if (!confirm('هل أنت متأكد من إنهاء المسابقة واختيار الفائزين؟')) return;
    setIsProcessing(true);
    try {
      await db.endContest(contestId);
      loadContests();
    } catch (err) {
      alert('فشل إنهاء المسابقة');
    } finally {
      setIsProcessing(false);
    }
  };

  const activeContests = contests.filter(c => c.status === 'active');
  const pastContests = contests.filter(c => c.status === 'ended');

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32 px-4 sm:px-0">
      <div className="flex items-center justify-between">
         <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all font-black group">
           <ArrowRight size={20} className="rotate-180 group-hover:-translate-x-1" />
           <span>العودة</span>
         </button>
         
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 text-yellow-500 rounded-xl flex items-center justify-center border border-yellow-500/20">
               <Trophy size={20} />
            </div>
            <h2 className="text-xl font-black text-white">المسابقات</h2>
         </div>
      </div>

      {/* Owner Controls */}
      {isOwner && (
        <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2.5rem]">
           <button 
             onClick={() => setShowCreateForm(!showCreateForm)}
             className="w-full py-4 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-white font-black hover:border-lime-500 transition-all"
           >
             <Plus size={20} /> {showCreateForm ? 'إلغاء' : 'إنشاء مسابقة جديدة'}
           </button>

           {showCreateForm && (
             <form onSubmit={handleCreateContest} className="mt-6 space-y-4 animate-in slide-in-from-top-4">
                <input type="text" placeholder="عنوان المسابقة" value={newTitle} onChange={e=>setNewTitle(e.target.value)} className="w-full bg-zinc-950 border border-white/5 p-4 rounded-xl text-white font-bold outline-none focus:border-lime-500" required />
                <textarea placeholder="وصف المسابقة والشروط" value={newDesc} onChange={e=>setNewDesc(e.target.value)} className="w-full bg-zinc-950 border border-white/5 p-4 rounded-xl text-white font-medium outline-none focus:border-lime-500" rows={3} required />
                <div className="grid grid-cols-2 gap-4">
                   <input type="number" placeholder="قيمة الجائزة (نقاط)" value={newReward} onChange={e=>setNewReward(e.target.value)} className="w-full bg-zinc-950 border border-white/5 p-4 rounded-xl text-white font-bold outline-none focus:border-lime-500" required />
                   <input type="number" placeholder="عدد الفائزين" value={newWinnersCount} onChange={e=>setNewWinnersCount(e.target.value)} className="w-full bg-zinc-950 border border-white/5 p-4 rounded-xl text-white font-bold outline-none focus:border-lime-500" required />
                </div>
                <button type="submit" disabled={isProcessing} className="w-full py-4 bg-lime-500 text-black font-black rounded-xl hover:bg-lime-400 transition-all">نشر المسابقة</button>
             </form>
           )}
        </div>
      )}

      {/* Active Contests */}
      <div className="space-y-6">
         <h3 className="text-lg font-black text-white px-2">المسابقات النشطة</h3>
         {activeContests.length > 0 ? (
           activeContests.map(contest => (
             <div key={contest.id} className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-l from-yellow-500 to-transparent"></div>
                
                <div className="flex flex-col md:flex-row gap-8">
                   <div className="flex-1 space-y-4">
                      <h3 className="text-2xl font-black text-white">{contest.title}</h3>
                      <p className="text-zinc-400 font-medium leading-relaxed">{contest.description}</p>
                      
                      <div className="flex flex-wrap gap-4 mt-4">
                         <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-xl font-black text-xs border border-yellow-500/20">
                            <Gift size={16} /> {contest.rewardPoints} نقطة للفائز
                         </div>
                         <div className="flex items-center gap-2 text-zinc-400 bg-zinc-950 px-4 py-2 rounded-xl font-black text-xs border border-white/5">
                            <Users size={16} /> {contest.numberOfWinners} فائزين
                         </div>
                         <div className="flex items-center gap-2 text-zinc-400 bg-zinc-950 px-4 py-2 rounded-xl font-black text-xs border border-white/5">
                            <Clock size={16} /> {new Date(contest.createdAt).toLocaleDateString('ar-EG')}
                         </div>
                      </div>
                   </div>

                   <div className="flex flex-col justify-center gap-3 md:w-48">
                      {isOwner ? (
                        <button 
                          onClick={() => handleEndContest(contest.id)} 
                          disabled={isProcessing}
                          className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-lg"
                        >
                           {isProcessing ? <Loader2 className="animate-spin mx-auto"/> : 'إنهاء وتوزيع الجوائز'}
                        </button>
                      ) : (
                        contest.participants.includes(currentUser.id) ? (
                          <div className="w-full py-4 bg-zinc-800 text-zinc-500 rounded-2xl font-black text-sm flex items-center justify-center gap-2 cursor-default border border-white/5">
                             <CheckCircle size={18} /> تم الاشتراك
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleJoin(contest)} 
                            disabled={isProcessing}
                            className="w-full py-4 bg-yellow-500 text-black rounded-2xl font-black text-sm hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-900/20"
                          >
                             {isProcessing ? <Loader2 className="animate-spin mx-auto"/> : 'المشاركة في المسابقة'}
                          </button>
                        )
                      )}
                      <p className="text-center text-[10px] text-zinc-600 font-bold">{contest.participants.length} مشترك حتى الآن</p>
                   </div>
                </div>
             </div>
           ))
         ) : (
           <div className="py-20 text-center border-2 border-dashed border-zinc-900 rounded-[3rem]">
              <p className="text-zinc-600 font-black">لا توجد مسابقات حالياً</p>
           </div>
         )}
      </div>

      {/* Past Contests */}
      {pastContests.length > 0 && (
        <div className="space-y-6 pt-8 border-t border-white/5">
           <h3 className="text-lg font-black text-zinc-500 px-2">مسابقات منتهية</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastContests.map(contest => (
                <div key={contest.id} className="bg-zinc-900/30 border border-white/5 p-6 rounded-[2.5rem] opacity-75 hover:opacity-100 transition-opacity">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                         <h4 className="text-white font-black">{contest.title}</h4>
                         <span className="text-[10px] text-zinc-500">{new Date(contest.createdAt).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <span className="bg-zinc-950 text-zinc-600 px-3 py-1 rounded-lg text-[9px] font-black">منتهية</span>
                   </div>
                   
                   {contest.winners && contest.winners.length > 0 ? (
                     <div className="bg-zinc-950/50 rounded-2xl p-4 border border-white/5">
                        <p className="text-[9px] text-yellow-500 font-black mb-3 uppercase tracking-widest">الفائزين</p>
                        <div className="flex -space-x-2 space-x-reverse">
                           {contest.winners.map(w => (
                             <img key={w.userId} src={w.avatar} className="w-8 h-8 rounded-full border-2 border-black" title={w.displayName} />
                           ))}
                           {contest.winners.length > 5 && (
                             <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-black flex items-center justify-center text-[8px] text-white font-bold">+{contest.winners.length - 5}</div>
                           )}
                        </div>
                     </div>
                   ) : (
                     <p className="text-[10px] text-zinc-600">لم يتم اختيار فائزين</p>
                   )}
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default ContestsView;
