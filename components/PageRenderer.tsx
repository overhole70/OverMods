import React, { useEffect, useState } from 'react';
// Removed react-router-dom hooks
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { firestore } from '../db';
import { Mod, User, MinecraftServer, NewsItem, View } from '../types';
import { Loader2, Ghost } from 'lucide-react';

// Components
import HomeView from './HomeView';
import SettingsView from './SettingsView';
import { ProfileView } from './ProfileView';
import ModDetails from './ModDetails';
import LoginView from './LoginView';
import ServersView from './ServersView';
import NewsView from './NewsView';
import UploadForm from './UploadForm';
import CreatorVerification from './CreatorVerification';
import NotificationsView from './NotificationsView';
import DownloadsView from './DownloadsView';
import FriendsView from './FriendsView';
import MonetizationView from './MonetizationView';
import ContestsView from './ContestsView';
import EditProfileView from './EditProfileView';
import AdminDashboard from './AdminDashboard';
import StatsDashboard from './StatsDashboard';
import QuestionsView from './QuestionsView';

interface PageRendererProps {
  activePage: string;
  onNavigate: (page: string) => void;
  currentUser: User | null;
  mods: Mod[];
  servers: MinecraftServer[];
  newsSnippet: NewsItem | null;
  userDownloads: Mod[];
  searchTerm: string;
  setSearchTerm: (t: string) => void;
  isRefreshing: boolean;
  initializeData: () => Promise<void>;
  trackUserInterest: (c: string) => void;
  isRTL: boolean;
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (val: boolean) => void;
  setShowAdminModal: (val: boolean) => void;
  setCurrentUser: (u: User | null) => void;
  editingItem: Mod | MinecraftServer | null;
  setEditingItem: (item: Mod | MinecraftServer | null) => void;
  db: any;
}

const PageRenderer: React.FC<PageRendererProps> = ({
  activePage, onNavigate,
  currentUser, mods, servers, newsSnippet, userDownloads,
  searchTerm, setSearchTerm, isRefreshing, initializeData, trackUserInterest,
  isRTL, isAdminAuthenticated, setIsAdminAuthenticated, setShowAdminModal, setCurrentUser,
  editingItem, setEditingItem, db
}) => {
  // Removed hooks
  
  const [fetchedUser, setFetchedUser] = useState<User | null>(null);
  const [fetchedMod, setFetchedMod] = useState<Mod | null>(null);
  const [loadingDynamic, setLoadingDynamic] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Helper to determine if a page is static
  const isStaticPage = (id: string) => {
    const staticPages = [
      'home', 'settings', 'profile', 'servers', 'news', 'upload',
      'join-creators', 'notifications', 'downloads', 'friends',
      'earnings', 'contests', 'edit-profile', 'admin', 'stats', 'login', 'questions'
    ];
    return staticPages.includes(id.toLowerCase());
  };

  const normalizedPageId = activePage.toLowerCase();
  const isStatic = isStaticPage(normalizedPageId);

  // Reset dynamic state when pageId changes
  useEffect(() => {
    setFetchedUser(null);
    setFetchedMod(null);
    setNotFound(false);
    
    // Only fetch if NOT a static page
    if (!isStatic) {
      setLoadingDynamic(true);
      if (activePage.startsWith('@')) {
        fetchUserByUsername(activePage.substring(1));
      } else {
        fetchModByShareCodeOrId(activePage);
      }
    } else {
      setLoadingDynamic(false);
    }
  }, [activePage, isStatic]); 

  const fetchUserByUsername = async (username: string) => {
    try {
      const q = query(collection(firestore, 'users'), where('username', '==', username.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setFetchedUser(snap.docs[0].data() as User);
      } else {
        setNotFound(true);
      }
    } catch (e) {
      setNotFound(true);
    } finally {
      setLoadingDynamic(false);
    }
  };

  const fetchModByShareCodeOrId = async (code: string) => {
    // 1. Check loaded mods first (cache) - check both shareCode and ID
    const foundLocal = mods.find(m => m.shareCode === code || m.id === code);
    if (foundLocal) {
      setFetchedMod(foundLocal);
      setLoadingDynamic(false);
      return;
    }

    try {
      // 2. Try fetching by shareCode
      const q = query(collection(firestore, 'mods'), where('shareCode', '==', code));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setFetchedMod({ id: snap.docs[0].id, ...snap.docs[0].data() } as Mod);
      } else {
        // 3. Fallback: Try fetching by Document ID (Legacy mods support)
        const docRef = doc(firestore, 'mods', code);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
           setFetchedMod({ id: docSnap.id, ...docSnap.data() } as Mod);
        } else {
           setNotFound(true);
        }
      }
    } catch (e) {
      console.error("Error fetching mod:", e);
      setNotFound(true);
    } finally {
      setLoadingDynamic(false);
    }
  };

  if (loadingDynamic) {
    return (
      <div className="flex flex-col items-center justify-center py-40 min-h-[50vh]">
        <Loader2 className="animate-spin text-lime-500 mb-4" size={48} />
        <p className="text-zinc-500 font-black">جاري التحميل...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center min-h-[50vh]">
        <Ghost size={64} className="text-zinc-800 mb-6" />
        <h2 className="text-2xl font-black text-white">الصفحة غير موجودة</h2>
        <p className="text-zinc-500 mt-2">لم نتمكن من العثور على ما تبحث عنه.</p>
        <button onClick={() => onNavigate('home')} className="mt-8 px-8 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all">العودة للرئيسية</button>
      </div>
    );
  }

  // --- STATIC ROUTING LOGIC ---

  if (normalizedPageId === 'home') {
    return <HomeView 
      mods={mods} 
      currentUser={currentUser} 
      searchTerm={searchTerm} 
      setSearchTerm={setSearchTerm} 
      isRefreshing={isRefreshing} 
      onRefresh={initializeData} 
      onModClick={(m) => { trackUserInterest(m.category); onNavigate(m.shareCode || m.id); }} 
      onNavigate={(path) => onNavigate(path)} 
      isRTL={isRTL} 
      trackUserInterest={trackUserInterest}
    />;
  }

  if (normalizedPageId === 'settings') return <SettingsView />;

  if (normalizedPageId === 'profile') {
    if (!currentUser) return <LoginView onLogin={(u) => { setCurrentUser(u); onNavigate('profile'); }} />;
    return <ProfileView 
      user={currentUser} 
      currentUser={currentUser} 
      isOwnProfile={true} 
      mods={mods.filter(m => m.publisherId === currentUser.id)} 
      onLogout={() => { db.logout(); setCurrentUser(null); onNavigate('login'); }} 
      onEditMod={(m) => { setEditingItem(m); onNavigate('upload'); }} 
      onModClick={(m) => onNavigate(m.shareCode || m.id)} 
      onFollow={async () => {}} 
      onEditProfile={() => onNavigate('edit-profile')} 
      onBack={() => onNavigate('home')}
    />;
  }

  if (normalizedPageId === 'login') {
    return <LoginView onLogin={(u) => { setCurrentUser(u); onNavigate('home'); }} />;
  }

  if (normalizedPageId === 'servers') {
    return <ServersView 
      servers={servers} 
      currentUser={currentUser} 
      isAdmin={isAdminAuthenticated || currentUser?.role === 'Admin'} 
      onRefresh={() => db.getAll('servers', 24).then((s: any) => { initializeData(); })} 
      onEditServer={(s) => { setEditingItem(s); onNavigate('upload'); }} 
    />;
  }

  if (normalizedPageId === 'news') {
    return <NewsView 
      onBack={() => onNavigate('home')} 
      currentUser={currentUser} 
      onViewProfile={(u) => onNavigate(`@${u.username}`)} 
    />;
  }

  if (normalizedPageId === 'upload') {
    if (!currentUser) return <LoginView onLogin={(u) => { setCurrentUser(u); onNavigate('upload'); }} />;
    return <UploadForm 
      initialData={editingItem}
      onBack={() => { setEditingItem(null); onNavigate('home'); }} 
      onCancel={() => { setEditingItem(null); onNavigate('home'); }} 
      onUpload={(data) => {
        const coll = data.type === 'Server' ? 'servers' : 'mods';
        const payload = { 
          ...data, 
          id: editingItem?.id, 
          publisherId: currentUser?.id, 
          publisherName: currentUser?.displayName, 
          publisherAvatar: currentUser?.avatar, 
          isVerified: currentUser.isVerified,
          stats: editingItem ? (editingItem as Mod).stats : { views: 0, downloads: 0, likes: 0, dislikes: 0, uniqueViews: 0, ratingCount: 0, averageRating: 0, totalRatingScore: 0 } 
        };
        db.put(coll, payload).then(() => { 
          setEditingItem(null);
          initializeData(); 
          onNavigate('home'); 
        });
      }} 
    />;
  }

  if (normalizedPageId === 'join-creators') {
    if (!currentUser) return <LoginView onLogin={(u) => { setCurrentUser(u); onNavigate('join-creators'); }} />;
    return <CreatorVerification 
      currentUser={currentUser}
      onBack={() => onNavigate('home')}
      onSuccess={async (data, status, videoUrl) => {
        const update: Partial<User> = { verificationStatus: status };
        if (videoUrl) update.verificationVideoUrl = videoUrl;
        if (data.reason) update.verificationReason = data.reason;
        if (data.channelUrl) update.channelUrl = data.channelUrl;
        if (data.subscriberCount) update.subscriberCount = data.subscriberCount;
        await db.updateAccount(currentUser.id, update);
        onNavigate('home');
        alert('تم إرسال طلبك للإدارة.');
      }}
    />;
  }

  if (normalizedPageId === 'notifications') {
    if (!currentUser) return <LoginView onLogin={(u) => { setCurrentUser(u); onNavigate('notifications'); }} />;
    return <NotificationsView currentUser={currentUser} onModClick={(link) => onNavigate(link)} onBack={() => onNavigate('home')} />;
  }

  if (normalizedPageId === 'downloads') {
    return <DownloadsView mods={userDownloads} onModClick={(m) => onNavigate(m.shareCode || m.id)} />;
  }

  if (normalizedPageId === 'friends') {
    if (!currentUser) return <LoginView onLogin={(u) => { setCurrentUser(u); onNavigate('friends'); }} />;
    return <FriendsView currentUser={currentUser} onViewProfile={(u) => onNavigate(`@${u.username}`)} />;
  }

  if (normalizedPageId === 'earnings') {
    return <MonetizationView onNavigate={(view) => onNavigate(view)} />;
  }

  if (normalizedPageId === 'contests') {
    if (!currentUser) return <LoginView onLogin={(u) => { setCurrentUser(u); onNavigate('contests'); }} />;
    return <ContestsView currentUser={currentUser} onBack={() => onNavigate('earnings')} />;
  }

  if (normalizedPageId === 'edit-profile') {
    if (!currentUser) return <LoginView onLogin={(u) => { setCurrentUser(u); onNavigate('edit-profile'); }} />;
    return <EditProfileView 
      currentUser={currentUser} 
      onUpdate={(u) => { setCurrentUser(u); }} 
      onLogout={() => { db.logout(); setCurrentUser(null); onNavigate('login'); }} 
      onDelete={() => {}} 
      onBack={() => onNavigate('profile')} 
    />;
  }

  if (normalizedPageId === 'stats') {
    if (!currentUser) return <LoginView onLogin={(u) => { setCurrentUser(u); onNavigate('stats'); }} />;
    return <StatsDashboard mods={mods.filter(m => m.publisherId === currentUser.id)} />;
  }

  if (normalizedPageId === 'admin') {
    if (!isAdminAuthenticated && currentUser?.email !== 'overmods1@gmail.com') {
       setShowAdminModal(true); // Trigger modal in App
       return <div className="h-screen flex items-center justify-center text-zinc-500">منطقة محمية...</div>;
    }
    return <AdminDashboard currentUser={currentUser} onInspectAccount={(u) => onNavigate(`@${u.username}`)} />;
  }

  if (normalizedPageId === 'questions') {
    if (!currentUser) return <LoginView onLogin={(u) => { setCurrentUser(u); onNavigate('questions'); }} />;
    return <QuestionsView currentUser={currentUser} onBack={() => onNavigate('home')} />;
  }

  // --- DYNAMIC RENDER ---

  if (fetchedUser) {
    return <ProfileView 
      user={fetchedUser} 
      currentUser={currentUser} 
      isOwnProfile={currentUser?.id === fetchedUser.id} 
      mods={mods.filter(m => m.publisherId === fetchedUser.id)} 
      onLogout={() => { db.logout(); setCurrentUser(null); onNavigate('login'); }} 
      onEditMod={(m) => {}} 
      onModClick={(m) => onNavigate(m.shareCode || m.id)} 
      onFollow={async () => { await db.followUser(currentUser!.id, fetchedUser.id); }} 
      onEditProfile={() => onNavigate('edit-profile')} 
      onBack={() => onNavigate('home')} 
    />;
  }

  if (fetchedMod) {
    return <ModDetails 
      mod={fetchedMod} 
      allMods={mods} 
      currentUser={currentUser} 
      onBack={() => onNavigate('home')} 
      onModClick={(m) => { trackUserInterest(m.category); onNavigate(m.shareCode || m.id); }} 
      isOnline={true} 
      isAdmin={isAdminAuthenticated || currentUser?.role === 'Admin'} 
      onPublisherClick={(pid) => db.get('users', pid).then((u: any) => { if(u) onNavigate(`@${u.username}`); })} 
      isFollowing={currentUser?.following?.includes(fetchedMod.publisherId) || false} 
      onFollow={() => db.followUser(currentUser!.id, fetchedMod.publisherId)} 
      onEdit={() => { setEditingItem(fetchedMod); onNavigate('upload'); }} 
      onDelete={() => db.deleteMod(fetchedMod.id).then(() => { initializeData(); onNavigate('home'); })} 
      onDownload={() => trackUserInterest(fetchedMod.category)} 
    />;
  }

  // Fallback Loading State to prevent white screen during initial mount/fetch
  return (
    <div className="flex flex-col items-center justify-center py-40 min-h-[50vh]">
      <Loader2 className="animate-spin text-lime-500 mb-4" size={48} />
      <p className="text-zinc-500 font-black">جاري المعالجة...</p>
    </div>
  );
};

export default PageRenderer;