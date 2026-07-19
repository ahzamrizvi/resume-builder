export type ThemeMode = 'light' | 'dark';

export const TEMPLATE_KEYS = [
  'classic',
  'modern',
  'right-side',
  'executive',
  'creative',
  'balanced',
  'right-side-pro',
  'academic',
  'minimalist',
  'portfolio',
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type SectionKey = 'personal' | 'summary' | 'experience' | 'projects' | 'education' | 'skills';

export type ExperienceEntry = {
  company: string;
  position: string;
  period: string;
  highlights: string;
};

export type EducationEntry = {
  school: string;
  degree: string;
  year: string;
};

export type ProjectEntry = {
  name: string;
  description: string;
  link: string;
  technologiesUsed: string;
};

export type PersonalDetails = {
  firstName: string;
  surname: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  photoDataUrl: string;
};

export type ResumeState = {
  personal: PersonalDetails;
  summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  skills: string;
  template: TemplateKey;
  theme: ThemeMode;
  accentColor: string;
  sidebarColor: string;
  sectionOrder: SectionKey[];
};

export type AtsReport = {
  score: number;
  verdict: string;
  strengths: string[];
  warnings: string[];
};

export type UserSession = {
  username: string;
  displayName: string;
};

export type AuthMode = 'sign-in' | 'sign-up';

export type AuthUserRecord = {
  username: string;
  email: string;
  password: string;
  displayName: string;
  createdAt: string;
};

export type ResumeProfile = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  resume: ResumeState;
};

export type DrawerItem = {
  label: string;
  icon: 'moon' | 'list' | 'logout';
  action: 'close' | 'go-to-list' | 'create-profile' | 'download' | 'toggle-theme' | 'switch-profile' | 'logout';
};

export type WorkspaceState = {
  profiles: ResumeProfile[];
  activeProfileId: string;
  activeScreen: 'list' | 'editor';
};

export const SECTION_ORDER: SectionKey[] = [
  'personal',
  'summary',
  'experience',
  'projects',
  'education',
  'skills',
];

export const TWO_SIDE_TEMPLATES: TemplateKey[] = [
  'right-side',
  'right-side-pro',
  'executive',
  'academic',
  'portfolio',
];

export const DEFAULT_ACCENT_COLOR = '#4f46e5';
export const DEFAULT_SIDEBAR_COLOR = '#cbd5e1';
