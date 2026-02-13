
import React from 'react';
import { Box, FileText, Globe, Package, LayoutGrid, TrendingUp, Users, PlusCircle, BarChart3, LogOut, Search, Map as MapIcon } from 'lucide-react';
import { ModType, Question } from '../types';

export const MOD_TYPES: { value: ModType; label: string; icon: React.ReactNode }[] = [
  { value: 'Mod', label: 'مود', icon: <Box size={18} /> },
  { value: 'Resource Pack', label: 'ريسورس باك', icon: <Package size={18} /> },
  { value: 'Map', label: 'خريطة', icon: <MapIcon size={18} /> },
  { value: 'Modpack', label: 'مود باك', icon: <FileText size={18} /> },
];

export const CATEGORIES = [
  'مغامرة', 'تقني', 'سحر', 'زينة', 'تحسين الأداء', 'واقعي', 'PvP'
];

export const APP_THEME = {
  primary: 'bg-lime-600 hover:bg-lime-700 text-white',
  secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100',
  accent: 'text-lime-400',
  card: 'bg-zinc-900 border border-zinc-800',
};

export const QUESTION_BANK: Record<string, Question[]> = {
  'Easy': [
    { id: 'Easy_1', text: 'Which item is used to craft a torch?', options: ['Coal & Stick', 'Iron & Stick', 'Gold & Stick', 'Diamond & Stick'], correctIndex: 0, difficulty: 'Easy', timeLimit: 10 },
    { id: 'Easy_2', text: 'What is the color of an Emerald?', options: ['Red', 'Blue', 'Green', 'Yellow'], correctIndex: 2, difficulty: 'Easy', timeLimit: 10 },
    { id: 'Easy_3', text: 'Which mob explodes?', options: ['Zombie', 'Creeper', 'Skeleton', 'Spider'], correctIndex: 1, difficulty: 'Easy', timeLimit: 10 },
    { id: 'Easy_4', text: 'How many iron ingots to make a bucket?', options: ['2', '3', '4', '5'], correctIndex: 1, difficulty: 'Easy', timeLimit: 10 },
    { id: 'Easy_5', text: 'Can you sleep in the Nether?', options: ['Yes', 'No'], correctIndex: 1, difficulty: 'Easy', timeLimit: 10 },
  ],
  'Medium': [
    { id: 'Medium_1', text: 'Which block cannot be moved by pistons?', options: ['Obsidian', 'Dirt', 'Stone', 'Wood'], correctIndex: 0, difficulty: 'Medium', timeLimit: 12 },
    { id: 'Medium_2', text: 'How many health points does a player have?', options: ['10', '15', '20', '25'], correctIndex: 2, difficulty: 'Medium', timeLimit: 12 },
    { id: 'Medium_3', text: 'What ingredient is needed for brewing potions?', options: ['Nether Wart', 'Wheat', 'Carrot', 'Potato'], correctIndex: 0, difficulty: 'Medium', timeLimit: 12 },
  ],
  'Hard': [
    { id: 'Hard_1', text: 'How many obsidian blocks for a nether portal (minimum)?', options: ['8', '10', '12', '14'], correctIndex: 1, difficulty: 'Hard', timeLimit: 15 },
    { id: 'Hard_2', text: 'Which enchantment makes you swim faster?', options: ['Depth Strider', 'Aqua Affinity', 'Respiration', 'Frost Walker'], correctIndex: 0, difficulty: 'Hard', timeLimit: 15 },
  ],
  'Very Hard': [
    { id: 'VHard_1', text: 'What is the blast resistance of Bedrock?', options: ['3,600,000', '18,000,000', 'Infinity', '6,000'], correctIndex: 0, difficulty: 'Very Hard', timeLimit: 20 },
  ],
  'Impossible': [
    { id: 'Imp_1', text: 'When was Minecraft officially released (1.0)?', options: ['Nov 18, 2011', 'May 17, 2009', 'Dec 20, 2010', 'Oct 7, 2011'], correctIndex: 0, difficulty: 'Impossible', timeLimit: 10 },
  ]
};