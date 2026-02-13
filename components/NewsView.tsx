
import React, { useState, useEffect, useRef } from 'react';
import { Newspaper, Calendar, User as UserIcon, ArrowRight, Loader2, Sparkles, Image as ImageIcon, LayoutGrid, Plus, Clock, MessageSquare, Send, Heart, Trash2, ShieldCheck, X, Search, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { NewsItem, User, CommunityPost, PostComment } from '../types';
import { db } from '../db';
import { useTranslation } from '../LanguageContext';

interface NewsViewProps {
  onBack: () => void;
  currentUser: User | null;
  onViewProfile?: (user: User) => void;
}

const OWNER_EMAIL = 'overmods1@gmail.com';

const NewsView: React.FC<NewsViewProps> = ({ onBack, currentUser, onViewProfile }) => {
  const { isRTL } = useTranslation();
  const [activeTab, setActiveTab] = useState<'news' | 'community'>('community');
  const isOwner = currentUser?.email === OWNER_EMAIL;
  
  // News State
  const [news, setNews] = useState<NewsItem[]>([]);
  
  // Community Posts State
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postDesc, setPostDesc] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [expiryDays, setExpiryDays] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Admin Fake Likes
  const [fakeLikesModalPost, setFakeLikesModalPost] = useState<CommunityPost | null>(null);
  const [fakeLikesInput, setFakeLikesInput] = useState(0);

  // Delete Confirmation State
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Comments State
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchTerm('');
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'news') {
        const data = await db.getAll('news');
        setNews((data as NewsItem[]) || []);
      } else if (activeTab === 'community') {
        const data = await db.getCommunityPosts();
        setPosts(data || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    if (!confirm('هل تريد حذف هذا الخبر؟')) return;
    try {
      await db.deleteNews(newsId);
      setNews(prev => prev.filter(item => item.id !== newsId));
    } catch (err) {
      alert("فشل حذف الخبر");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (postImages.length >= 3) return alert("الحد الأقصى 3 صور");
      const file = e.target.files[0];
      try {
        const resized = await db.resizeImage(file, 800, 800);
        setPostImages([...postImages, resized]);
      } catch (err) {
        alert("فشل رفع الصورة");
      }
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postDesc.trim() || !currentUser) return;
    
    setIsProcessing(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);
      
      await db.createCommunityPost({
        authorId: currentUser.id,
        authorName: currentUser.displayName,
        authorAvatar: currentUser.avatar,
        isVerified: currentUser.isVerified,
        title: postTitle,
        description: postDesc,
        images: postImages,
        expiresAt: expiresAt.toISOString()
      });
      
      setIsCreatingPost(false);
      setPostTitle('');
      setPostDesc('');
      setPostImages([]);
      loadData();
    } catch (err) {
      alert("حدث خطأ أثناء النشر");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    try {
      await db.deleteCommunityPost(postToDelete);
      setPosts(prev => prev.filter(p => p.id !== postToDelete));
      setPostToDelete(null);
    } catch (err) {
      alert("فشل الحذف");
    }
  };

  const handleLikePost = async (post: CommunityPost) => {
    if (!currentUser) return alert("يرجى تسجيل الدخول");
    const isLiked = post.likes.includes(currentUser.id);
    
    // Optimistic UI
    const updatedLikes = isLiked 
      ? post.likes.filter(id => id !== currentUser.id)
      : [...post.likes, currentUser.id];
      
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: updatedLikes } : p));
    await db.likeCommunityPost(post.id, currentUser.id);
  };

  const handleSaveFakeLikes = async () => {
    if (!fakeLikesModalPost) return;
    try {
        await db.updatePostFakeLikes(fakeLikesModalPost.id, fakeLikesInput);
        setPosts(prev => prev.map(p => p.id === fakeLikesModalPost.id ? {...p, fakeLikes: fakeLikesInput} : p));
        setFakeLikesModalPost(null);
    } catch (e) {
        alert("Failed to update");
    }
  };

  const handleResetFakeLikes = async () => {
    if (!fakeLikesModalPost) return;
    try {
        await db.resetPostFakeLikes(fakeLikesModalPost.id);
        setPosts(prev => prev.map(p => p.id === fakeLikesModalPost.id ? {...p, fakeLikes: undefined} : p));
        setFakeLikesModalPost(null);
        alert("Likes reset to genuine value.");
    } catch (e) {
        alert("Reset failed");
    }
  };

  const handleSendComment = async (postId: string) => {
    if (!commentText.trim() || !currentUser) return;
    setIsSendingComment(true);
    const newComment: PostComment = {
      id: `c_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: currentUser.avatar,
      text: commentText,
      createdAt: new Date().toISOString(),
      likes: []
    };

    try {
      await db.commentOnPost(postId, newComment);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, comments: [...(p.comments || []), newComment] };
        }
        return p;
      }));
      setCommentText('');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleDeleteComment = async (postId: string, comment: PostComment) => {
    if (!confirm("حذف التعليق؟")) return;
    try {
      await db.deletePostComment(postId, comment);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return { ...p, comments: p.comments.filter(c => c.id !== comment.id) };
        }
        return p;
      }));
    } catch(e) {}
  };

  const handleLikeComment = async (postId: string, commentId: string) => {
    if (!currentUser) return;
    
    // Optimistic Update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const updatedComments = p.comments.map(c => {
          if (c.id === commentId) {
            const hasLiked = c.likes?.includes(currentUser.id);
            const newLikes = hasLiked 
              ? c.likes.filter(id => id !== currentUser.id)
              : [...(c.likes || []), currentUser.id];
            return { ...c, likes: newLikes };
          }
          return c;
        });
        return { ...p, comments: updatedComments };
      }
      return p;
    }));

    await db.likePostComment(postId, commentId, currentUser.id);
  };

  const getDaysLeft = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? days : 0;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
  };

  const filteredPosts = posts.filter(p => {
    const s = searchTerm.toLowerCase();
    return p.title.toLowerCase().includes(s) || 
           p.description.toLowerCase().includes(s) || 
           p.authorName.toLowerCase().includes(s);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 px-4 sm:px-0">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-4 self-start md:self-center">
            <button onClick={onBack} className="p-3 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-500 hover:text-white transition-all active:scale-90">
               <ArrowRight className="rotate-180" size={20} />
            </button>
            <div>
               <h2 className="text-2xl font-black text-white">المركز الإعلامي</h2>
               <p className="text-zinc-600 text-xs font-bold">أخبار، مجتمع، وتواصل</p>
            </div>
         </div>

         <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('community')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'community' ? 'theme-bg-primary text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
               <LayoutGrid size={14} /> مجتمع اللاعبين
            </button>
            <button onClick={() => setActiveTab('news')} className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'news' ? 'theme-bg-primary text-black shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
               <Newspaper size={14} /> الأخبار الرسمية
            </button>
         </div>
      </div>

      {/* Search Bar (Shared) */}
      {activeTab === 'community' && (
        <div className="relative group animate-in slide-in-from-top-4">
           <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:theme-text-primary transition-colors" size={20} />
           <input 
             type="text" 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             placeholder="بحث في المنشورات..."
             className="w-full bg-zinc-900 border border-white/5 rounded-[2rem] py-5 pr-14 pl-6 text-white font-bold outline-none focus:theme-border-primary-alpha transition-all shadow-inner"
           />
        </div>
      )}

      {/* --- COMMUNITY TAB --- */}
      {activeTab === 'community' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-8">
           {/* Create Post Card */}
           {currentUser && (
             <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2.5rem] shadow-xl">
                {!isCreatingPost ? (
                  <div className="flex items-center gap-4 cursor-pointer" onClick={() => setIsCreatingPost(true)}>
                     <img src={currentUser.avatar} className="w-12 h-12 rounded-2xl object-cover" />
                     <div className="flex-1 bg-zinc-950/50 h-12 rounded-2xl flex items-center px-6 text-zinc-600 text-sm font-bold border border-white/5 hover:border-white/10 transition-all">
                        شارك إبداعك أو سؤالك مع المجتمع...
                     </div>
                     <button className="w-12 h-12 theme-bg-primary text-black rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all">
                        <Plus size={24} />
                     </button>
                  </div>
                ) : (
                  <form onSubmit={handleCreatePost} className="space-y-6 animate-in zoom-in duration-300">
                     <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-black">إنشاء منشور جديد</h4>
                        <button type="button" onClick={() => setIsCreatingPost(false)} className="p-2 bg-zinc-950 rounded-xl text-zinc-500 hover:text-white"><X size={18} /></button>
                     </div>
                     
                     <input 
                       type="text" 
                       placeholder="عنوان المنشور" 
                       value={postTitle}
                       onChange={e => setPostTitle(e.target.value)}
                       className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:theme-border-primary"
                       required
                     />
                     
                     <textarea 
                       placeholder="اكتب وصفاً أو سؤالاً..." 
                       value={postDesc}
                       onChange={e => setPostDesc(e.target.value)}
                       className="w-full bg-zinc-950 border border-white/5 rounded-3xl p-4 text-white font-medium text-sm outline-none focus:theme-border-primary resize-none"
                       rows={4}
                       required
                     />

                     <div className="flex items-center gap-4">
                        <div onClick={() => fileInputRef.current?.click()} className="w-20 h-20 bg-zinc-950 rounded-2xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-white/20 text-zinc-600 transition-all">
                           <ImageIcon size={20} />
                           <span className="text-[8px] font-black mt-1">صور</span>
                        </div>
                        <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                        
                        <div className="flex gap-2 overflow-x-auto">
                           {postImages.map((img, i) => (
                             <div key={i} className="w-20 h-20 relative rounded-2xl overflow-hidden group">
                                <img src={img} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setPostImages(postImages.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"><Trash2 size={16} /></button>
                             </div>
                           ))}
                        </div>
                     </div>

                     <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold bg-zinc-950 px-3 py-1.5 rounded-xl border border-white/5">
                           <Clock size={12} /> ينتهي بعد {expiryDays} أيام
                        </div>
                        <button type="submit" disabled={isProcessing} className="px-8 py-3 theme-bg-primary text-black rounded-xl font-black text-xs active:scale-95 transition-all shadow-lg flex items-center gap-2">
                           {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} نشر
                        </button>
                     </div>
                  </form>
                )}
             </div>
           )}

           {/* Posts List */}
           <div className="space-y-6">
              {filteredPosts.map(post => {
                const totalLikes = (post.likes?.length || 0) + (post.fakeLikes || 0);
                
                return (
                <div key={post.id} className="bg-zinc-900 border border-white/5 rounded-[3rem] p-6 md:p-8 shadow-xl hover:border-white/10 transition-all">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => onViewProfile && onViewProfile({ id: post.authorId } as User)}>
                         <img src={post.authorAvatar} className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
                         <div>
                            <h4 className="text-white font-black text-sm flex items-center gap-2">
                               {post.authorName} 
                               {post.isVerified && <ShieldCheck size={14} className="theme-text-primary" />}
                            </h4>
                            <p className="text-zinc-600 text-[10px] font-bold">{getDaysLeft(post.expiresAt)} أيام متبقية</p>
                         </div>
                      </div>
                      
                      <div className="flex gap-2">
                         {isOwner && (
                            <button 
                              onClick={() => { setFakeLikesModalPost(post); setFakeLikesInput(post.fakeLikes || 0); }}
                              className="p-2 bg-red-900/20 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                              title="تعديل اللايكات"
                            >
                               <TrendingUp size={18} />
                            </button>
                         )}
                         {(currentUser?.id === post.authorId || isOwner) && (
                           <button onClick={() => { setPostToDelete(post.id); }} className="p-2 bg-zinc-950 text-zinc-500 rounded-xl hover:text-red-500 transition-all">
                              <Trash2 size={18} />
                           </button>
                         )}
                      </div>
                   </div>

                   <h3 className="text-xl font-black text-white mb-3">{post.title}</h3>
                   <p className="text-zinc-400 text-sm font-medium leading-loose whitespace-pre-wrap mb-6">{post.description}</p>

                   {post.images && post.images.length > 0 && (
                     <div className={`grid gap-3 mb-6 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {post.images.map((img, i) => (
                          <img key={i} src={img} className="w-full h-48 md:h-64 object-cover rounded-3xl border border-white/5" onClick={() => window.open(img, '_blank')} />
                        ))}
                     </div>
                   )}

                   <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                      <button 
                        onClick={() => handleLikePost(post)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all font-black text-xs ${post.likes.includes(currentUser?.id || '') ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-zinc-950 text-zinc-500 hover:text-white'}`}
                      >
                         <Heart size={18} fill={post.likes.includes(currentUser?.id || '') ? "currentColor" : "none"} /> 
                         {formatNumber(totalLikes)}
                      </button>
                      
                      <button 
                        onClick={() => setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-950 text-zinc-500 hover:text-white transition-all font-black text-xs"
                      >
                         <MessageSquare size={18} /> {post.comments?.length || 0} تعليق
                      </button>
                   </div>

                   {/* Comments Section */}
                   {activeCommentsPostId === post.id && (
                     <div className="mt-6 pt-6 border-t border-white/5 animate-in slide-in-from-top-2">
                        <div className="space-y-4 max-h-60 overflow-y-auto no-scrollbar mb-4">
                           {post.comments?.map(comment => (
                             <div key={comment.id} className="flex gap-3">
                                <img src={comment.userAvatar} className="w-8 h-8 rounded-xl object-cover shrink-0" />
                                <div className="bg-zinc-950 p-3 rounded-2xl rounded-tr-none border border-white/5 flex-1">
                                   <div className="flex justify-between items-start">
                                      <span className="text-[10px] font-black text-white mb-1 block">{comment.userName}</span>
                                      {(currentUser?.id === comment.userId || isOwner) && (
                                        <button onClick={() => handleDeleteComment(post.id, comment)}><Trash2 size={12} className="text-zinc-600 hover:text-red-500" /></button>
                                      )}
                                   </div>
                                   <p className="text-zinc-400 text-xs font-medium">{comment.text}</p>
                                   <div className="mt-2 flex items-center gap-3">
                                      <button onClick={() => handleLikeComment(post.id, comment.id)} className="flex items-center gap-1 text-[9px] font-bold text-zinc-600 hover:text-red-500">
                                         <Heart size={10} fill={comment.likes?.includes(currentUser?.id || '') ? "currentColor" : "none"} /> {comment.likes?.length || 0}
                                      </button>
                                      <span className="text-[8px] text-zinc-700">{new Date(comment.createdAt).toLocaleTimeString()}</span>
                                   </div>
                                </div>
                             </div>
                           ))}
                           {(!post.comments || post.comments.length === 0) && <p className="text-center text-zinc-600 text-xs font-bold py-4">كن أول من يعلق!</p>}
                        </div>

                        {currentUser && (
                          <div className="relative">
                             <input 
                               type="text" 
                               value={commentText}
                               onChange={e => setCommentText(e.target.value)}
                               placeholder="اكتب تعليقاً..."
                               className="w-full bg-zinc-950 border border-white/5 rounded-2xl py-3 pr-4 pl-12 text-white text-xs font-bold outline-none focus:border-white/20"
                               onKeyDown={e => e.key === 'Enter' && handleSendComment(post.id)}
                             />
                             <button 
                               onClick={() => handleSendComment(post.id)}
                               disabled={isSendingComment || !commentText.trim()}
                               className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:text-white disabled:opacity-50"
                             >
                                <Send size={14} />
                             </button>
                          </div>
                        )}
                     </div>
                   )}
                </div>
              );})}
              
              {filteredPosts.length === 0 && (
                <div className="py-20 text-center opacity-50">
                   <LayoutGrid size={48} className="mx-auto mb-4" />
                   <p>لا توجد منشورات مطابقة</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* --- NEWS TAB --- */}
      {activeTab === 'news' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-8">
           {news.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {news.map(item => (
                  <div key={item.id} className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem] space-y-6 shadow-xl hover:theme-border-primary-alpha transition-all group relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-full h-1 theme-bg-primary-alpha opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="flex items-start justify-between">
                        <div>
                           <h3 className="text-xl font-black text-white leading-tight mb-2 group-hover:theme-text-primary transition-colors">{item.title}</h3>
                           <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-bold">
                              <Calendar size={12} /> {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                           </div>
                        </div>
                        <div className="flex gap-2">
                           {(isOwner || currentUser?.id === item.authorId) && (
                             <button 
                               onClick={(e) => { e.stopPropagation(); handleDeleteNews(item.id); }}
                               className="p-3 bg-red-600/10 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-90"
                               title="حذف الخبر"
                             >
                                <Trash2 size={18} />
                             </button>
                           )}
                           <div className="w-12 h-12 bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-700 group-hover:theme-text-primary transition-colors border border-white/5 shadow-inner">
                              <Newspaper size={24} />
                           </div>
                        </div>
                     </div>
                     
                     <p className="text-zinc-400 text-sm font-medium leading-relaxed line-clamp-4">{item.content}</p>
                     
                     {item.images && item.images.length > 0 && (
                       <div className="grid grid-cols-2 gap-2 mt-4">
                          {item.images.slice(0, 2).map((img, i) => (
                            <img key={i} src={img} className="w-full h-32 object-cover rounded-2xl border border-white/5" />
                          ))}
                       </div>
                     )}
                  </div>
                ))}
             </div>
           ) : (
             <div className="py-40 text-center flex flex-col items-center justify-center opacity-50">
                <Newspaper size={48} className="mb-4" />
                <p>لا توجد أخبار حالياً</p>
             </div>
           )}
        </div>
      )}

      {/* Confirmation Modal */}
      {postToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setPostToDelete(null)}></div>
           <div className="bg-[#0f0f0f] border border-red-500/20 p-10 rounded-[3rem] w-full max-w-sm relative z-10 text-center animate-in zoom-in">
              <AlertTriangle size={48} className="text-red-500 mx-auto mb-6" />
              <h3 className="text-xl font-black text-white mb-2">حذف المنشور؟</h3>
              <p className="text-zinc-500 text-xs font-medium mb-8">لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex flex-col gap-3">
                 <button onClick={handleDeletePost} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-sm active:scale-95 transition-all">تأكيد الحذف</button>
                 <button onClick={() => setPostToDelete(null)} className="w-full py-4 bg-zinc-900 text-zinc-500 rounded-2xl font-black text-sm hover:text-white">إلغاء</button>
              </div>
           </div>
        </div>
      )}

      {/* Admin Fake Likes Modal */}
      {fakeLikesModalPost && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/98 backdrop-blur-2xl" onClick={() => setFakeLikesModalPost(null)}></div>
           <div className="bg-[#0f0f0f] border border-red-900/30 p-10 rounded-[3rem] w-full max-w-sm relative z-10 text-center animate-in zoom-in shadow-2xl">
              <TrendingUp size={40} className="text-red-500 mx-auto mb-6" />
              <h3 className="text-xl font-black text-white mb-2">تعديل الإعجابات</h3>
              <p className="text-red-500/60 text-[10px] uppercase font-bold mb-8">لوحة تحكم الإدارة</p>
              
              <div className="mb-8">
                 <label className="text-[10px] font-black text-zinc-500 uppercase block mb-2">عدد الإعجابات المزيف</label>
                 <input 
                   type="number" 
                   value={fakeLikesInput || ''} 
                   onChange={e => setFakeLikesInput(Number(e.target.value))}
                   placeholder="0"
                   className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-4 text-center text-white font-black outline-none focus:border-red-500 placeholder:text-white/20"
                 />
              </div>

              <div className="flex flex-col gap-3">
                 <button onClick={handleSaveFakeLikes} className="w-full py-4 bg-red-900/50 text-red-100 border border-red-500/20 rounded-2xl font-black text-sm hover:bg-red-900 transition-all">حفظ التغييرات</button>
                 <button onClick={handleResetFakeLikes} className="w-full py-4 bg-red-900/30 text-red-400 border border-red-500/20 rounded-2xl font-black text-sm hover:bg-red-900/50 transition-all">إعادة للوضع الأصلي</button>
                 <button onClick={() => setFakeLikesModalPost(null)} className="w-full py-4 bg-zinc-900 text-zinc-500 rounded-2xl font-black text-sm hover:text-white">إلغاء</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default NewsView;
