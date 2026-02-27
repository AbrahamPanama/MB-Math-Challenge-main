import {
  Sparkles,
  CalendarCheck,
  ShieldCheck,
} from 'lucide-react';
import type { User, Skill, UserProgress, PracticeMode } from './types';

export const mockUser: User = {
  id: 'user_1',
  name: 'Alex',
  avatarUrl: 'https://picsum.photos/seed/123/40/40',
};

export const mockSkills: Skill[] = [
  {
    id: 'multiplication',
    nameKey: 'skillsData.multiplication.name',
    descriptionKey: 'skillsData.multiplication.description',
    mastery: { stars: 2, progress: 75 },
  },
  {
    id: 'addition_subtraction',
    nameKey: 'skillsData.addition_subtraction.name',
    descriptionKey: 'skillsData.addition_subtraction.description',
    mastery: { stars: 3, progress: 100 },
  },
  {
    id: 'fractions',
    nameKey: 'skillsData.fractions.name',
    descriptionKey: 'skillsData.fractions.description',
    mastery: { stars: 1, progress: 40 },
  },
  {
    id: 'divisibility',
    nameKey: 'skillsData.divisibility.name',
    descriptionKey: 'skillsData.divisibility.description',
    mastery: { stars: 0, progress: 15 },
  },
];

export const mockUserProgress: UserProgress = {
  xp: 12540,
  streak: 14,
  skillsMastered: 1,
  weeklyProgress: [
    { day: 'Mon', xp: 150 },
    { day: 'Tue', xp: 220 },
    { day: 'Wed', xp: 180 },
    { day: 'Thu', xp: 300 },
    { day: 'Fri', xp: 250 },
    { day: 'Sat', xp: 120 },
    { day: 'Sun', xp: 80 },
  ],
};

export const practiceModes: PracticeMode[] = [
    {
        id: 'smart-practice',
        titleKey: 'practiceModes.smartPractice.title',
        descriptionKey: 'practiceModes.smartPractice.description',
        icon: Sparkles,
        href: '/practice?mode=smart-practice'
    },
    {
        id: 'daily-mission',
        titleKey: 'practiceModes.dailyMission.title',
        descriptionKey: 'practiceModes.dailyMission.description',
        icon: CalendarCheck,
        href: '/practice?mode=daily-mission'
    },
    {
        id: 'unit-boss',
        titleKey: 'practiceModes.unitBoss.title',
        descriptionKey: 'practiceModes.unitBoss.description',
        icon: ShieldCheck,
        href: '/practice?mode=unit-boss'
    }
]
