import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ThemeMode = 'light' | 'dark';
const TEMPLATE_KEYS = [
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
type TemplateKey = (typeof TEMPLATE_KEYS)[number];
type SectionKey = 'personal' | 'summary' | 'experience' | 'projects' | 'education' | 'skills';

type ExperienceEntry = {
  company: string;
  position: string;
  period: string;
  highlights: string;
};

type EducationEntry = {
  school: string;
  degree: string;
  year: string;
};

type ProjectEntry = {
  name: string;
  description: string;
  link: string;
  technologiesUsed: string;
};

type PersonalDetails = {
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

type ResumeState = {
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

type AtsReport = {
  score: number;
  verdict: string;
  strengths: string[];
  warnings: string[];
};

type UserSession = {
  username: string;
  displayName: string;
};

type AuthMode = 'sign-in' | 'sign-up';

type AuthUserRecord = {
  username: string;
  email: string;
  password: string;
  displayName: string;
  createdAt: string;
};

type ResumeProfile = {
  id: string;
  name: string;
  updatedAt: string;
  resume: ResumeState;
};

type WorkspaceState = {
  profiles: ResumeProfile[];
  activeProfileId: string;
};

const STORAGE_KEY = 'br-resume-state';
const WORKSPACE_KEY = 'br-resume-workspace';
const USERS_KEY = 'br-resume-users';
const SESSION_KEY = 'br-resume-session';
const SECTION_ORDER: SectionKey[] = [
  'personal',
  'summary',
  'experience',
  'projects',
  'education',
  'skills',
];
const TWO_SIDE_TEMPLATES: TemplateKey[] = [
  'right-side',
  'right-side-pro',
  'executive',
  'academic',
  'portfolio',
];
const DEFAULT_ACCENT_COLOR = '#4f46e5';
const DEFAULT_SIDEBAR_COLOR = '#cbd5e1';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);

  protected readonly title = 'BUILD YOUR RESUME';
  protected readonly templateOptions: Array<{
    key: TemplateKey;
    label: string;
    description: string;
    layout: 'single' | 'two-side';
  }> = [
    {
      key: 'classic',
      label: 'Classic',
      description: 'Clean, straightforward, ATS-safe layout.',
      layout: 'single',
    },
    {
      key: 'modern',
      label: 'Modern',
      description: 'Sharper spacing with a stronger visual hierarchy.',
      layout: 'single',
    },
    {
      key: 'right-side',
      label: 'Right Side',
      description: 'Split layout with the sidebar on the right.',
      layout: 'two-side',
    },
    {
      key: 'executive',
      label: 'Executive',
      description: 'Formal split layout with strong section separation.',
      layout: 'two-side',
    },
    {
      key: 'creative',
      label: 'Creative',
      description: 'Visual emphasis with a bold accent block.',
      layout: 'single',
    },
    {
      key: 'balanced',
      label: 'Balanced',
      description: 'Refined single-column layout with lighter spacing.',
      layout: 'single',
    },
    {
      key: 'right-side-pro',
      label: 'Right Side Pro',
      description: 'Split layout with a stronger right-hand sidebar.',
      layout: 'two-side',
    },
    {
      key: 'academic',
      label: 'Academic',
      description: 'Publication-friendly split structure.',
      layout: 'two-side',
    },
    {
      key: 'minimalist',
      label: 'Minimalist',
      description: 'Stripped-down layout with almost no chrome.',
      layout: 'single',
    },
    {
      key: 'portfolio',
      label: 'Portfolio',
      description: 'Two-side project-forward layout for design and product roles.',
      layout: 'two-side',
    },
  ];
  protected readonly sectionLabels: Record<SectionKey, string> = {
    personal: 'Personal details',
    summary: 'Summary',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    skills: 'Skills',
  };
  protected readonly sectionDescriptions: Record<SectionKey, string> = {
    personal: 'Contact and identity fields.',
    summary: 'Short profile statement.',
    experience: 'Work history and impact.',
    projects: 'Portfolio projects and links.',
    education: 'Academic background.',
    skills: 'Comma separated skills list.',
  };

  protected isAuthenticated = false;
  protected loginUsername = '';
  protected loginEmail = '';
  protected loginPassword = '';
  protected loginConfirmPassword = '';
  protected authMode: AuthMode = 'sign-in';
  protected authError = '';
  protected currentUser: UserSession | null = null;
  protected profiles: ResumeProfile[] = [];
  protected activeProfileId = '';
  protected activeProfileNameDraft = '';
  protected resume: ResumeState = this.createDefaultResume();
  protected atsReport: AtsReport = this.buildAtsReport(this.resume);
  protected draggingSection: SectionKey | null = null;
  protected dragArmedSection: SectionKey | null = null;
  protected importError = '';
  protected lastSavedLabel = '';

  ngOnInit(): void {
    if (this.browser) {
      this.restoreSession();
      if (this.isAuthenticated) {
        this.restoreWorkspace();
      }
      this.updateDerivedState();
    }
  }

  get fullName(): string {
    return [this.resume.personal.firstName, this.resume.personal.surname]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  get skillList(): string[] {
    return this.resume.skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  get orderedSections(): SectionKey[] {
    return this.resume.sectionOrder;
  }

  get templateClass(): string {
    return `template-${this.resume.template}`;
  }

  get themeClass(): string {
    return `theme-${this.resume.theme}`;
  }

  get accentStyle(): Record<string, string> {
    return {
      '--accent': this.resume.accentColor,
      '--accent-soft': this.mixAccent(this.resume.accentColor, 18),
      '--chip': this.mixAccent(this.resume.accentColor, 14),
      '--chip-text': this.resume.accentColor,
      '--sidebar-color': this.resume.sidebarColor,
      '--sidebar-soft': this.mixAccent(this.resume.sidebarColor, 16),
      '--sidebar-gradient': `linear-gradient(180deg, ${this.resume.sidebarColor} 0%, ${this.mixAccent(this.resume.sidebarColor, 16)} 100%)`,
    };
  }

  get isTwoSideTemplate(): boolean {
    return TWO_SIDE_TEMPLATES.includes(this.resume.template);
  }

  get activeProfile(): ResumeProfile | null {
    return this.profiles.find((profile) => profile.id === this.activeProfileId) ?? null;
  }

  get activeProfileLabel(): string {
    return this.activeProfile?.name || 'Resume profile';
  }

  protected persistState(): void {
    this.updateDerivedState();

    if (!this.browser) {
      return;
    }

    const activeProfile = this.activeProfile;
    if (activeProfile) {
      activeProfile.name = this.activeProfileNameDraft.trim() || activeProfile.name;
      activeProfile.resume = this.resume;
      activeProfile.updatedAt = new Date().toISOString();
    }

    this.saveWorkspace();
    this.lastSavedLabel = `${this.activeProfileLabel} saved locally`;
  }

  protected setAuthMode(mode: AuthMode): void {
    this.authMode = mode;
    this.authError = '';
  }

  protected signIn(): void {
    const identifier = this.loginUsername.trim();
    const password = this.loginPassword.trim();

    if (!identifier || !password) {
      this.authError = 'Enter a username or email and password.';
      return;
    }

    const users = this.loadUsers();
    const existingUser = users.find(
      (user) => user.username === identifier || user.email === identifier,
    );

    if (!existingUser) {
      this.authError = 'No account found. Switch to sign up to create one.';
      return;
    }

    if (existingUser.password !== password) {
      this.authError = 'Invalid password for this user.';
      return;
    }

    this.finishAuth(existingUser);
  }

  protected signUp(): void {
    const username = this.loginUsername.trim();
    const email = this.loginEmail.trim();
    const password = this.loginPassword.trim();
    const confirmPassword = this.loginConfirmPassword.trim();

    if (!username || !email || !password || !confirmPassword) {
      this.authError = 'Enter a username, email, password, and confirm the password.';
      return;
    }

    if (password !== confirmPassword) {
      this.authError = 'Passwords do not match.';
      return;
    }

    const users = this.loadUsers();
    const existingUser = users.find(
      (user) => user.username === username || user.email === email,
    );

    if (existingUser) {
      this.authError = 'An account already exists with that username or email.';
      return;
    }

    const newUser = this.createUserRecord(
      username,
      email,
      password,
      this.createDisplayName(username),
    );
    users.push(newUser);
    this.saveUsers(users);
    this.lastSavedLabel = 'Created a new local account';

    this.finishAuth(newUser);
  }

  protected login(): void {
    if (this.authMode === 'sign-up') {
      this.signUp();
      return;
    }

    this.signIn();
  }

  private finishAuth(user: AuthUserRecord): void {
    const authenticatedUser: UserSession = {
      username: user.username,
      displayName: user.displayName,
    };

    this.isAuthenticated = true;
    this.currentUser = authenticatedUser;
    this.authError = '';

    if (this.browser) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(this.currentUser));
    }

    this.restoreWorkspace();
    this.updateDerivedState();
  }

  protected logout(): void {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.profiles = [];
    this.activeProfileId = '';
    this.activeProfileNameDraft = '';
    this.resume = this.createDefaultResume();
    this.atsReport = this.buildAtsReport(this.resume);
    this.authMode = 'sign-in';

    if (this.browser) {
      window.localStorage.removeItem(SESSION_KEY);
    }
    this.loginPassword = '';
    this.loginEmail = '';
    this.loginConfirmPassword = '';
  }

  protected createProfile(): void {
    const profile = this.createResumeProfile(`Resume ${this.profiles.length + 1}`, this.createDefaultResume());
    this.profiles = [...this.profiles, profile];
    this.activeProfileId = profile.id;
    this.resume = profile.resume;
    this.activeProfileNameDraft = profile.name;
    this.persistState();
  }

  protected selectProfile(profileId: string): void {
    this.persistState();

    const profile = this.profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      return;
    }

    this.activeProfileId = profile.id;
    this.resume = profile.resume;
    this.activeProfileNameDraft = profile.name;
    this.atsReport = this.buildAtsReport(this.resume);
  }

  protected renameActiveProfile(name: string): void {
    const nextName = name.trim() || this.activeProfileLabel;
    this.activeProfileNameDraft = nextName;

    const activeProfile = this.activeProfile;
    if (!activeProfile) {
      return;
    }

    activeProfile.name = nextName;
    activeProfile.updatedAt = new Date().toISOString();
    this.persistState();
  }

  protected deleteActiveProfile(): void {
    if (this.profiles.length <= 1) {
      this.profiles = [this.createResumeProfile('Resume 1', this.createDefaultResume())];
      this.activeProfileId = this.profiles[0].id;
      this.resume = this.profiles[0].resume;
      this.activeProfileNameDraft = this.profiles[0].name;
      this.persistState();
      return;
    }

    this.profiles = this.profiles.filter((profile) => profile.id !== this.activeProfileId);
    const nextProfile = this.profiles[0];
    this.activeProfileId = nextProfile.id;
    this.resume = nextProfile.resume;
    this.activeProfileNameDraft = nextProfile.name;
    this.persistState();
  }

  protected setTemplate(template: TemplateKey): void {
    this.resume.template = template;
    this.persistState();
  }

  protected setAccentColor(color: string): void {
    this.resume.accentColor = color;
    this.persistState();
  }

  protected setSidebarColor(color: string): void {
    this.resume.sidebarColor = color;
    this.persistState();
  }

  protected downloadResume(): void {
    if (!this.browser) {
      return;
    }

    void this.buildResumePdf();
  }

  protected toggleTheme(): void {
    this.resume.theme = this.resume.theme === 'light' ? 'dark' : 'light';
    this.persistState();
  }

  protected addExperience(): void {
    this.resume.experience = [...this.resume.experience, this.createEmptyExperienceEntry()];
    this.persistState();
  }

  protected removeExperience(index: number): void {
    if (this.resume.experience.length === 1) {
      return;
    }

    this.resume.experience = this.resume.experience.filter((_, current) => current !== index);
    this.persistState();
  }

  protected addEducation(): void {
    this.resume.education = [...this.resume.education, this.createEmptyEducationEntry()];
    this.persistState();
  }

  protected removeEducation(index: number): void {
    if (this.resume.education.length === 1) {
      return;
    }

    this.resume.education = this.resume.education.filter((_, current) => current !== index);
    this.persistState();
  }

  protected addProject(): void {
    this.resume.projects = [...this.resume.projects, this.createEmptyProjectEntry()];
    this.persistState();
  }

  protected removeProject(index: number): void {
    if (this.resume.projects.length === 1) {
      return;
    }

    this.resume.projects = this.resume.projects.filter((_, current) => current !== index);
    this.persistState();
  }

  protected clearPhoto(): void {
    this.resume.personal.photoDataUrl = '';
    this.persistState();
  }

  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.resume.personal.photoDataUrl = typeof reader.result === 'string' ? reader.result : '';
      this.persistState();
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  protected onSectionDragHandleDown(section: SectionKey): void {
    this.dragArmedSection = section;
  }

  protected onSectionDragStart(section: SectionKey, event: DragEvent): void {
    if (this.dragArmedSection !== section) {
      event.preventDefault();
      return;
    }

    this.draggingSection = section;
    event.dataTransfer?.setData('text/plain', section);
  }

  protected onSectionDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  protected onSectionDragEnd(): void {
    this.draggingSection = null;
    this.dragArmedSection = null;
  }

  protected onSectionDrop(targetSection: SectionKey): void {
    if (!this.draggingSection || this.draggingSection === targetSection) {
      return;
    }

    const nextOrder = [...this.resume.sectionOrder];
    const fromIndex = nextOrder.indexOf(this.draggingSection);
    const toIndex = nextOrder.indexOf(targetSection);

    if (fromIndex === -1 || toIndex === -1) {
      this.draggingSection = null;
      return;
    }

    nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, this.draggingSection);
    this.resume.sectionOrder = nextOrder;
    this.draggingSection = null;
    this.dragArmedSection = null;
    this.persistState();
  }

  private updateDerivedState(): void {
    this.atsReport = this.buildAtsReport(this.resume);
  }

  private restoreSession(): void {
    if (!this.browser) {
      return;
    }

    const saved = window.localStorage.getItem(SESSION_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Partial<UserSession>;
      if (typeof parsed.username === 'string' && parsed.username) {
        const users = this.loadUsers();
        const user = users.find((entry) => entry.username === parsed.username);

        if (user) {
          this.currentUser = {
            username: user.username,
            displayName: user.displayName,
          };
          this.isAuthenticated = true;
        } else {
          window.localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }

  private restoreWorkspace(): void {
    if (!this.browser) {
      return;
    }

    const workspaceKey = this.getWorkspaceKey();
    if (!workspaceKey) {
      return;
    }

    const saved = window.localStorage.getItem(workspaceKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<WorkspaceState>;
        const profiles = Array.isArray(parsed.profiles)
          ? parsed.profiles
              .map((profile) => this.normalizeProfile(profile))
              .filter((profile): profile is ResumeProfile => profile !== null)
          : [];

        this.profiles = profiles.length ? profiles : [this.createResumeProfile('Resume 1', this.createDefaultResume())];
        this.activeProfileId =
          typeof parsed.activeProfileId === 'string' && this.profiles.some((profile) => profile.id === parsed.activeProfileId)
            ? parsed.activeProfileId
            : this.profiles[0].id;
        const activeProfile = this.activeProfile;
        if (activeProfile) {
          this.resume = activeProfile.resume;
          this.activeProfileNameDraft = activeProfile.name;
          this.lastSavedLabel = `Loaded ${activeProfile.name}`;
        }
        return;
      } catch {
        window.localStorage.removeItem(workspaceKey);
      }
    }

    const legacyKey = `${STORAGE_KEY}:${this.currentUser?.username ?? ''}`;
    const legacy = window.localStorage.getItem(legacyKey) ?? window.localStorage.getItem(STORAGE_KEY);
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy) as unknown;
        const imported = this.normalizeImportedState(parsed);
        this.resume = imported;
        this.profiles = [this.createResumeProfile('Resume 1', imported)];
        this.activeProfileId = this.profiles[0].id;
        this.activeProfileNameDraft = this.profiles[0].name;
        this.saveWorkspace();
        this.lastSavedLabel = 'Loaded from local storage';
        return;
      } catch {
        window.localStorage.removeItem(legacyKey);
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    const profile = this.createResumeProfile('Resume 1', this.createDefaultResume());
    this.profiles = [profile];
    this.activeProfileId = profile.id;
    this.resume = profile.resume;
    this.activeProfileNameDraft = profile.name;
    this.saveWorkspace();
    this.lastSavedLabel = '';
  }

  private saveWorkspace(): void {
    if (!this.browser) {
      return;
    }

    const workspaceKey = this.getWorkspaceKey();
    if (!workspaceKey) {
      return;
    }

    const payload: WorkspaceState = {
      profiles: this.profiles,
      activeProfileId: this.activeProfileId,
    };

    window.localStorage.setItem(workspaceKey, JSON.stringify(payload));
  }

  private getWorkspaceKey(): string {
    return this.currentUser?.username ? `${WORKSPACE_KEY}:${this.currentUser.username}` : '';
  }

  private loadUsers(): AuthUserRecord[] {
    if (!this.browser) {
      return [];
    }

    const saved = window.localStorage.getItem(USERS_KEY);
    if (!saved) {
      return [];
    }

    try {
      const parsed = JSON.parse(saved) as unknown;
      return Array.isArray(parsed)
        ? parsed
            .map((item) => this.normalizeUserRecord(item))
            .filter((item): item is AuthUserRecord => item !== null)
        : [];
    } catch {
      return [];
    }
  }

  private saveUsers(users: AuthUserRecord[]): void {
    if (!this.browser) {
      return;
    }

    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  private normalizeUserRecord(value: unknown): AuthUserRecord | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Partial<AuthUserRecord>;
    if (
      typeof candidate.username !== 'string' ||
      typeof candidate.password !== 'string' ||
      typeof candidate.displayName !== 'string' ||
      typeof candidate.createdAt !== 'string'
    ) {
      return null;
    }

    return {
      username: candidate.username,
      email:
        typeof candidate.email === 'string' && candidate.email.trim()
          ? candidate.email
          : candidate.username,
      password: candidate.password,
      displayName: candidate.displayName,
      createdAt: candidate.createdAt,
    };
  }

  private createUserRecord(
    username: string,
    email: string,
    password: string,
    displayName: string,
  ): AuthUserRecord {
    return {
      username,
      email,
      password,
      displayName,
      createdAt: new Date().toISOString(),
    };
  }

  private createDisplayName(username: string): string {
    const localPart = username.split('@')[0] || username;
    return localPart
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private createResumeProfile(name: string, resume: ResumeState): ResumeProfile {
    return {
      id: this.createId(),
      name,
      updatedAt: new Date().toISOString(),
      resume,
    };
  }

  private normalizeProfile(value: unknown): ResumeProfile | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Partial<ResumeProfile>;
    return {
      id: typeof candidate.id === 'string' ? candidate.id : this.createId(),
      name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name : 'Resume',
      updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
      resume: this.normalizeImportedState(candidate.resume),
    };
  }

  private createId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private createDefaultResume(): ResumeState {
    return {
      personal: this.createEmptyPersonalDetails(),
      summary: '',
      experience: [],
      education: [],
      projects: [],
      skills: '',
      template: 'classic',
      theme: 'light',
      accentColor: DEFAULT_ACCENT_COLOR,
      sidebarColor: DEFAULT_SIDEBAR_COLOR,
      sectionOrder: [...SECTION_ORDER],
    };
  }

  private normalizeImportedState(raw: unknown): ResumeState {
    const candidate = this.extractResumeCandidate(raw);

    return {
      personal: {
        firstName: this.asString(candidate?.personal?.firstName, ''),
        surname: this.asString(candidate?.personal?.surname, ''),
        role: this.asString(candidate?.personal?.role, ''),
        email: this.asString(candidate?.personal?.email, ''),
        phone: this.asString(candidate?.personal?.phone, ''),
        location: this.asString(candidate?.personal?.location, ''),
        linkedin: this.asString(candidate?.personal?.linkedin, ''),
        github: this.asString(candidate?.personal?.github, ''),
        photoDataUrl: this.asString(candidate?.personal?.photoDataUrl, ''),
      },
      summary: this.asString(candidate?.summary, ''),
      experience: this.normalizeExperience(candidate?.experience),
      education: this.normalizeEducation(candidate?.education),
      projects: this.normalizeProjects(candidate?.projects),
      skills: this.asString(candidate?.skills, ''),
      template: this.normalizeTemplate(candidate?.template),
      theme: this.normalizeTheme(candidate?.theme),
      accentColor: this.normalizeAccentColor(candidate?.accentColor),
      sidebarColor: this.normalizeSidebarColor(candidate?.sidebarColor),
      sectionOrder: this.normalizeSectionOrder(candidate?.sectionOrder),
    };
  }

  private extractResumeCandidate(raw: unknown): Partial<ResumeState> | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const candidate = raw as { resume?: Partial<ResumeState> };
    return candidate.resume && typeof candidate.resume === 'object'
      ? candidate.resume
      : (raw as Partial<ResumeState>);
  }

  private normalizeExperience(value: unknown): ExperienceEntry[] {
    const entries = Array.isArray(value) ? value : [];
    return this.normalizeCollection(entries, this.createEmptyExperienceEntry());
  }

  private normalizeEducation(value: unknown): EducationEntry[] {
    const entries = Array.isArray(value) ? value : [];
    return this.normalizeCollection(entries, this.createEmptyEducationEntry());
  }

  private normalizeProjects(value: unknown): ProjectEntry[] {
    const entries = Array.isArray(value) ? value : [];
    return this.normalizeCollection(entries, this.createEmptyProjectEntry());
  }

  private normalizeCollection<T extends Record<string, string>>(
    value: unknown[],
    fallback: T,
  ): T[] {
    return value.map((item) => {
      const next: Record<string, string> = {};
      for (const key of Object.keys(fallback)) {
        next[key] = this.asString((item as Record<string, unknown>)?.[key], fallback[key]);
      }
      return next as T;
    });
  }

  private normalizeTemplate(value: unknown): TemplateKey {
    return TEMPLATE_KEYS.includes(value as TemplateKey) ? (value as TemplateKey) : 'classic';
  }

  private normalizeTheme(value: unknown): ThemeMode {
    return value === 'dark' ? 'dark' : 'light';
  }

  private normalizeAccentColor(value: unknown): string {
    return this.isHexColor(value) ? value.toLowerCase() : DEFAULT_ACCENT_COLOR;
  }

  private normalizeSidebarColor(value: unknown): string {
    return this.isHexColor(value) ? value.toLowerCase() : DEFAULT_SIDEBAR_COLOR;
  }

  private normalizeSectionOrder(value: unknown): SectionKey[] {
    const list = Array.isArray(value) ? value : [];
    const valid = list.filter((item): item is SectionKey =>
      SECTION_ORDER.includes(item as SectionKey),
    );
    return [...new Set([...valid, ...SECTION_ORDER])];
  }

  private asString(value: unknown, fallback: string): string {
    return typeof value === 'string' ? value : fallback;
  }

  private isHexColor(value: unknown): value is string {
    return typeof value === 'string' && /^#([0-9a-fA-F]{6})$/.test(value);
  }

  private mixAccent(color: string, alphaPercent: number): string {
    const normalized = this.isHexColor(color) ? color.slice(1) : DEFAULT_ACCENT_COLOR.slice(1);
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const alpha = Math.max(0, Math.min(100, alphaPercent)) / 100;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private async buildResumePdf(): Promise<void> {
    const element = document.querySelector('.preview') as HTMLElement | null;

    if (!element) {
      return;
    }

    const originalMaxHeight = element.style.maxHeight;
    const originalOverflow = element.style.overflow;
    let wrapper: HTMLDivElement | null = null;
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      await (document.fonts as FontFaceSet).ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const exportRoot = this.createInlineStyledClone(element);
      wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-100000px';
      wrapper.style.top = '0';
      wrapper.style.background = '#ffffff';
      wrapper.appendChild(exportRoot);
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(exportRoot, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        width: exportRoot.scrollWidth,
        height: exportRoot.scrollHeight,
      });

      const doc = new jsPDF({
        orientation: canvas.width >= canvas.height ? 'l' : 'p',
        unit: 'pt',
        format: [canvas.width, canvas.height],
        compress: true,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      doc.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      doc.save('br-resume.pdf');
    } finally {
      if (wrapper?.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
      element.style.maxHeight = originalMaxHeight;
      element.style.overflow = originalOverflow;
    }
  }

  private createInlineStyledClone(source: HTMLElement): HTMLElement {
    const clone = source.cloneNode(true) as HTMLElement;
    this.copyComputedStyles(source, clone);
    return clone;
  }

  private copyComputedStyles(source: Element, target: Element): void {
    if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) {
      return;
    }

    const computed = window.getComputedStyle(source);
    for (let index = 0; index < computed.length; index += 1) {
      const propertyName = computed.item(index);
      target.style.setProperty(
        propertyName,
        computed.getPropertyValue(propertyName),
        computed.getPropertyPriority(propertyName),
      );
    }

    const sourceChildren = Array.from(source.children);
    const targetChildren = Array.from(target.children);
    sourceChildren.forEach((child, index) => {
      const matchingTarget = targetChildren[index];
      if (matchingTarget) {
        this.copyComputedStyles(child, matchingTarget);
      }
    });
  }

  private buildAtsReport(state: ResumeState): AtsReport {
    let score = 100;
    const strengths: string[] = [];
    const warnings: string[] = [];

    if (state.personal.firstName && state.personal.surname) {
      strengths.push('Clear candidate name.');
    } else {
      score -= 10;
      warnings.push('Add both first name and surname.');
    }

    if (state.personal.email) {
      strengths.push('Email present.');
    } else {
      score -= 12;
      warnings.push('Email is missing.');
    }

    if (state.personal.phone) {
      strengths.push('Phone present.');
    } else {
      score -= 10;
      warnings.push('Phone number is missing.');
    }

    if (state.summary.trim()) {
      strengths.push('Summary included.');
    } else {
      score -= 8;
      warnings.push('Add a short summary.');
    }

    if (state.experience.some((entry) => entry.company || entry.position || entry.highlights)) {
      strengths.push('Work history included.');
    } else {
      score -= 15;
      warnings.push('Add at least one experience entry.');
    }

    if (state.skills.trim()) {
      strengths.push('Skills section included.');
    } else {
      score -= 8;
      warnings.push('Add a skills list.');
    }

    if (state.personal.photoDataUrl) {
      score -= 12;
      warnings.push('Photo can reduce ATS compatibility.');
    }

    if (state.template === 'modern') {
      score -= 5;
      warnings.push('Modern template is less conservative for ATS parsing.');
    }

    if (TWO_SIDE_TEMPLATES.includes(state.template)) {
      score -= 5;
      warnings.push('Split layouts are less ATS-conservative than the single-column templates.');
    }

    score = Math.max(0, Math.min(100, score));

    return {
      score,
      verdict: this.buildAtsVerdict(score),
      strengths,
      warnings,
    };
  }

  private createEmptyPersonalDetails(): PersonalDetails {
    return {
      firstName: '',
      surname: '',
      role: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      photoDataUrl: '',
    };
  }

  private createEmptyExperienceEntry(): ExperienceEntry {
    return {
      company: '',
      position: '',
      period: '',
      highlights: '',
    };
  }

  private createEmptyEducationEntry(): EducationEntry {
    return {
      school: '',
      degree: '',
      year: '',
    };
  }

  private createEmptyProjectEntry(): ProjectEntry {
    return {
      name: '',
      description: '',
      link: '',
      technologiesUsed: '',
    };
  }

  private buildAtsVerdict(score: number): string {
    if (score >= 85) {
      return 'Strong ATS fit';
    }

    if (score >= 70) {
      return 'Usable with improvements';
    }

    return 'Needs work';
  }
}
