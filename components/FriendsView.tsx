import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, MessageSquare, Send, Users, Gamepad2, X, Clock, Trash2, Loader2, Check, XCircle, UserCheck, CheckCircle2, Ban, Unlock, AlertTriangle, Plus, ShieldCheck, Globe, Calendar, CheckCircle, MoreVertical, Eye, User as UserIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import { User, ChatMessage, GameInvite, FriendRequest } from '../types';
import { db } from '../db';

interface FriendsViewProps {
  currentUser: User;
  onViewProfile: (user: User) => void;
}

const FriendsView: React.FC<FriendsViewProps> = ({ currentUser, onViewProfile }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'requests' | 'play' | 'blocked'>('chat');
  const [requestsSubTab, setRequestsSubTab] = useState<'received' | 'sent'>('received');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [recentChatPartners, setRecentChatPartners] = useState<User[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showOptionsPopup, setShowOptionsPopup] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [userToBlock, setUserToBlock] = useState<User | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  
  const [invites, setInvites] = useState<GameInvite[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [myFriends, setMyFriends] = useState<string[]>([]);
  
  // Map for storing user details for requests
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  
  const [isLobbyModalOpen, setIsLobbyModalOpen] = useState(false);
  const [acceptingInvite, setAcceptingInvite] = useState<GameInvite | null>(null);
  const [acceptMcName, setAcceptMcName] = useState('');
  
  // Create Lobby Form State
  const [mcName, setMcName] = useState('');
  const [version, setVersion] = useState('1.21');
  const [expiry, setExpiry] = useState('24h');
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Initialize Data
  useEffect(() => {
    db.getFriends(currentUser.id).then(setMyFriends);
    if (activeTab === 'blocked') loadBlockedUsers();
  }, [activeTab]);

  // Real-time listeners
  useEffect(() => {
    let unsubChat: any;
    let unsubInvites: any;
    let unsubReqRec: any;
    let unsubReqSent: any;

    // Chat Listeners
    if (activeTab === 'chat') {
      setIsLoading(true);
      unsubChat = db.subscribeToRecentChats(currentUser.id, async (partnerIds) => {
        const friendIds = await db.getFriends(currentUser.id);
        setMyFriends(friendIds); // Update friends list on chat update as well
        
        const allIds = Array.from(new Set([...partnerIds, ...friendIds]));
        const visibleIds = allIds.filter(id => !currentUser.hiddenChats?.includes(id));
        
        const users = await Promise.all(visibleIds.map(id => db.get('users', id) as Promise<User>));
        setRecentChatPartners(users.filter(u => !!u && !currentUser.blockedUsers?.includes(u.id)));
        setIsLoading(false);
      });
    }

    // Requests Listeners - Active in both 'requests' and 'chat' (to show status icons)
    if (activeTab === 'requests' || activeTab === 'chat') {
      unsubReqRec = db.subscribeToFriendRequests(currentUser.id, async (reqs) => {
        const filtered = reqs.filter(r => !currentUser.blockedUsers?.includes(r.senderId));
        setPendingRequests(filtered);
        
        // Fetch users for received requests (senders)
        const ids = Array.from(new Set(filtered.map(r => r.senderId)));
        if (ids.length > 0) {
            const fetched: Record<string, User> = {};
            await Promise.all(ids.map(async id => {
                const u = await db.get('users', id);
                if (u) fetched[id] = u as User;
            }));
            setUsersMap(prev => ({...prev, ...fetched}));
        }
      });

      unsubReqSent = db.subscribeToSentFriendRequests(currentUser.id, async (reqs) => {
        setSentRequests(reqs);
        
        // Fetch users for sent requests (receivers)
        const ids = Array.from(new Set(reqs.map(r => r.receiverId)));
        if (ids.length > 0) {
            const fetched: Record<string, User> = {};
            await Promise.all(ids.map(async id => {
                const u = await db.get('users', id);
                if (u) fetched[id] = u as User;
            }));
            setUsersMap(prev => ({...prev, ...fetched}));
        }
      });
    }

    // Invites Listener
    if (activeTab === 'play') {
      setIsLoading(true);
      unsubInvites = db.subscribeToGameInvites((data) => {
        const now = new Date().toISOString();
        const validInvites = data.filter(inv => inv.expiresAt > now && !currentUser.blockedUsers?.includes(inv.hostId));
        setInvites(validInvites);
        setIsLoading(false);
      });
    }

    return () => {
      if (unsubChat) unsubChat();
      if (unsubInvites) unsubInvites();
      if (unsubReqRec) unsubReqRec();
      if (unsubReqSent) unsubReqSent();
    };
  }, [activeTab]);

  // Message Listener
  useEffect(() => {
    if (selectedUser) {
      const unsubMsgs = db.subscribeToMessages(currentUser.id, selectedUser.id, (msgs) => {
        setMessages(msgs);
      });
      return () => unsubMsgs();
    }
  }, [selectedUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadBlockedUsers = async () => {
    const ids = currentUser.blockedUsers || [];
    if (ids.length > 0) {
      const users = await Promise.all(ids.map(id => db.get('users', id) as Promise<User>));
      setBlockedUsers(users.filter(u => !!u));
    } else {
      setBlockedUsers([]);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await db.searchUsers(val);
        const filtered = results.filter(u => 
          u.id !== currentUser.id && 
          !(currentUser.blockedUsers || []).includes(u.id) && 
          !(u.blockedUsers || []).includes(currentUser.id)
        );
        setSearchResults(filtered);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedUser) return;
    if (!canMessage(selectedUser)) return;

    const txt = messageText.trim();
    setMessageText('');
    await db.sendMessage(currentUser.id, selectedUser.id, txt);
  };

  const handleSendFriendRequest = async (targetUser: User) => {
    try {
      await db.sendFriendRequest(currentUser, targetUser.id);
    } catch (err) {
      alert('فشل إرسال الطلب');
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (confirm('هل تريد إلغاء طلب الصداقة؟')) {
      try {
        await db.cancelFriendRequest(id);
      } catch (err) {
        alert('فشل إلغاء الطلب');
      }
    }
  };

  const handleBlockUser = async () => {
    const target = userToBlock || selectedUser;
    if (!target) return;
    await db.blockUser(currentUser.id, target.id);
    setUserToBlock(null);
    setShowBlockConfirm(false);
    setShowOptionsPopup(false);
    if (selectedUser?.id === target.id) setSelectedUser(null);
    loadBlockedUsers();
  };

  const handleUnblock = async (userId: string) => {
    await db.unblockUser(currentUser.id, userId);
    loadBlockedUsers();
    setShowOptionsPopup(false);
  };

  const handleDeleteChat = async () => {
    if (!selectedUser) return;
    if (!confirm('هل تريد إخفاء هذه المحادثة من قائمتك؟')) return;
    await db.hideChat(currentUser.id, selectedUser.id);
    setSelectedUser(null);
    setShowOptionsPopup(false);
  };

  const handleAcceptRequest = async (req: FriendRequest) => {
    await db.acceptFriendRequest(req, currentUser.displayName);
    const updatedFriends = await db.getFriends(currentUser.id);
    setMyFriends(updatedFriends);
  };

  const handleRejectRequest = async (id: string) => {
    await db.rejectFriendRequest(id);
  };

  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcName.trim() || isCreatingLobby) return;
    
    setIsCreatingLobby(true);
    try {
      let hours = 24;
      if (expiry === '1h') hours = 1;
      if (expiry === '6h') hours = 6;
      if (expiry === '12h') hours = 12;
      
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      await db.createGameInvite(currentUser, mcName.trim(), version.trim(), expiresAt);
      
      setIsLobbyModalOpen(false);
      setMcName('');
      alert('تم إنشاء دعوة اللعب بنجاح!');
    } catch (err) {
      alert('فشل إنشاء الدعوة.');
    } finally {
      setIsCreatingLobby(false);
    }
  };

  const handleConfirmAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptMcName.trim() || !acceptingInvite) return;
    
    setIsLoading(true);
    try {
      await db.acceptGameInvite(currentUser.id, acceptingInvite.hostId, acceptMcName.trim());
      setAcceptingInvite(null);
      setAcceptMcName('');
      setActiveTab('chat');
      alert('تم قبول الدعوة.');
    } catch (err) {
      alert('فشل قبول الدعوة.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (!confirm('هل تريد حذف هذه الدعوة؟')) return;
    await db.deleteGameInvite(id);
  };

  const canMessage = (user: User) => {
    const isBlocked = (currentUser.blockedUsers || []).includes(user.id) || (user.blockedUsers || []).includes(currentUser.id);
    if (isBlocked) return false;

    const permission = user.privacySettings?.messagingPermission || 'everyone';
    if (permission === 'none') return false;
    if (permission === 'followers') return (currentUser.following || []).includes(user.id);
    if (permission === 'friends') return myFriends.includes(user.id);
    return true;
  };

  const TabButton = ({ id, label, icon: Icon, badge }: any) => (
    <button 
      onClick={() => setActiveTab(id)} 
      className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all gap-1.5 flex-1 min-w-[70px] ${activeTab === id ? 'theme-bg-primary text-black shadow-lg theme-shadow-primary-soft' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
    >
      <div className="relative">
        <Icon size={20} />
        {badge > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 rounded-full text-[8px] flex items-center justify-center text-white font-black">{badge}</span>}
      </div>
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );

  const isBlockedByMe = selectedUser ? (currentUser.blockedUsers || []).includes(selectedUser.id) : false;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32 px-4 sm:px-0">
      {/* Header & Tab Navigation */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-zinc-900/40 p-4 sm:p-6 rounded-[2.5rem] border border-white/5">
        <div className="flex items-center gap-4 w-full lg:w-auto">
           <div className="w-12 h-12 theme-bg-primary-alpha theme-text-primary rounded-2xl flex items-center justify-center border theme-border-primary-alpha shrink-0">
             <Users size={24} />
           </div>
           <div className="min-w-0">
             <h2 className="text-xl md:text-2xl font-black text-white truncate">الأصدقاء واللعب</h2>
             <p className="text-zinc-500 text-[10px] md:text-xs font-bold truncate">تواصل والعب مع مجتمع Over Mods</p>
           </div>
        </div>
        
        <div className="grid grid-cols-4 bg-zinc-950 p-1.5 rounded-[2rem] border border-white/5 w-full lg:w-auto gap-1">
           <TabButton id="chat" label="المحادثات" icon={MessageSquare} />
           <TabButton id="requests" label="الطلبات" icon={UserPlus} badge={pendingRequests.length} />
           <TabButton id="play" label="دعوات اللعب" icon={Gamepad2} />
           <TabButton id="blocked" label="المحظورين" icon={Ban} />
        </div>
      </div>

      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="space-y-6 flex flex-col h-full lg:max-h-[600px]">
              <div className="relative group">
                 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:theme-text-primary transition-colors" size={20} />
                 <input 
                   type="text" 
                   value={searchTerm} 
                   onChange={e => handleSearchChange(e.target.value)}
                   placeholder="ابحث عن أصدقاء..." 
                   className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 sm:py-5 pr-14 pl-6 text-white font-black text-sm outline-none focus:theme-border-primary transition-all"
                 />
                 {isSearching && <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 animate-spin text-zinc-500" size={16} />}
              </div>

              <div className="flex-1 bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-4 sm:p-6 overflow-y-auto no-scrollbar space-y-3 min-h-[300px]">
                 <h4 className="text-[10px] text-zinc-700 font-black uppercase tracking-widest mb-4 px-2">
                   {searchTerm ? 'نتائج البحث' : 'المحادثات الأخيرة'}
                 </h4>
                 
                 {(searchTerm ? searchResults : recentChatPartners).map(user => {
                   const isSentRequest = sentRequests.some(req => req.receiverId === user.id);
                   const showRequestButton = !canMessage(user) && !myFriends.includes(user.id) && !isSentRequest;

                   return (
                   <div 
                     key={user.id} 
                     onClick={() => setSelectedUser(user)}
                     className={`group/item w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl transition-all border cursor-pointer ${selectedUser?.id === user.id ? 'theme-bg-primary-alpha theme-border-primary-alpha' : 'bg-zinc-900/20 border-transparent hover:border-white/5'}`}
                   >
                     <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover shadow-lg border border-white/10 shrink-0" alt="" />
                     
                     <div className="text-right flex-1 min-w-0">
                        <h5 className="text-white font-black text-xs sm:text-sm truncate">
                          {user.displayName}
                          {user.email === 'overmods1@gmail.com' && <ShieldCheck size={12} className="inline mr-1 theme-text-primary" />}
                        </h5>
                        <p className="text-zinc-600 text-[9px] ltr truncate">@{user.username}</p>
                     </div>
                     <div className="shrink-0 flex items-center gap-1">
                       {canMessage(user) ? (
                         <MessageSquare className="theme-text-primary opacity-40 group-hover/item:opacity-100 transition-opacity" size={16} />
                       ) : (
                         <div className="flex items-center gap-2">
                            {showRequestButton && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSendFriendRequest(user); }}
                                className="p-2 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-lime-500 hover:text-black rounded-lg transition-all"
                                title="إرسال طلب صداقة"
                              >
                                <UserPlus size={14} />
                              </button>
                            )}
                            {isSentRequest && (
                              <div className="p-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg animate-in zoom-in" title="تم الإرسال">
                                <Check size={14} />
                              </div>
                            )}
                            <Ban size={14} className="text-zinc-800" />
                         </div>
                       )}
                     </div>
                   </div>
                 )})}
                 
                 {isLoading && !isSearching && <div className="flex justify-center py-10"><Loader2 className="animate-spin theme-text-primary" /></div>}
                 {!isLoading && !isSearching && recentChatPartners.length === 0 && !searchTerm && (
                    <div className="text-center py-10 text-zinc-600 font-bold text-xs">لا توجد محادثات حديثة</div>
                 )}
              </div>
           </div>

           <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col min-h-[500px] lg:min-h-[600px]">
              {selectedUser ? (
                <>
                  <div className="bg-zinc-900/50 p-4 sm:p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                     <div className="flex items-center gap-4">
                        <img 
                          src={selectedUser.avatar} 
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover shadow-lg border border-white/10 cursor-pointer hover:opacity-80 transition-opacity" 
                          onClick={() => onViewProfile(selectedUser)}
                        />
                        <div className="text-right cursor-pointer group/name" onClick={() => setShowOptionsPopup(true)}>
                           <h4 className="text-white font-black text-sm sm:text-base group-hover/name:theme-text-primary transition-colors flex items-center gap-2">
                             {selectedUser.displayName}
                             {selectedUser.email === 'overmods1@gmail.com' && <ShieldCheck size={16} className="inline theme-text-primary" />}
                             <MoreVertical size={14} className="text-zinc-700" />
                           </h4>
                           <p className="text-[9px] text-zinc-600 font-bold ltr">@{selectedUser.username}</p>
                        </div>
                     </div>
                     
                     <div className="flex gap-2">
                        {!canMessage(selectedUser) && !myFriends.includes(selectedUser.id) && !sentRequests.some(r => r.receiverId === selectedUser.id) && (
                           <button 
                             onClick={() => handleSendFriendRequest(selectedUser)} 
                             className="p-2.5 theme-bg-primary text-black rounded-xl hover:theme-bg-primary-hover transition-all active:scale-90"
                             title="إضافة صديق"
                           >
                             <UserPlus size={18} />
                           </button>
                        )}
                        <button 
                          onClick={() => {
                            setUserToBlock(selectedUser);
                            setShowBlockConfirm(true);
                          }} 
                          className="p-2.5 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all active:scale-90"
                          title="منع من المراسلة"
                        >
                          <Ban size={18} />
                        </button>
                        <button 
                          onClick={() => setSelectedUser(null)} 
                          className="p-2.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all active:scale-90"
                        >
                          <X size={20} />
                        </button>
                     </div>
                  </div>

                  <div className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6 no-scrollbar">
                     {messages.map(msg => (
                       <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-start' : 'justify-end'}`}>
                          <div className={`max-w-[85%] sm:max-w-[80%] p-4 rounded-2xl text-sm font-medium ${msg.senderId === currentUser.id ? 'theme-bg-primary text-black rounded-tr-none' : 'bg-zinc-900 text-white rounded-tl-none border border-white/5'}`}>
                             {msg.text}
                             <p className={`text-[8px] mt-2 opacity-50 font-bold ${msg.senderId === currentUser.id ? 'text-black' : 'text-zinc-500'}`}>{new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                       </div>
                     ))}
                     <div ref={chatEndRef} />
                  </div>

                  {canMessage(selectedUser) ? (
                    <form onSubmit={handleSendMessage} className="p-4 sm:p-6 bg-zinc-950/50 border-t border-white/5 shrink-0">
                       <div className="relative group">
                          <input 
                            type="text" 
                            value={messageText}
                            onChange={e => setMessageText(e.target.value)}
                            placeholder="اكتب رسالة..." 
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 sm:py-5 pr-6 pl-14 sm:pl-16 text-white text-sm outline-none focus:theme-border-primary transition-all shadow-inner"
                          />
                          <button type="submit" className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 theme-bg-primary text-black rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all">
                             <Send size={18} />
                          </button>
                       </div>
                    </form>
                  ) : (
                    <div className="p-6 bg-red-600/5 border-t border-red-500/20 text-center shrink-0 flex flex-col items-center gap-3">
                       <p className="text-red-500 text-[10px] font-black uppercase tracking-tight">الدردشة مقيدة. يجب أن تكونا صديقين للمراسلة.</p>
                       {!myFriends.includes(selectedUser.id) && !sentRequests.some(r => r.receiverId === selectedUser.id) && (
                         <button 
                           onClick={() => handleSendFriendRequest(selectedUser)}
                           className="px-6 py-3 bg-zinc-800 hover:bg-white text-zinc-400 hover:text-black rounded-xl font-bold text-xs transition-all flex items-center gap-2"
                         >
                           <UserPlus size={16} /> إرسال طلب صداقة
                         </button>
                       )}
                       {sentRequests.some(r => r.receiverId === selectedUser.id) && (
                         <div className="px-6 py-3 bg-green-500/10 text-green-500 border border-green-500/20 rounded-xl font-bold text-xs flex items-center gap-2">
                           <Check size={16} /> تم إرسال الطلب
                         </div>
                       )}
                    </div>
                  )}

                  {/* User Options Popup */}
                  {showOptionsPopup && (
                    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
                      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowOptionsPopup(false)}></div>
                      <div className="bg-[#0a0a0a] border border-white/10 p-6 rounded-[2.5rem] w-full max-w-xs relative z-10 shadow-2xl animate-in zoom-in duration-300">
                         <div className="flex flex-col items-center gap-4 mb-6">
                            <img src={selectedUser.avatar} className="w-20 h-20 rounded-[1.8rem] object-cover border border-white/10" alt="" />
                            <div className="text-center">
                               <h4 className="text-white font-black text-lg">{selectedUser.displayName}</h4>
                               <p className="text-zinc-600 text-[10px] font-bold ltr">@{selectedUser.username}</p>
                            </div>
                         </div>
                         <div className="space-y-2">
                            <button onClick={() => { onViewProfile(selectedUser); setShowOptionsPopup(false); }} className="w-full p-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl text-xs font-black flex items-center gap-3 transition-all">
                               <UserIcon size={18} className="theme-text-primary" /> عرض الملف الشخصي
                            </button>
                            {isBlockedByMe ? (
                              <button onClick={() => handleUnblock(selectedUser.id)} className="w-full p-4 bg-lime-500/10 text-lime-500 hover:bg-lime-500 hover:text-black rounded-2xl text-xs font-black flex items-center gap-3 transition-all">
                                 <Unlock size={18} /> إلغاء الحظر
                              </button>
                            ) : (
                              <button onClick={() => { setUserToBlock(selectedUser); setShowBlockConfirm(true); }} className="w-full p-4 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl text-xs font-black flex items-center gap-3 transition-all">
                                 <Ban size={18} /> حظر المراسلة
                              </button>
                            )}
                            <button onClick={handleDeleteChat} className="w-full p-4 bg-zinc-900 hover:bg-red-600/10 hover:text-red-500 text-zinc-500 rounded-2xl text-xs font-black flex items-center gap-3 transition-all">
                               <Trash2 size={18} /> حذف المحادثة
                            </button>
                            <button onClick={() => setShowOptionsPopup(false)} className="w-full p-4 bg-zinc-950 text-zinc-700 rounded-2xl text-xs font-black hover:text-white transition-all">
                               إغلاق
                            </button>
                         </div>
                      </div>
                    </div>
                  )}

                  {/* Block Confirmation Modal */}
                  {showBlockConfirm && (
                    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
                      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowBlockConfirm(false)}></div>
                      <div className="bg-[#0f0f0f] border border-white/10 p-10 rounded-[3rem] w-full max-w-md relative z-10 shadow-2xl text-center animate-in zoom-in duration-300">
                         <div className="w-24 h-24 bg-red-600/10 text-red-500 rounded-[1.8rem] flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                            <Ban size={48} />
                         </div>
                         <h3 className="text-2xl font-black text-white mb-4">تأكيد حظر {selectedUser.displayName}؟</h3>
                         <p className="text-zinc-500 text-sm font-medium mb-12 leading-relaxed px-4">
                            عند حظر هذا المستخدم، لن يتمكن من مراسلتك مجدداً، وسيتم إخفاء المحادثة من قائمة رسائلك. يمكنك إلغاء الحظر لاحقاً من قسم المحظورين.
                         </p>
                         <div className="flex flex-col gap-3">
                            <button onClick={handleBlockUser} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-red-900/20">تأكيد الحظر</button>
                            <button onClick={() => setShowBlockConfirm(false)} className="w-full py-5 bg-zinc-900 text-zinc-500 rounded-2xl font-black text-lg hover:text-white transition-colors">تراجع</button>
                         </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 sm:p-12">
                   <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center text-zinc-800 mb-8 border border-white/5 shadow-inner">
                      <MessageSquare size={40} />
                   </div>
                   <h3 className="text-xl sm:text-2xl font-black text-zinc-600 mb-2">ابدأ محادثة جديدة</h3>
                   <p className="text-zinc-700 text-xs sm:text-sm font-bold max-w-xs leading-relaxed">تواصل مع مبدعي البيدروك بشكل مباشر وآمن</p>
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-8">
           <div className="flex gap-4 mb-4 bg-zinc-900/50 p-1.5 rounded-2xl w-fit mx-auto border border-white/5">
              <button 
                onClick={() => setRequestsSubTab('received')} 
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${requestsSubTab === 'received' ? 'theme-bg-primary text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
              >
                طلبات مستلمة
              </button>
              <button 
                onClick={() => setRequestsSubTab('sent')} 
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${requestsSubTab === 'sent' ? 'theme-bg-primary text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
              >
                طلبات مرسلة
              </button>
           </div>

           {requestsSubTab === 'received' && (
             <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                 <UserPlus className="text-blue-500" size={24} /> طلبات مستلمة
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingRequests.map(req => {
                    const user = usersMap[req.senderId];
                    return (
                    <div key={req.id} className="bg-zinc-900/50 border border-white/5 p-5 rounded-3xl flex items-center justify-between group hover:border-blue-500/20 transition-all">
                       <div className="flex items-center gap-4">
                          <img src={user ? user.avatar : req.senderAvatar} className="w-10 h-10 rounded-xl object-cover shadow-lg border border-white/10" alt="" />
                          <div className="text-right">
                             <h5 className="text-white font-black text-sm">{user ? user.displayName : req.senderName}</h5>
                             <p className="text-zinc-500 text-[10px] ltr">@{user ? user.username : '...'}</p>
                          </div>
                       </div>
                       <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleAcceptRequest(req)} className="p-3 theme-bg-primary text-black rounded-xl shadow-lg active:scale-95 transition-all"><Check size={18} /></button>
                          <button onClick={() => handleRejectRequest(req.id)} className="p-3 bg-red-600/10 text-red-500 border border-red-500/10 rounded-xl hover:bg-red-600 hover:text-white transition-all"><XCircle size={18} /></button>
                       </div>
                    </div>
                  )})}
                  
                  {pendingRequests.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-900 rounded-[3rem] bg-zinc-900/10">
                       <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-800">
                          <UserPlus size={24} />
                       </div>
                       <h4 className="text-lg font-black text-zinc-600">لا توجد طلبات جديدة</h4>
                    </div>
                  )}
               </div>
             </div>
           )}

           {requestsSubTab === 'sent' && (
             <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
               <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                 <Send className="text-zinc-500" size={24} /> طلبات مرسلة
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sentRequests.map(req => {
                    const user = usersMap[req.receiverId];
                    return (
                    <div key={req.id} className="bg-zinc-900/30 border border-white/5 p-5 rounded-3xl flex items-center justify-between group">
                       <div className="flex items-center gap-4 opacity-70">
                          <div className={`w-10 h-10 rounded-xl ${user ? 'object-cover' : 'bg-zinc-950 flex items-center justify-center text-zinc-700 border border-white/5'}`}>
                             {user ? <img src={user.avatar} className="w-full h-full rounded-xl object-cover"/> : <UserIcon size={20} />}
                          </div>
                          <div className="text-right">
                             <h5 className="text-white font-black text-sm">{user ? user.displayName : `مستخدم #${req.receiverId.slice(0, 5)}`}</h5>
                             {user ? (
                                <p className="text-zinc-500 text-[10px] ltr">@{user.username}</p>
                             ) : (
                                <span className="text-green-500 text-[9px] font-bold flex items-center gap-1"><Check size={10} /> تم الإرسال</span>
                             )}
                          </div>
                       </div>
                       <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleCancelRequest(req.id)} className="p-3 bg-zinc-900 text-zinc-500 border border-white/5 rounded-xl hover:text-red-500 transition-all" title="إلغاء الطلب"><X size={18} /></button>
                       </div>
                    </div>
                  )})}
                  
                  {sentRequests.length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-900 rounded-[3rem] bg-zinc-900/10">
                       <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-800">
                          <Send size={24} />
                       </div>
                       <h4 className="text-lg font-black text-zinc-600">لم ترسل أي طلبات</h4>
                    </div>
                  )}
               </div>
             </div>
           )}
        </div>
      )}

      {activeTab === 'play' && (
        <div className="space-y-8">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3"><Gamepad2 className="theme-text-primary" size={24} /> دعوات اللعب</h3>
              <button 
                onClick={() => setIsLobbyModalOpen(true)}
                className="px-5 sm:px-8 py-3 theme-bg-primary text-black rounded-xl font-black text-[10px] md:text-xs shadow-xl active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus size={16} /> إنشاء دعوة
              </button>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {invites.map(inv => (
                <div key={inv.id} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 theme-bg-primary-alpha blur-3xl pointer-events-none"></div>
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3 min-w-0">
                         <img src={inv.hostAvatar} className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-md" alt="" />
                         <div className="text-right min-w-0">
                            <h4 className="text-white font-black text-xs truncate">{inv.hostName}</h4>
                            <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest block">المضيف</span>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        {inv.hostId !== currentUser.id && (
                           <button 
                             onClick={() => setAcceptingInvite(inv)}
                             className="p-2.5 theme-bg-primary text-black rounded-xl shadow-lg active:scale-95 transition-all"
                             title="قبول الدعوة"
                           >
                              <CheckCircle size={16} />
                           </button>
                        )}
                        {inv.hostId === currentUser.id && (
                           <button 
                             onClick={() => handleDeleteInvite(inv.id)}
                             className="p-2.5 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                             title="حذف الدعوة"
                           >
                              <Trash2 size={16} />
                           </button>
                        )}
                      </div>
                   </div>

                   <div className="space-y-3 mb-6">
                      <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                         <span className="text-zinc-600 text-[8px] font-black uppercase">Minecraft Name</span>
                         <span className="theme-text-primary font-black text-xs ltr truncate select-all">{inv.mcName}</span>
                      </div>
                      <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                         <span className="text-zinc-600 text-[8px] font-black uppercase">Version</span>
                         <span className="text-white font-black text-xs ltr truncate">{inv.version}</span>
                      </div>
                   </div>
                </div>
              ))}
              
              {invites.length === 0 && !isLoading && (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-900 rounded-[3rem] bg-zinc-900/10">
                   <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-800">
                      <Gamepad2 size={32} />
                   </div>
                   <h4 className="text-xl font-black text-zinc-600">لا توجد دعوات لعب نشطة</h4>
                   <p className="text-zinc-800 text-xs font-bold mt-2">كن أول من يطلب اللعب المشترك الآن</p>
                </div>
              )}
              
              {isLoading && <div className="col-span-full flex justify-center py-10"><Loader2 className="animate-spin theme-text-primary" /></div>}
           </div>
        </div>
      )}

      {/* Create Lobby/Invite Modal */}
      {isLobbyModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setIsLobbyModalOpen(false)}></div>
          <div className="bg-[#0a0a0a] border border-white/10 p-8 sm:p-10 rounded-[3rem] w-full max-lg relative z-10 shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
             <div className="absolute top-0 right-0 w-full h-1 theme-bg-primary-alpha opacity-30"></div>
             
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                   <Gamepad2 className="theme-text-primary" /> إنشاء دعوة لعب
                </h3>
                <button onClick={() => setIsLobbyModalOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                   <X size={24} />
                </button>
             </div>

             <form onSubmit={handleCreateLobby} className="space-y-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">Minecraft Name (Username)</label>
                   <input 
                     type="text" 
                     value={mcName}
                     onChange={e => setMcName(e.target.value)}
                     className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-white font-black text-sm outline-none focus:theme-border-primary transition-all shadow-inner"
                     placeholder="اسم اللاعب في ماين كرافت..."
                     required
                   />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">Version</label>
                      <input 
                        type="text" 
                        value={version}
                        onChange={e => setVersion(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-white font-black text-sm outline-none focus:theme-border-primary transition-all shadow-inner"
                        placeholder="1.21.x"
                        required
                      />
                   </div>
                   
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-2">مدة بقاء الدعوة</label>
                      <div className="grid grid-cols-4 gap-2">
                         {[
                           { id: '1h', label: '1 ساعة' },
                           { id: '6h', label: '6 ساعات' },
                           { id: '12h', label: '12 ساعة' },
                           { id: '24h', label: '24 ساعة' }
                         ].map((opt) => (
                           <button
                             key={opt.id}
                             type="button"
                             onClick={() => setExpiry(opt.id)}
                             className={`py-3 px-1 rounded-xl text-[9px] font-black transition-all border-2 active:scale-95 ${
                               expiry === opt.id 
                                 ? 'theme-bg-primary theme-border-primary text-black shadow-lg theme-shadow-primary-soft' 
                                 : 'bg-zinc-900 border-white/5 text-zinc-600 hover:text-white hover:border-white/10'
                             }`}
                           >
                              {opt.label}
                           </button>
                         ))}
                      </div>
                   </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isCreatingLobby}
                  className="w-full py-5 theme-bg-primary text-black rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl theme-shadow-primary-soft flex items-center justify-center gap-3 disabled:opacity-50"
                >
                   {isCreatingLobby ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                   {isCreatingLobby ? 'جاري الإنشاء...' : 'نشر الدعوة الآن'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsView;