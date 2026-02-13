export type ModType = 'Mod' | 'Resource Pack' | 'Map' | 'Modpack' | 'Server';
export type UserRole = 'User' | 'Creator' | 'Admin' | 'Helper';
export type VerificationStatus = 'none' | 'pending' | 'youtuber_no_video' | 'verified';

export interface AdminPermissions {
  canBan: boolean;
  canReplySupport: boolean;
  canDeleteMods: boolean;
  canManageReports: boolean;
  canSendNotifications: boolean;
  canManageVerifications: boolean;
  canManageNews: boolean;
  canViewUserList: boolean;
  canViewConversations: boolean;
  canViewUserDetails: boolean;
}

export interface Wallet {
  gift: number;
  earned: number;
}

// --- Popup Window Types ---
export type PopupAction = 'close' | 'link' | 'navigate';
export type PopupSize = 'small' | 'half' | '70' | 'full';

export interface PopupButton {
  text: string;
  action: PopupAction;
  payload?: string; // URL or View ID
  style: 'primary' | 'danger' | 'secondary';
}

export interface PopupWindowConfig {
  isActive: boolean;
  title: string;
  description: string;
  icon: string; // Icon name
  size: PopupSize;
  dismissible: boolean;
  delaySeconds: number;
  buttons: PopupButton[];
}
// --------------------------

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'post' | 'system' | 'admin' | 'friend_request' | 'security' | 'points';
  icon?: string; 
  createdAt: string;
  scheduledAt?: string; 
  isRead: boolean;
  link?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  images: string[];
  createdAt: string;
}

// --- New Post Interfaces ---
export interface PostComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
  likes: string[]; // User IDs
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  isVerified?: boolean;
  title: string;
  description: string;
  images: string[];
  createdAt: string;
  expiresAt: string;
  likes: string[]; // User IDs
  fakeLikes?: number; // Admin override
  comments: PostComment[];
}
// ---------------------------

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard' | 'Impossible';
  timeLimit: number;
}

export interface QuestionProgress {
  currentDifficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard' | 'Impossible';
  questionsAnswered: number;
  correctAnswers: number;
  history: string[]; // IDs of answered questions
}

export interface QuestionChallenge {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  difficulty: string; // 'Easy' | ...
  questionCount: number;
  status: 'pending' | 'accepted' | 'active' | 'finished';
  senderScore: { correct: number; wrong: number; finished: boolean };
  receiverScore: { correct: number; wrong: number; finished: boolean };
  createdAt: string;
}

export interface User {
  id: string;
  numericId?: string;
  displayName: string;
  username: string;
  email?: string;
  emailVerified?: boolean; 
  bio?: string;
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
  verificationVideoUrl?: string;
  verificationReason?: string;
  subscriberCount?: string;
  avatar: string;
  banner?: string;
  followers: number;
  following: string[];
  blockedUsers?: string[]; 
  hiddenChats?: string[];
  role: UserRole;
  level?: number;
  adminPermissions?: AdminPermissions;
  adminCode?: string;
  channelUrl?: string;
  isBlocked?: boolean;
  blockedReason?: string;
  blockedUntil?: string;
  createdAt?: string;
  privacySettings?: PrivacySettings;
  // Security Features
  loginCount?: number;
  needsIdentityConfirmation?: boolean;
  confirmationExpires?: string;
  securityNotificationsEnabled?: boolean;
  lastKnownIP?: string;
  fcmToken?: string;
  securityCode?: string; // Encrypted or plain (depending on implementation level)
  securityCodeFrequency?: number; // 1 = Every time, 5 = Every 5 logins
  loginsSinceLastCode?: number; // Counter
  // Wallet & Points
  wallet: Wallet;
  lastOwnerGrant?: string;
  // Social Media
  socialLinks?: {
    youtube?: string;
    instagram?: string;
    facebook?: string;
    discord?: string;
  };
  // Questions Game
  questionProgress?: QuestionProgress;
}

export interface PrivacySettings {
  showInSearch: boolean;
  showFollowersList: boolean;
  showJoinDate: boolean;
  privateCollections: boolean;
  showOnlineStatus: boolean; 
  messagingPermission: 'everyone' | 'followers' | 'friends' | 'none';
}

export interface MinecraftServer {
  id: string;
  title: string;
  description: string;
  ip: string;
  port: string;
  version: string;
  type: ModType;
  serverType?: string;
  publisherId: string;
  publisherName: string;
  publisherAvatar: string;
  createdAt: string;
  isVerified?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface ModStats {
  views: number; 
  uniqueViews: number; 
  downloads: number;
  likes: number;
  dislikes: number;
  ratingCount: number;
  averageRating: number;
  totalRatingScore: number;
}

export interface Mod {
  id: string;
  shareCode: string; 
  title: string;
  description: string;
  publisherId: string;
  publisherName: string;
  publisherAvatar: string;
  type: ModType;
  category: string;
  minecraftVersion: string;
  mainImage: string;
  additionalImages?: string[];
  downloadUrl: string;
  fileSize: string;
  stats: ModStats;
  fakeStats?: {
    views?: number;
    downloads?: number;
    likes?: number;
  };
  createdAt: string;
  comments?: Comment[];
  likedBy?: string[];
  dislikedBy?: string[];
  ratedBy?: Record<string, number>;
  youtubeUrl?: string;
  isVerified?: boolean;
  price?: number;
}

export interface GameInvite {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  mcName: string;
  version: string;
  createdAt: string;
  expiresAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}

export interface StaffMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: string;
  text: string;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
}

export interface ModReport {
  id: string;
  modId: string;
  modTitle: string;
  publisherId: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  status: 'pending' | 'reviewed';
  createdAt: string;
}

export interface Complaint {
  id: string;
  userId: string;
  username: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  numberOfWinners: number;
  participants: string[]; // User IDs
  status: 'active' | 'ended';
  winners?: { userId: string; displayName: string; avatar: string }[];
  createdAt: string;
}

export type View = 'home' | 'servers' | 'upload' | 'profile' | 'stats' | 'details' | 'login' | 'downloads' | 'settings' | 'edit-profile' | 'admin' | 'notifications' | 'friends' | 'join-creators' | 'news' | 'earnings' | 'contests' | 'questions';