
import React, { useState, useEffect, useRef } from 'react';
import { User, Question, QuestionProgress, QuestionChallenge } from '../types';
import { db, firestore } from '../db';
import { doc, onSnapshot } from 'firebase/firestore';
import { QUESTION_BANK } from './constants';
import { BrainCircuit, Trophy, CheckCircle, XCircle, Clock, Play, ArrowRight, Swords, Users, Loader2, Lock, Star } from 'lucide-react';

interface QuestionsViewProps {
  currentUser: User;
  onBack: () => void;
  activeChallengeId?: string;
}

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Very Hard', 'Impossible'] as const;

const QuestionsView: React.FC<QuestionsViewProps> = ({ currentUser, onBack, activeChallengeId }) => {
  const [mode, setMode] = useState<'solo' | 'challenge'>(activeChallengeId ? 'challenge' : 'solo');
  const [soloDifficulty, setSoloDifficulty] = useState<string>('Easy');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [progress, setProgress] = useState<QuestionProgress>(currentUser.questionProgress || {
    currentDifficulty: 'Easy',
    questionsAnswered: 0,
    correctAnswers: 0,
    history: []
  });

  // Challenge States
  const [challengeStep, setChallengeStep] = useState<'setup' | 'lobby' | 'game' | 'result'>('setup');
  const [challengeData, setChallengeData] = useState<QuestionChallenge | null>(null);
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<User | null>(null);
  const [challengeConfig, setChallengeConfig] = useState<{ diff: string; count: number }>({ diff: 'Easy', count: 10 });
  const [challengeScore, setChallengeScore] = useState({ correct: 0, wrong: 0 });
  const [challengeQuestions, setChallengeQuestions] = useState<Question[]>([]);

  // Fix: Use 'any' instead of NodeJS.Timeout to avoid namespace errors in browser environment
  const timerRef = useRef<any>(null);

  // Load progress sync
  useEffect(() => {
    if (currentUser.questionProgress) setProgress(currentUser.questionProgress);
  }, [currentUser]);

  // Handle External Challenge Link
  useEffect(() => {
    if (activeChallengeId) {
      setMode('challenge');
      const unsub = onSnapshot(doc(firestore, 'question_challenges', activeChallengeId), (doc) => {
        if (doc.exists()) {
          const data = doc.data() as QuestionChallenge;
          setChallengeData(data);
          
          if (data.status === 'active' && challengeStep !== 'game' && challengeStep !== 'result') {
            startChallengeGame(data);
          } else if (data.status === 'finished') {
            setChallengeStep('result');
          } else if (data.status === 'pending' || data.status === 'accepted') {
            setChallengeStep('lobby');
          }
        }
      });
      return () => unsub();
    }
  }, [activeChallengeId]);

  // Load Friends for Challenge Setup
  useEffect(() => {
    if (mode === 'challenge' && challengeStep === 'setup') {
      db.getFriends(currentUser.id).then(async (ids) => {
        const users = await Promise.all(ids.map(id => db.get('users', id) as Promise<User>));
        setFriendsList(users.filter(u => !!u));
      });
    }
  }, [mode, challengeStep]);

  // --- Solo Logic ---

  const startSoloLevel = (diff: string) => {
    setSoloDifficulty(diff);
    // Find first unanswered question in this difficulty
    const allQuestions = QUESTION_BANK[diff];
    const answeredIds = progress.history;
    const nextQ = allQuestions.find(q => !answeredIds.includes(q.id));
    
    if (nextQ) {
      loadQuestion(nextQ);
    } else {
      alert('لقد أتممت جميع أسئلة هذا المستوى!');
    }
  };

  const loadQuestion = (q: Question) => {
    setCurrentQuestion(q);
    setTimeLeft(q.timeLimit);
    setIsAnswered(false);
    setSelectedOption(null);
    setIsCorrect(false);
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswered(true);
    // Auto-wrong if timeout
    handleSoloAnswer(-1); 
  };

  const handleSoloAnswer = (optionIndex: number) => {
    if (!currentQuestion || isAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    
    const correct = optionIndex === currentQuestion.correctIndex;
    setIsAnswered(true);
    setSelectedOption(optionIndex);
    setIsCorrect(correct);

    // Update Progress
    const newHistory = [...progress.history, currentQuestion.id];
    const newCorrect = progress.correctAnswers + (correct ? 1 : 0);
    const newTotal = progress.questionsAnswered + 1;
    
    // Check level up (every 100 questions total, effectively) - Simplistic logic:
    // If completed 100 in current diff, move next.
    const questionsInCurrentDiff = QUESTION_BANK[progress.currentDifficulty].length;
    const answeredInCurrent = newHistory.filter(id => id.startsWith(progress.currentDifficulty)).length;
    
    let nextDiff = progress.currentDifficulty;
    if (answeredInCurrent >= questionsInCurrentDiff) {
       const idx = DIFFICULTIES.indexOf(progress.currentDifficulty);
       if (idx < DIFFICULTIES.length - 1) nextDiff = DIFFICULTIES[idx + 1];
    }

    const newProgress: QuestionProgress = {
      ...progress,
      history: newHistory,
      correctAnswers: newCorrect,
      questionsAnswered: newTotal,
      currentDifficulty: nextDiff
    };

    setProgress(newProgress);
    db.saveQuestionProgress(currentUser.id, newProgress);

    // Auto next after 2s
    setTimeout(() => {
       startSoloLevel(soloDifficulty); // Reloads next avail
    }, 2000);
  };

  // --- Challenge Logic ---

  const handleCreateChallenge = async () => {
    if (!selectedOpponent) return;
    try {
      const id = await db.createQuestionChallenge(currentUser, selectedOpponent.id, challengeConfig.diff, challengeConfig.count);
      // Start listening
      // We manually set activeChallengeId logic locally to trigger effect or just push to state
      // Actually effect listens to activeChallengeId prop. We need to mount component with it or handle locally.
      // Let's reuse the effect logic by setting local listener
      const unsub = onSnapshot(doc(firestore, 'question_challenges', id), (doc) => {
         if (doc.exists()) setChallengeData(doc.data() as QuestionChallenge);
      });
      setChallengeStep('lobby');
    } catch (e) { alert('Failed to create challenge'); }
  };

  const startChallengeGame = (data: QuestionChallenge) => {
    setChallengeStep('game');
    // Load specific subset of questions deterministically based on seed or just slice
    // For simplicity, take first N questions of difficulty
    const qs = QUESTION_BANK[data.difficulty].slice(0, data.questionCount);
    setChallengeQuestions(qs);
    loadChallengeQuestion(qs[0]);
  };

  const loadChallengeQuestion = (q: Question) => {
    setCurrentQuestion(q);
    setTimeLeft(q.timeLimit);
    setIsAnswered(false);
    setSelectedOption(null);
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleChallengeAnswer(-1, true); // Timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleChallengeAnswer = async (index: number, timeout = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswered(true);
    setSelectedOption(index);
    
    const correct = !timeout && index === currentQuestion?.correctIndex;
    const newScore = { 
      correct: challengeScore.correct + (correct ? 1 : 0), 
      wrong: challengeScore.wrong + (!correct ? 1 : 0) 
    };
    setChallengeScore(newScore);

    // Determine finished
    const isFinished = currentQuestionIndex >= challengeQuestions.length - 1;
    
    if (challengeData) {
       await db.updateChallengeScore(challengeData.id, currentUser.id, newScore.correct, newScore.wrong, isFinished);
    }

    if (!isFinished) {
       setTimeout(() => {
         setCurrentQuestionIndex(prev => {
           const next = prev + 1;
           loadChallengeQuestion(challengeQuestions[next]);
           return next;
         });
       }, 1500);
    } else {
       setChallengeStep('result');
    }
  };

  const handleStartMatch = async () => {
    if (challengeData) {
       await db.acceptQuestionChallenge(challengeData.id); // Re-using accept to trigger active status if sender clicks start
    }
  };

  // --- Render ---

  return (
    <div className="max-w-4xl mx-auto pb-32 animate-in fade-in duration-500 px-4 sm:px-0">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
         <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all font-black group">
           <ArrowRight size={20} className="rotate-180 group-hover:-translate-x-1" />
           <span>العودة</span>
         </button>
         <div className="flex items-center gap-3 bg-zinc-900/50 px-4 py-2 rounded-2xl border border-white/5">
            <BrainCircuit size={20} className="text-lime-500" />
            <h2 className="text-lg font-black text-white">نظام الأسئلة</h2>
         </div>
      </div>

      {mode === 'solo' && !currentQuestion && (
        <div className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div onClick={() => setMode('challenge')} className="bg-gradient-to-br from-purple-900/20 to-zinc-900 border border-purple-500/20 p-8 rounded-[3rem] cursor-pointer hover:scale-[1.02] transition-all group">
                 <Swords size={48} className="text-purple-500 mb-6 group-hover:scale-110 transition-transform" />
                 <h3 className="text-2xl font-black text-white mb-2">تحدي لاعبين</h3>
                 <p className="text-zinc-500 text-sm font-bold">واجه أصدقائك في معركة ذكاء مباشرة</p>
              </div>
              
              <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-lime-500"></div>
                 <div className="flex justify-between items-start mb-6">
                    <div>
                       <h3 className="text-2xl font-black text-white">التقدم الشخصي</h3>
                       <p className="text-zinc-500 text-xs font-bold mt-1">المستوى الحالي: <span className="text-lime-500">{progress.currentDifficulty}</span></p>
                    </div>
                    <div className="text-center">
                       <span className="block text-2xl font-black text-white">{progress.correctAnswers}</span>
                       <span className="text-[10px] text-zinc-600 font-bold uppercase">إجابة صحيحة</span>
                    </div>
                 </div>
                 
                 <div className="space-y-3">
                    {DIFFICULTIES.map((diff) => {
                       const isLocked = DIFFICULTIES.indexOf(diff) > DIFFICULTIES.indexOf(progress.currentDifficulty);
                       return (
                         <button 
                           key={diff}
                           disabled={isLocked}
                           onClick={() => startSoloLevel(diff)}
                           className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${isLocked ? 'bg-zinc-950 border-transparent opacity-50 cursor-not-allowed' : 'bg-zinc-900/50 border-white/5 hover:border-lime-500 cursor-pointer'}`}
                         >
                            <span className="font-black text-sm text-white">{diff}</span>
                            {isLocked ? <Lock size={16} className="text-zinc-600"/> : <Play size={16} className="text-lime-500"/>}
                         </button>
                       );
                    })}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Solo Gameplay */}
      {mode === 'solo' && currentQuestion && (
        <div className="max-w-2xl mx-auto bg-zinc-900 border border-white/5 p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden animate-in zoom-in duration-300">
           {/* Timer Bar */}
           <div className="absolute top-0 left-0 h-2 bg-lime-500 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / currentQuestion.timeLimit) * 100}%` }}></div>
           
           <div className="text-center mb-10">
              <span className="inline-block px-4 py-1 rounded-full bg-zinc-950 text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-4 border border-white/5">{currentQuestion.difficulty} Question</span>
              <h3 className="text-2xl md:text-3xl font-black text-white leading-relaxed">{currentQuestion.text}</h3>
           </div>

           <div className="space-y-3">
              {currentQuestion.options.map((opt, idx) => {
                 let stateClass = 'bg-zinc-950 border-white/5 hover:border-lime-500';
                 if (isAnswered) {
                    if (idx === currentQuestion.correctIndex) stateClass = 'bg-lime-500 text-black border-lime-500';
                    else if (selectedOption === idx) stateClass = 'bg-red-600 text-white border-red-600';
                    else stateClass = 'bg-zinc-950 border-transparent opacity-50';
                 }
                 
                 return (
                   <button 
                     key={idx}
                     disabled={isAnswered}
                     onClick={() => handleSoloAnswer(idx)}
                     className={`w-full p-5 rounded-2xl border-2 font-black text-lg transition-all active:scale-95 ${stateClass}`}
                   >
                      {opt}
                   </button>
                 );
              })}
           </div>
           
           <div className="mt-8 flex justify-center">
              <div className="flex items-center gap-2 text-zinc-500 font-black text-xs">
                 <Clock size={16} /> {timeLeft}s remaining
              </div>
           </div>
        </div>
      )}

      {/* Challenge Setup */}
      {mode === 'challenge' && challengeStep === 'setup' && (
        <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] max-w-2xl mx-auto animate-in fade-in">
           <h3 className="text-2xl font-black text-white mb-6 text-center">إعداد التحدي</h3>
           
           <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mr-2">اختر الخصم</label>
                 <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {friendsList.map(f => (
                      <div 
                        key={f.id} 
                        onClick={() => setSelectedOpponent(f)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 cursor-pointer transition-all min-w-[100px] ${selectedOpponent?.id === f.id ? 'border-lime-500 bg-lime-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-white/20'}`}
                      >
                         <img src={f.avatar} className="w-12 h-12 rounded-2xl object-cover" />
                         <span className="text-xs font-black text-white truncate w-full text-center">{f.displayName}</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mr-2">الصعوبة</label>
                    <select 
                      value={challengeConfig.diff} 
                      onChange={e => setChallengeConfig({...challengeConfig, diff: e.target.value})}
                      className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-lime-500"
                    >
                       {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mr-2">عدد الأسئلة</label>
                    <select 
                      value={challengeConfig.count} 
                      onChange={e => setChallengeConfig({...challengeConfig, count: parseInt(e.target.value)})}
                      className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-lime-500"
                    >
                       <option value={5}>5 أسئلة</option>
                       <option value={10}>10 أسئلة</option>
                       <option value={20}>20 سؤال</option>
                    </select>
                 </div>
              </div>

              <button 
                onClick={handleCreateChallenge} 
                disabled={!selectedOpponent}
                className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 إرسال التحدي
              </button>
           </div>
        </div>
      )}

      {/* Lobby */}
      {mode === 'challenge' && challengeStep === 'lobby' && challengeData && (
        <div className="text-center py-20 space-y-8 animate-in zoom-in">
           <div className="flex justify-center items-center gap-8">
              <div className="relative">
                 <img src={challengeData.senderAvatar} className="w-24 h-24 rounded-[2rem] border-4 border-purple-500" />
                 <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900 px-3 py-1 rounded-full text-[10px] font-black text-white border border-white/10 whitespace-nowrap">{challengeData.senderName}</span>
              </div>
              <div className="text-2xl font-black text-zinc-700">VS</div>
              <div className="relative">
                 <img src={challengeData.receiverAvatar} className="w-24 h-24 rounded-[2rem] border-4 border-zinc-700" />
                 <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900 px-3 py-1 rounded-full text-[10px] font-black text-white border border-white/10 whitespace-nowrap">{challengeData.receiverName}</span>
              </div>
           </div>
           
           <div>
              <h3 className="text-3xl font-black text-white mb-2">بانتظار البدء...</h3>
              <p className="text-zinc-500 font-bold">{challengeData.status === 'accepted' ? 'الطرف الآخر جاهز!' : 'بانتظار قبول الطرف الآخر...'}</p>
           </div>

           {challengeData.senderId === currentUser.id && challengeData.status === 'accepted' && (
             <button onClick={handleStartMatch} className="px-10 py-4 bg-lime-500 text-black rounded-2xl font-black text-xl animate-pulse">
                ابدأ المعركة!
             </button>
           )}
           
           {challengeData.receiverId === currentUser.id && challengeData.status === 'pending' && (
             <button onClick={() => db.acceptQuestionChallenge(challengeData.id)} className="px-10 py-4 bg-purple-600 text-white rounded-2xl font-black text-xl">
                قبول التحدي
             </button>
           )}
        </div>
      )}

      {/* Challenge Gameplay - Reuses Solo UI mostly but with Challenge Logic hooks */}
      {mode === 'challenge' && challengeStep === 'game' && currentQuestion && (
         <div className="max-w-2xl mx-auto bg-zinc-900 border border-purple-500/20 p-8 md:p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden animate-in zoom-in duration-300">
            <div className="absolute top-0 left-0 h-2 bg-purple-500 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / currentQuestion.timeLimit) * 100}%` }}></div>
            <div className="text-center mb-10">
               <span className="inline-block px-4 py-1 rounded-full bg-purple-900/20 text-purple-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-purple-500/20">PvP Match</span>
               <h3 className="text-2xl md:text-3xl font-black text-white leading-relaxed">{currentQuestion.text}</h3>
            </div>
            <div className="space-y-3">
               {currentQuestion.options.map((opt, idx) => {
                  let stateClass = 'bg-zinc-950 border-white/5 hover:border-purple-500';
                  if (isAnswered) {
                     if (idx === currentQuestion.correctIndex) stateClass = 'bg-lime-500 text-black border-lime-500';
                     else if (selectedOption === idx) stateClass = 'bg-red-600 text-white border-red-600';
                     else stateClass = 'bg-zinc-950 border-transparent opacity-50';
                  }
                  return (
                    <button key={idx} disabled={isAnswered} onClick={() => handleChallengeAnswer(idx)} className={`w-full p-5 rounded-2xl border-2 font-black text-lg transition-all active:scale-95 ${stateClass}`}>{opt}</button>
                  );
               })}
            </div>
         </div>
      )}

      {/* Result Card - Single Card Layout */}
      {challengeStep === 'result' && challengeData && (
        <div className="max-w-2xl mx-auto pt-20 animate-in zoom-in duration-500">
           <div className="bg-[#0f0f0f] border border-white/10 p-10 rounded-[4rem] relative overflow-hidden shadow-2xl">
              {/* Background Accents */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/20 blur-[100px] pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-lime-600/20 blur-[100px] pointer-events-none"></div>

              <div className="text-center mb-12">
                 <Trophy size={48} className="text-yellow-500 mx-auto mb-4" />
                 <h2 className="text-3xl font-black text-white">نتائج التحدي</h2>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                 {/* Receiver (Left) */}
                 <div className="flex flex-col items-center gap-4 text-center flex-1">
                    <div className="relative">
                       <img src={challengeData.receiverAvatar} className="w-24 h-24 rounded-[2.5rem] border-4 border-zinc-800 shadow-xl" />
                       <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900 px-3 py-1 rounded-full border border-white/10 text-white text-xs font-black whitespace-nowrap">
                          {challengeData.receiverName}
                       </div>
                    </div>
                    <div className="mt-4 space-y-1">
                       <div className="flex items-center gap-2 text-lime-500 font-black text-sm bg-lime-500/10 px-3 py-1 rounded-lg">
                          <CheckCircle size={14} /> {challengeData.receiverScore.correct} صحيح
                       </div>
                       <div className="flex items-center gap-2 text-red-500 font-black text-sm bg-red-500/10 px-3 py-1 rounded-lg">
                          <XCircle size={14} /> {challengeData.receiverScore.wrong} خطأ
                       </div>
                    </div>
                 </div>

                 <div className="text-zinc-700 font-black text-4xl hidden md:block">VS</div>

                 {/* Sender (Right) */}
                 <div className="flex flex-col items-center gap-4 text-center flex-1">
                    <div className="relative">
                       <img src={challengeData.senderAvatar} className="w-24 h-24 rounded-[2.5rem] border-4 border-zinc-800 shadow-xl" />
                       <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900 px-3 py-1 rounded-full border border-white/10 text-white text-xs font-black whitespace-nowrap">
                          {challengeData.senderName}
                       </div>
                    </div>
                    <div className="mt-4 space-y-1">
                       <div className="flex items-center gap-2 text-lime-500 font-black text-sm bg-lime-500/10 px-3 py-1 rounded-lg">
                          <CheckCircle size={14} /> {challengeData.senderScore.correct} صحيح
                       </div>
                       <div className="flex items-center gap-2 text-red-500 font-black text-sm bg-red-500/10 px-3 py-1 rounded-lg">
                          <XCircle size={14} /> {challengeData.senderScore.wrong} خطأ
                       </div>
                    </div>
                 </div>
              </div>

              <div className="mt-12 text-center">
                 <button onClick={() => setMode('solo')} className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-black text-sm transition-all border border-white/5">
                    العودة للقائمة
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default QuestionsView;
