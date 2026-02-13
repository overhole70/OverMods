
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Download, ShieldCheck, Loader2, CheckCircle, Edit, MessageSquare, Send, User as UserIcon, Flag, Star, Clock, X, Info, Sparkles, LayoutGrid, Copy, Share2, Trash2, Youtube, ThumbsUp, ThumbsDown, Calendar, FileText, Database, Layers, AlertTriangle, Play, Eye, Zap, Tag, Monitor, HardDrive, UserPlus, UserMinus, Hash, ImageIcon, Lock, CheckCircle2, TrendingUp } from 'lucide-react';
import { Mod, User, Comment } from '../types';
import { db } from '../db';
import { useTranslation } from '../LanguageContext';

interface ModDetailsProps {
  mod: Mod;
  allMods: Mod[];
  currentUser: User | null;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: (reason?: string) => void;
  onBack: () => void;
  onModClick: (m: Mod) => void;
  onPublisherClick: (publisherId: string) => void;
  isFollowing: boolean;
  onFollow: () => void;
  isOnline: boolean;
  isAdmin?: boolean;
}

const OWNER_EMAIL = 'overmods1@gmail.com';

const ModDetails: React.FC<ModDetailsProps> = ({ mod, allMods, currentUser, onDownload, onEdit, onDelete, onBack, onModClick, onPublisherClick, isFollowing: initialIsFollowing, onFollow, isOnline, isAdmin }) => {
  const { t, isRTL } = useTranslation();
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>(mod.comments || []);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isFollowProcessing, setIsFollowProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adminDeleteReason, setAdminDeleteReason] = useState('');
  const [copyCodeFeedback, setCopyCodeFeedback] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const [publisherIsVerified, setPublisherIsVerified] = useState<boolean>(mod.isVerified || false);
  
  const [userRating, setUserRating] = useState<number>(mod.ratedBy?.[currentUser?.id || ''] || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isRatingProcessing, setIsRatingProcessing] = useState(false);

  // Admin Fake Stats Logic
  const isOwner = currentUser?.email === OWNER_EMAIL;
  const [showFakeStatsModal, setShowFakeStatsModal] = useState(false);
  const [fakeViews, setFakeViews] = useState(mod.fakeStats?.views || 0);
  const [fakeDownloads, setFakeDownloads] = useState(mod.fakeStats?.downloads || 0);
  const [fakeLikes, setFakeLikes] = useState(mod.fakeStats?.likes || 0);

  // Stats Display
  const displayViews = (mod.stats.uniqueViews || 0) + (mod.fakeStats?.views || 0);
  const displayDownloads = (mod.stats.downloads || 0) + (mod.fakeStats?.downloads || 0);
  const displayLikes = (mod.stats.likes || 0) + (mod.fakeStats?.likes || 0);

  const [votes, setVotes] = useState({ 
    likes: displayLikes, 
    dislikes: mod.stats.dislikes || 0,
    hasLiked: mod.likedBy?.includes(currentUser?.id || ''),
    hasDisliked: mod.dislikedBy?.includes(currentUser?.id || '')
  });

  // Purchase States
  const [isPurchased, setIsPurchased] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    setLocalComments(mod.comments || []);
    setIsFollowing(initialIsFollowing);
    setUserRating(mod.ratedBy?.[currentUser?.id || ''] || 0);
    window.scrollTo(0, 0);

    // Fix: Fetch publisher's current verification status to handle bug where old mods show as unverified
    db.get('users', mod.publisherId).then((pub: any) => {
      if (pub) {
        setPublisherIsVerified(pub.isVerified || pub.email === OWNER_EMAIL);
      }
    });

    // Check Purchase Status
    if (currentUser && mod.price && mod.price > 0 && mod.publisherId !== currentUser.id) {
      db.hasPurchased(currentUser.id, mod.id).then(setIsPurchased);
    } else {
      setIsPurchased(true); // Free or Own Mod
    }

    let viewTimer: any = null;
    if (isOnline) {
      viewTimer = setTimeout(async () => {
        try {
          const userIP = await db.getUserIP();
          await db.incrementViews(mod.id, userIP);
        } catch (err) {
          console.error("View tracking process failed", err);
        }
      }, 4000);
    }
    return () => { if (viewTimer) clearTimeout(viewTimer); };
  }, [mod.id, isOnline, currentUser?.id, mod.publisherId, initialIsFollowing]);

  const handleVote = async (type: 'like' | 'dislike') => {
    if (!currentUser) return alert('يجب تسجيل الدخول للتفاعل');
    if (type === 'like') {
      const isRemoving = votes.hasLiked;
      setVotes(prev => ({
        ...prev,
        likes: prev.likes + (isRemoving ? -1 : 1),
        hasLiked: !isRemoving,
        dislikes: prev.hasDisliked ? prev.dislikes - 1 : prev.dislikes,
        hasDisliked: false
      }));
      await db.likeMod(mod.id, currentUser.id);
    } else {
      const isRemoving = votes.hasDisliked;
      setVotes(prev => ({
        ...prev,
        dislikes: prev.dislikes + (isRemoving ? -1 : 1),
        hasDisliked: !isRemoving,
        likes: prev.hasLiked ? prev.likes - 1 : prev.likes,
        hasLiked: false
      }));
      await db.dislikeMod(mod.id, currentUser.id);
    }
  };

  const handleRate = async (rating: number) => {
    if (!currentUser) return alert('يجب تسجيل الدخول للتقييم');
    if (isRatingProcessing) return;
    setIsRatingProcessing(true);
    try {
      await db.rateMod(mod.id, currentUser.id, rating);
      setUserRating(rating);
    } catch (err) {
      alert('فشل في حفظ التقييم');
    } finally {
      setIsRatingProcessing(false);
    }
  };

  const handleFollowClick = async () => {
    if (!currentUser || isFollowProcessing) return;
    setIsFollowProcessing(true);
    try {
      await onFollow();
      setIsFollowing(!isFollowing);
    } finally {
      setIsFollowProcessing(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !commentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    const newComment: Comment = {
      id: 'c_' + Date.now() + Math.random().toString(36).substr(2, 5),
      userId: currentUser.id,
      username: currentUser.displayName,
      userAvatar: currentUser.avatar,
      text: commentText.trim(),
      createdAt: new Date().toISOString()
    };
    try {
      await db.put('mods', { ...mod, comments: [...localComments, newComment] });
      setLocalComments([...localComments, newComment]);
      setCommentText('');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !reportReason.trim()) return;
    setIsReporting(true);
    try {
      await db.put('reports', {
        modId: mod.id,
        modTitle: mod.title,
        publisherId: mod.publisherId,
        reporterId: currentUser.id,
        reporterName: currentUser.displayName,
        reason: reportReason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setShowReportModal(false);
      setReportReason('');
      alert('تم إرسال البلاغ بنجاح');
    } catch (err) {
      alert('فشل إرسال البلاغ');
    } finally {
      setIsReporting(false);
    }
  };

  const copyShareCode = () => {
    if (mod.shareCode) {
      navigator.clipboard.writeText(mod.shareCode);
      setCopyCodeFeedback(true);
      setTimeout(() => setCopyCodeFeedback(false), 2000);
    }
  };

  const handleDownloadClick = async () => {
    if (!isPurchased && mod.price && mod.price > 0) {
      if (!currentUser) return alert('يجب تسجيل الدخول للشراء');
      setShowPurchaseModal(true);
      return;
    }

    if (isOnline) {
      try {
        const userIP = await db.getUserIP();
        await db.incrementDownloads(mod.id, userIP);
        if (currentUser) {
          await db.recordDownload(currentUser.id, mod);
        }
      } catch (err) {
        console.error("Download tracking failed", err);
      }
    }
    onDownload();
    window.open(mod.downloadUrl, '_blank');
  };

  const handleConfirmPurchase = async () => {
    if (!currentUser) return;
    setIsPurchasing(true);
    try {
      await db.purchaseMod(currentUser, mod);
      setIsPurchased(true);
      setShowPurchaseModal(false);
      alert('تم الشراء بنجاح! يمكنك الآن تحميل الإضافة.');
    } catch (err: any) {
      alert(err.message || 'فشل عملية الشراء');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSaveFakeStats = async () => {
    try {
        await db.updateModFakeStats(mod.id, {
            views: Number(fakeViews),
            downloads: Number(fakeDownloads),
            likes: Number(fakeLikes)
        });
        setShowFakeStatsModal(false);
        // Force refresh somehow or rely on realtime updates if listening? 
        // For now, local UI update requires parent refresh, but we can do an optimistic local state update if needed, 
        // but typically App.tsx handles refreshes.
        alert("Admin Stats Updated - Refresh to see changes.");
    } catch (e) {
        alert("Update failed");
    }
  };

  const handleResetFakeStats = async () => {
    try {
        await db.resetModFakeStats(mod.id);
        setShowFakeStatsModal(false);
        alert("Stats reset to genuine values.");
    } catch (e) {
        alert("Reset failed");
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-6">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all font-black group active:scale-95">
          <ArrowRight size={22} className={`${isRTL ? 'group-hover:translate-x-1' : 'rotate-180 group-hover:-translate-x-1'} transition-transform`} />
          <span className="text-base">{t('common.back')}</span>
        </button>
        
        <div className="flex gap-2">
          {isOwner && (
             <button onClick={() => setShowFakeStatsModal(true)} className="p-3.5 bg-red-900/20 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white rounded-2xl transition-all active:scale-90" title="Admin Stats Override">
                <TrendingUp size={20} />
             </button>
          )}
          <button onClick={() => setShowReportModal(true)} className="p-3.5 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl transition-all active:scale-90"><Flag size={20} /></button>
          {(currentUser?.id === mod.publisherId || isAdmin) && (
            <>
              <button onClick={onEdit} className="px-6 py-3.5 theme-bg-primary text-black rounded-2xl font-black text-xs transition-all active:scale-95">تعديل</button>
              <button onClick={() => setShowDeleteConfirm(true)} className="p-3.5 bg-zinc-900 text-zinc-600 hover:text-red-500 rounded-2xl transition-all active:scale-90 border border-white/5"><Trash2 size={20} /></button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-12">
          <div className="space-y-10">
            <div className="rounded-[4rem] overflow-hidden aspect-video bg-zinc-950 border border-white/5 shadow-2xl relative">
              <img src={mod.mainImage} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
                <span className="theme-bg-primary text-black px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap">Bedrock Edition</span>
                {mod.minecraftVersion && <span className="bg-zinc-900 text-zinc-400 border border-white/5 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap">MC {mod.minecraftVersion}</span>}
                <span className="bg-zinc-900 text-zinc-400 border border-white/5 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{t(`types.${mod.type}`)}</span>
                {mod.price && mod.price > 0 && (
                  <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                    {mod.price} Points
                  </span>
                )}
              </div>
              <h1 className="text-4xl sm:text-7xl font-black text-white leading-tight drop-shadow-2xl">{mod.title}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
             <div className="flex bg-zinc-900/50 border border-white/5 rounded-2xl p-1 backdrop-blur-xl">
                 <button onClick={() => handleVote('like')} className={`flex items-center gap-3 px-8 py-3.5 rounded-xl transition-all ${votes.hasLiked ? 'theme-bg-primary text-black' : 'text-zinc-500'}`}>
                    <ThumbsUp size={22} fill={votes.hasLiked ? "currentColor" : "none"} /> 
                    <span className="text-sm font-black">{formatNumber(displayLikes)}</span>
                 </button>
                 <div className="w-px bg-white/5 my-2 mx-1"></div>
                 <button onClick={() => handleVote('dislike')} className={`flex items-center gap-3 px-8 py-3.5 rounded-xl transition-all ${votes.hasDisliked ? 'bg-red-600 text-white' : 'text-zinc-500'}`}>
                    <ThumbsDown size={22} fill={votes.hasDisliked ? "currentColor" : "none"} /> 
                    <span className="text-sm font-black">{formatNumber(votes.dislikes)}</span>
                 </button>
             </div>
             <div className="flex items-center gap-4 bg-zinc-900/50 border border-white/5 px-6 py-4 rounded-2xl backdrop-blur-xl">
                <Star size={22} className="text-yellow-500 fill-yellow-500" />
                <span className="text-xl font-black text-white">{mod.stats.averageRating || '0.0'}</span>
                <span className="text-zinc-700 text-[10px] font-black uppercase tracking-widest">{mod.stats.ratingCount} تقييم</span>
             </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-black text-white px-2 flex items-center gap-3"><FileText className="theme-text-primary" /> الوصف الكامل</h3>
            <div className="text-zinc-400 leading-relaxed text-lg font-medium whitespace-pre-wrap px-2">{mod.description}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
             {[
               { icon: <Zap size={18} />, label: 'النوع', val: t(`types.${mod.type}`), color: 'theme-text-primary' },
               { icon: <HardDrive size={18} />, label: 'الحجم', val: mod.fileSize || '---', color: 'text-blue-500' },
               { icon: <Tag size={18} />, label: 'القسم', val: mod.category || '---', color: 'text-purple-500' },
               { icon: <Monitor size={18} />, label: 'الإصدار', val: mod.minecraftVersion || '---', color: 'text-orange-500' },
               { icon: <Eye size={18} />, label: 'المشاهدات', val: formatNumber(displayViews), color: 'text-cyan-500' },
               { icon: <Download size={18} />, label: 'التحميلات', val: formatNumber(displayDownloads), color: 'theme-text-primary' }
             ].map((s, i) => (
               <div key={i} className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 flex flex-col gap-2">
                  <div className={s.color}>{s.icon}</div>
                  <div>
                    <p className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">{s.label}</p>
                    <p className="text-white font-black text-sm">{s.val}</p>
                  </div>
               </div>
             ))}
          </div>

          <div className="space-y-10 pt-10">
             <h3 className="text-2xl font-black text-white px-2 flex items-center gap-3"><MessageSquare className="theme-text-primary" /> المجتمع والمناقشة</h3>
             {currentUser ? (
               <form onSubmit={handleAddComment} className="relative group">
                  <textarea value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="أضف تعليقك..." className="w-full bg-zinc-900/40 border border-white/5 rounded-3xl p-6 pr-6 pl-16 text-white text-base font-medium resize-none focus:theme-border-primary-alpha outline-none shadow-inner" rows={3} />
                  <button type="submit" disabled={isSubmittingComment || !commentText.trim()} className="absolute left-4 bottom-4 w-12 h-12 theme-bg-primary text-black rounded-2xl flex items-center justify-center disabled:opacity-30"><Send size={20} /></button>
               </form>
             ) : (
               <div className="p-8 bg-zinc-950/20 border border-dashed border-zinc-900 rounded-3xl text-center text-zinc-600 font-bold">يرجى تسجيل الدخول للتعليق</div>
             )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <div className="space-y-6 lg:sticky lg:top-28">
              <div className="bg-zinc-950/40 border border-white/5 rounded-[2.5rem] p-8 space-y-8 backdrop-blur-xl">
                 <div className="space-y-6 text-center">
                    <div className="flex justify-center gap-2">
                       {[1, 2, 3, 4, 5].map(s => (
                         <button key={s} onMouseEnter={()=>setHoverRating(s)} onMouseLeave={()=>setHoverRating(0)} onClick={()=>handleRate(s)} className="transition-transform active:scale-90">
                           <Star size={32} className={`${(hoverRating || userRating) >= s ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-800'}`} />
                         </button>
                       ))}
                    </div>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">{userRating > 0 ? `تقييمك: ${userRating} نجوم` : 'قيم هذا العمل'}</p>
                 </div>

                 <div className="space-y-4">
                    <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 flex items-center justify-between group">
                       <div>
                          <p className="text-zinc-600 text-[8px] font-black uppercase tracking-widest mb-1">رمز المشاركة</p>
                          <span className="theme-text-primary font-black text-lg ltr tracking-widest">{mod.shareCode}</span>
                       </div>
                       <button onClick={copyShareCode} className={`p-3 rounded-xl transition-all ${copyCodeFeedback ? 'theme-bg-primary text-black' : 'bg-zinc-950 text-zinc-600'}`}>
                          {copyCodeFeedback ? <CheckCircle size={18} /> : <Copy size={18} />}
                       </button>
                    </div>
                    
                    <button 
                      onClick={handleDownloadClick} 
                      className={`w-full py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all ${isPurchased ? 'theme-bg-primary hover:theme-bg-primary-hover text-black theme-shadow-primary' : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-900/20'}`}
                    >
                       {isPurchased ? <Download size={24} /> : <Lock size={24} />} 
                       {isPurchased ? 'تحميل الآن' : `شراء بـ ${mod.price} نقطة`}
                    </button>
                 </div>

                 <div className="pt-8 border-t border-white/5 space-y-6">
                    <div className="flex items-center gap-4">
                       <div onClick={()=>onPublisherClick(mod.publisherId)} className="w-14 h-14 rounded-2xl overflow-hidden cursor-pointer border-2 border-transparent hover:theme-border-primary transition-all">
                          <img src={mod.publisherAvatar} className="w-full h-full object-cover" />
                       </div>
                       <div className="text-right">
                          <h4 onClick={()=>onPublisherClick(mod.publisherId)} className="text-white font-black text-base cursor-pointer hover:theme-text-primary transition-colors flex items-center gap-2">
                             {mod.publisherName}
                             {publisherIsVerified && <ShieldCheck size={16} className="theme-text-primary" />}
                          </h4>
                          <p className="text-zinc-600 text-[9px] font-black uppercase tracking-widest">المبدع الناشر</p>
                       </div>
                    </div>
                    {currentUser?.id !== mod.publisherId && (
                      <button onClick={handleFollowClick} disabled={isFollowProcessing} className={`w-full py-4 rounded-2xl text-[11px] font-black transition-all ${isFollowing ? 'bg-zinc-900 text-zinc-500 border border-white/5 hover:text-red-500' : 'bg-white text-black hover:theme-bg-primary'}`}>
                         {isFollowProcessing ? <Loader2 className="animate-spin mx-auto" /> : (isFollowing ? 'إلغاء المتابعة' : 'متابعة المبدع')}
                      </button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowReportModal(false)}></div>
           <div className="bg-[#0f0f0f] border border-white/10 p-10 rounded-[4rem] w-full max-w-md relative z-10 shadow-2xl text-center animate-in zoom-in">
              <div className="w-20 h-20 bg-red-600/10 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-xl">
                <Flag size={40} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">إبلاغ عن محتوى</h3>
              <p className="text-zinc-500 font-medium text-sm mb-8">
                ساعدنا في الحفاظ على مجتمع آمن. يرجى توضيح سبب الإبلاغ بدقة.
              </p>
              
              <form onSubmit={handleSubmitReport} className="space-y-4">
                 <textarea
                   value={reportReason}
                   onChange={e => setReportReason(e.target.value)}
                   className="w-full bg-zinc-900/50 border border-white/5 rounded-3xl p-5 text-white text-sm outline-none focus:border-red-500/50 resize-none shadow-inner"
                   rows={4}
                   placeholder="اكتب سبب الإبلاغ هنا..."
                   required
                 />
                 
                 <div className="flex flex-col gap-3">
                    <button 
                     type="submit"
                     disabled={isReporting}
                     className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isReporting ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                      {isReporting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
                    </button>
                    <button type="button" onClick={() => setShowReportModal(false)} disabled={isReporting} className="w-full py-5 bg-zinc-900 text-zinc-500 rounded-2xl font-black text-lg hover:text-white transition-colors">إلغاء</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Enhanced Deletion Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowDeleteConfirm(false)}></div>
           <div className="bg-[#0f0f0f] border border-red-500/20 p-10 md:p-14 rounded-[4rem] w-full max-w-lg relative z-10 shadow-2xl text-center animate-in zoom-in">
              <div className="w-24 h-24 bg-red-600/10 text-red-500 rounded-[2.2rem] flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-xl">
                <AlertTriangle size={56} />
              </div>
              <h3 className="text-3xl font-black text-white mb-4">حذف المنشور نهائياً؟</h3>
              
              <div className="bg-red-600/5 p-6 rounded-3xl mb-10 text-right space-y-3">
                 <p className="text-red-500 font-black text-sm">⚠️ إجراء غير قابل للتراجع</p>
                 <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                    سيتم حذف <span className="text-white font-black">{mod.title}</span> وكافة البيانات المتعلقة به من تعليقات وإحصائيات بشكل نهائي من خوادمنا.
                 </p>
              </div>

              <div className="flex flex-col gap-4">
                 <button 
                  onClick={() => { onDelete(); setShowDeleteConfirm(false); }} 
                  className="w-full py-6 bg-red-600 text-white rounded-3xl font-black text-xl active:scale-95 transition-all shadow-xl shadow-red-900/20"
                 >
                   تأكيد الحذف النهائي
                 </button>
                 <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-6 bg-zinc-900 text-zinc-500 rounded-3xl font-black text-xl hover:text-white transition-colors">إلغاء</button>
              </div>
           </div>
        </div>
      )}

      {/* Purchase Confirmation Modal */}
      {showPurchaseModal && currentUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => !isPurchasing && setShowPurchaseModal(false)}></div>
           <div className="bg-[#0f0f0f] border border-white/10 p-10 rounded-[4rem] w-full max-w-md relative z-10 shadow-2xl text-center animate-in zoom-in">
              <div className="w-20 h-20 bg-yellow-500/10 text-yellow-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-yellow-500/20 shadow-xl">
                <Lock size={40} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">تأكيد الشراء</h3>
              <p className="text-zinc-500 font-medium text-sm mb-8">
                هل تريد شراء <span className="text-white font-bold">{mod.title}</span> مقابل <span className="text-yellow-500 font-black">{mod.price} نقطة</span>؟
              </p>
              
              <div className="bg-zinc-900/50 p-4 rounded-2xl mb-8 flex justify-between items-center border border-white/5">
                 <span className="text-zinc-500 text-xs font-bold">رصيدك الحالي</span>
                 <span className="text-white font-black text-sm">{(currentUser.wallet?.gift || 0) + (currentUser.wallet?.earned || 0)} PTS</span>
              </div>

              <div className="flex flex-col gap-3">
                 <button 
                  onClick={handleConfirmPurchase} 
                  disabled={isPurchasing}
                  className="w-full py-5 bg-yellow-500 text-black rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-yellow-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   {isPurchasing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                   {isPurchasing ? 'جاري الشراء...' : 'تأكيد ودفع النقاط'}
                 </button>
                 <button onClick={() => setShowPurchaseModal(false)} disabled={isPurchasing} className="w-full py-5 bg-zinc-900 text-zinc-500 rounded-2xl font-black text-lg hover:text-white transition-colors">إلغاء</button>
              </div>
           </div>
        </div>
      )}

      {/* Admin Stats Override Modal */}
      {showFakeStatsModal && isOwner && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/98 backdrop-blur-2xl" onClick={() => setShowFakeStatsModal(false)}></div>
           <div className="bg-[#0f0f0f] border border-red-900/30 p-10 rounded-[4rem] w-full max-w-md relative z-10 shadow-[0_0_100px_rgba(255,0,0,0.1)] text-center animate-in zoom-in">
              <div className="w-20 h-20 bg-red-900/20 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-xl">
                <TrendingUp size={40} />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">تعديل الإحصائيات (إداري)</h3>
              <p className="text-red-500/70 font-black text-[10px] uppercase tracking-widest mb-8">
                التغييرات تظهر للجميع. لا تؤثر على النقاط.
              </p>
              
              <div className="space-y-4 mb-8">
                 <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">زيادة المشاهدات</label>
                    <input 
                      type="number" 
                      value={fakeViews || ''} 
                      onChange={e => setFakeViews(Number(e.target.value))} 
                      placeholder="0"
                      className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-500/50 placeholder:text-white/20" 
                    />
                 </div>
                 <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">زيادة التحميلات</label>
                    <input 
                      type="number" 
                      value={fakeDownloads || ''} 
                      onChange={e => setFakeDownloads(Number(e.target.value))} 
                      placeholder="0"
                      className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-500/50 placeholder:text-white/20" 
                    />
                 </div>
                 <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">زيادة الإعجابات</label>
                    <input 
                      type="number" 
                      value={fakeLikes || ''} 
                      onChange={e => setFakeLikes(Number(e.target.value))} 
                      placeholder="0"
                      className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-red-500/50 placeholder:text-white/20" 
                    />
                 </div>
              </div>

              <div className="flex flex-col gap-3">
                 <button 
                  onClick={handleSaveFakeStats} 
                  className="w-full py-5 bg-red-900/80 text-white border border-red-500/30 rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl hover:bg-red-800"
                 >
                   حفظ التغييرات
                 </button>
                 <button onClick={handleResetFakeStats} className="w-full py-5 bg-red-900/30 text-red-400 border border-red-500/20 rounded-2xl font-black text-lg hover:bg-red-900/50 transition-colors">
                   إعادة للوضع الأصلي
                 </button>
                 <button onClick={() => setShowFakeStatsModal(false)} className="w-full py-5 bg-zinc-900 text-zinc-500 rounded-2xl font-black text-lg hover:text-white transition-colors">إلغاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ModDetails;
