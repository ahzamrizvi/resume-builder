import { isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { Router } from '@angular/router';

import {
  AuthMode,
  AuthUserRecord,
  AtsReport,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_SIDEBAR_COLOR,
  DrawerItem,
  EducationEntry,
  ExperienceEntry,
  PersonalDetails,
  ProjectEntry,
  ResumeProfile,
  ResumeState,
  SECTION_ORDER,
  SectionKey,
  TEMPLATE_KEYS,
  TemplateKey,
  ThemeMode,
  TWO_SIDE_TEMPLATES,
  UserSession,
  WorkspaceState,
} from '../models/resume.models';
import { ResumeStorageService } from './resume-storage.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'br-resume-state';

@Injectable({ providedIn: 'root' })
export class ResumeStateService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly resumeStorage = inject(ResumeStorageService);
  private readonly auth = inject(AuthService);
  protected readonly router = inject(Router);
  private readonly apiBaseUrl = environment.apiUrl;
  private readonly workspaceApiUrl = this.apiBaseUrl ? `${this.apiBaseUrl}/api/workspace` : '/api/workspace';

  public readonly title = 'BUILD YOUR RESUME';
  public readonly templateOptions: Array<{
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
  ];
  public readonly sectionLabels: Record<SectionKey, string> = {
    personal: 'Personal details',
    summary: 'Summary',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    skills: 'Skills',
  };
  public readonly sectionDescriptions: Record<SectionKey, string> = {
    personal: 'Contact and identity fields.',
    summary: 'Short profile statement.',
    experience: 'Work history and impact.',
    projects: 'Portfolio projects and links.',
    education: 'Academic background.',
    skills: 'Comma separated skills list.',
  };

  public loginUsername = signal('');
  public loginEmail = signal('');
  public loginPassword = signal('');
  public loginConfirmPassword = signal('');
  public authMode = signal<AuthMode>('sign-in');
  public authError = signal('');
  public currentUser: UserSession | null = null;
  public profiles = signal<ResumeProfile[]>([]);
  public activeProfileId = signal('');
  public activeProfileNameDraft = signal('');
  public isHeaderMenuOpen = signal(false);
  public activeScreen = signal<'list' | 'editor'>('list');
  public resume: ResumeState = this.createDefaultResume();
  public atsReport: AtsReport = this.buildAtsReport(this.resume);
  public draggingSection = signal<SectionKey | null>(null);
  public dragArmedSection = signal<SectionKey | null>(null);
  public importError = signal('');
  public lastSavedLabel = signal('');
  public saveToastMessage = signal('');
  public isSaveToastVisible = signal(false);
  public previewScale = signal(1);
  public previewPages = signal<Array<{ sections: SectionKey[] }>>([]);
  private saveToastTimer: ReturnType<typeof setTimeout> | null = null;
  public isDrawerSettingsOpen = signal(false);
  public readonly drawerItems: DrawerItem[] = [
    { label: 'All Resume', icon: 'list', action: 'go-to-list' },
    { label: 'Logout', icon: 'logout', action: 'logout' },
  ];

  public async initialize(): Promise<void> {
    if (this.browser) {
      await this.auth.initialize();
      if (this.auth.session) {
        await this.restoreWorkspace();
      }
      this.updateDerivedState();
      this.updatePreviewScale();
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
    return this.profiles().find((profile) => profile.id === this.activeProfileId()) ?? null;
  }

  get activeProfileLabel(): string {
    return this.activeProfile?.name || 'Resume profile';
  }

  get currentUserName(): string {
    return (this.auth.session?.username || '').toLowerCase();
  }

  get currentUserAvatar(): string {
    const source = this.auth.session?.username || this.auth.session?.displayName || 'U';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  public get session(): UserSession | null {
    return this.auth.session;
  }

  get hasProfiles(): boolean {
    return this.profiles().length > 0;
  }

  public persistState(statusLabel?: string): void {
    this.updateDerivedState();

    if (!this.browser) {
      return;
    }

    const activeProfile = this.activeProfile;
    if (activeProfile) {
      activeProfile.name = this.activeProfileNameDraft().trim() || activeProfile.name;
      activeProfile.resume = this.resume;
      activeProfile.updatedAt = new Date().toISOString();
    }

    this.saveWorkspace();
    this.lastSavedLabel.set(activeProfile ? statusLabel ?? `${this.activeProfileLabel} saved locally` : '');
    if (statusLabel) {
      this.showSaveToast(statusLabel);
    }
  }

  public openResumeList(): void {
    this.activeScreen.set('list');
    void this.router.navigateByUrl('/resumes');
    this.closeHeaderMenu();
  }

  public profileScore(profile: ResumeProfile): number {
    return this.buildAtsReport(profile.resume).score;
  }

  public profileDisplayName(profile: ResumeProfile): string {
    const fullName = [profile.resume.personal.firstName, profile.resume.personal.surname]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName || 'Untitled';
  }

  public profileScoreClass(profile: ResumeProfile): string {
    const score = this.profileScore(profile);
    return score >= 85 ? 'good' : score < 60 ? 'warn' : 'neutral';
  }

  protected profileStrength(profile: ResumeProfile): string {
    return `${this.profileScore(profile)}`;
  }

  public toggleHeaderMenu(): void {
    this.isHeaderMenuOpen.update((value) => !value);
    if (!this.isHeaderMenuOpen()) {
      this.isDrawerSettingsOpen.set(false);
    }
  }

  public closeHeaderMenu(): void {
    this.isHeaderMenuOpen.set(false);
    this.isDrawerSettingsOpen.set(false);
  }

  public toggleDrawerSettings(): void {
    this.isDrawerSettingsOpen.update((value) => !value);
  }

  public onDrawerItemClick(action: DrawerItem['action']): void {
    if (action === 'close') {
      this.closeHeaderMenu();
      return;
    }

    if (action === 'create-profile') {
      this.createProfile();
      this.closeHeaderMenu();
      return;
    }

    if (action === 'go-to-list') {
      this.openResumeList();
      return;
    }

    if (action === 'download') {
      this.downloadResume();
      return;
    }

    if (action === 'logout') {
      this.logout();
      this.closeHeaderMenu();
      return;
    }

  }

  public setAuthMode(mode: AuthMode): void {
    this.authMode.set(mode);
    this.authError.set('');
  }

  protected signIn(): void {
    const identifier = this.loginUsername().trim();
    const password = this.loginPassword().trim();

    if (!identifier || !password) {
      this.authError.set('Enter a username or email and password.');
      return;
    }

    const users = this.resumeStorage.loadUsers();
    const existingUser = users.find(
      (user) => user.username === identifier || user.email === identifier,
    );

    if (!existingUser) {
      this.authError.set('User does not exist. Sign up to create an account.');
      return;
    }

    if (existingUser.password !== password) {
      this.authError.set('Invalid password for this user.');
      return;
    }

    this.finishAuth(existingUser);
  }

  protected signUp(): void {
    const username = this.loginUsername().trim();
    const email = this.loginEmail().trim();
    const password = this.loginPassword().trim();
    const confirmPassword = this.loginConfirmPassword().trim();

    if (!username || !email || !password || !confirmPassword) {
      this.authError.set('Enter a username, email, password, and confirm the password.');
      return;
    }

    if (password !== confirmPassword) {
      this.authError.set('Passwords do not match.');
      return;
    }

    const users = this.resumeStorage.loadUsers();
    const existingUser = users.find(
      (user) => user.username === username || user.email === email,
    );

    if (existingUser) {
      this.authError.set('An account already exists with that username or email.');
      return;
    }

    const newUser = this.resumeStorage.createUserRecord(
      username,
      email,
      password,
      this.resumeStorage.createDisplayName(username),
    );
    users.push(newUser);
    this.resumeStorage.saveUsers(users);
    this.lastSavedLabel.set('Created a new local account');

    this.finishAuth(newUser);
  }

  public login(): void {
    if (this.authMode() === 'sign-up') {
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

    this.currentUser = authenticatedUser;
    this.authError.set('');

    this.resumeStorage.saveSession(this.currentUser);

    this.restoreWorkspace();
    this.updateDerivedState();
    void this.router.navigateByUrl('/resumes');
  }

  public logout(): void {
    this.auth.logout();
    this.currentUser = null;
    this.profiles.set([]);
    this.activeProfileId.set('');
    this.activeProfileNameDraft.set('');
    this.activeScreen.set('list');
    this.resume = this.createDefaultResume();
    this.atsReport = this.buildAtsReport(this.resume);
    this.authMode.set('sign-in');

    this.resumeStorage.clearSession();
    this.loginPassword.set('');
    this.loginEmail.set('');
    this.loginConfirmPassword.set('');
    void this.router.navigateByUrl('/login');
  }

  public createProfile(): void {
    const profile = this.resumeStorage.createResumeProfile(
      `Resume ${this.profiles().length + 1}`,
      this.createDefaultResume(),
    );
    this.profiles.set([...this.profiles(), profile]);
    this.activeProfileId.set(profile.id);
    this.resume = profile.resume;
    this.activeProfileNameDraft.set(profile.name);
    this.activeScreen.set('editor');
    this.persistState();
    this.showSaveToast('New resume saved');
    void this.createProfileOnBackend(profile);
    void this.router.navigate(['/builder', profile.id]);
  }

  public createFirstResume(): void {
    this.createProfile();
  }

  public selectProfile(profileId: string): void {
    const profile = this.profiles().find((entry) => entry.id === profileId);
    if (!profile) {
      return;
    }

    this.activeProfileId.set(profile.id);
    this.resume = profile.resume;
    this.activeProfileNameDraft.set(profile.name);
    this.atsReport = this.buildAtsReport(this.resume);
    this.activeScreen.set('editor');
    void this.activateProfileOnBackend(profileId);
    void this.router.navigate(['/builder', profile.id]);
  }

  public deleteProfile(profileId: string): void {
    const nextProfiles = this.profiles().filter((profile) => profile.id !== profileId);
    const deletedActiveProfile = this.activeProfileId() === profileId;

    this.profiles.set(nextProfiles);

    if (nextProfiles.length === 0) {
      this.activeProfileId.set('');
      this.activeProfileNameDraft.set('');
      this.resume = this.createDefaultResume();
      this.activeScreen.set('list');
      this.persistState();
      void this.deleteProfileOnBackend(profileId);
      void this.router.navigateByUrl('/resumes');
      return;
    }

    if (deletedActiveProfile) {
      const nextActive = nextProfiles[0];
      this.activeProfileId.set(nextActive.id);
      this.resume = nextActive.resume;
      this.activeProfileNameDraft.set(nextActive.name);
      this.atsReport = this.buildAtsReport(this.resume);
    }

    this.persistState();
    void this.deleteProfileOnBackend(profileId);
  }

  public renameActiveProfile(name: string): void {
    const nextName = name.trim() || this.activeProfileLabel;
    this.activeProfileNameDraft.set(nextName);

    const activeProfile = this.activeProfile;
    if (!activeProfile) {
      return;
    }

    activeProfile.name = nextName;
    activeProfile.updatedAt = new Date().toISOString();
    this.persistState();
    void this.updateProfileOnBackend(activeProfile.id, nextName, this.resume);
  }

  public deleteActiveProfile(): void {
    if (this.activeProfileId()) {
      this.deleteProfile(this.activeProfileId());
    }
  }

  public setTemplate(template: TemplateKey): void {
    this.resume.template = template;
    this.persistState();
  }

  public setAccentColor(color: string): void {
    this.resume.accentColor = color;
    this.persistState();
  }

  public setSidebarColor(color: string): void {
    this.resume.sidebarColor = color;
    this.persistState();
  }

  public downloadResume(): void {
    if (!this.browser) {
      return;
    }

    void this.buildResumePdf();
  }

  public addExperience(): void {
    this.resume.experience = [...this.resume.experience, this.createEmptyExperienceEntry()];
    this.persistState();
  }

  public removeExperience(index: number): void {
    if (this.resume.experience.length === 1) {
      return;
    }

    this.resume.experience = this.resume.experience.filter((_, current) => current !== index);
    this.persistState();
  }

  public addEducation(): void {
    this.resume.education = [...this.resume.education, this.createEmptyEducationEntry()];
    this.persistState();
  }

  public removeEducation(index: number): void {
    if (this.resume.education.length === 1) {
      return;
    }

    this.resume.education = this.resume.education.filter((_, current) => current !== index);
    this.persistState();
  }

  public addProject(): void {
    this.resume.projects = [...this.resume.projects, this.createEmptyProjectEntry()];
    this.persistState();
  }

  public removeProject(index: number): void {
    if (this.resume.projects.length === 1) {
      return;
    }

    this.resume.projects = this.resume.projects.filter((_, current) => current !== index);
    this.persistState();
  }

  public clearPhoto(): void {
    this.resume.personal.photoDataUrl = '';
    this.persistState();
  }

  private showSaveToast(message: string): void {
    this.saveToastMessage.set(message);
    this.isSaveToastVisible.set(true);

    if (this.saveToastTimer) {
      clearTimeout(this.saveToastTimer);
    }

    this.saveToastTimer = setTimeout(() => {
      this.isSaveToastVisible.set(false);
      this.saveToastMessage.set('');
      this.saveToastTimer = null;
    }, 2200);
  }

  public updatePreviewScale(): void {
    if (!this.browser) {
      this.previewScale.set(1);
      return;
    }

    const availableWidth = Math.max(280, window.innerWidth - 24);
    const baseScale = Math.min(1, availableWidth / 794);
    this.previewScale.set(baseScale);
  }

  public updatePreviewPages(): void {
    const sections = [...this.orderedSections];

    if (this.isTwoSideTemplate) {
      this.previewPages.set([{ sections }]);
      return;
    }

    const firstPageCapacity = 760;
    const nextPageCapacity = 900;
    const pages: Array<{ sections: SectionKey[] }> = [];
    let current: SectionKey[] = [];
    let currentHeight = 0;

    for (const section of sections) {
      const sectionHeight = this.estimateSectionHeight(section);
      const capacity = pages.length === 0 ? firstPageCapacity : nextPageCapacity;

      if (current.length && currentHeight + sectionHeight > capacity) {
        pages.push({ sections: current });
        current = [];
        currentHeight = 0;
      }

      current.push(section);
      currentHeight += sectionHeight;
    }

    if (current.length || pages.length === 0) {
      pages.push({ sections: current });
    }

    this.previewPages.set(pages);
  }

  private estimateSectionHeight(section: SectionKey): number {
    switch (section) {
      case 'personal':
        return 90;
      case 'summary':
        return this.estimateTextHeight(this.resume.summary, 68, 18, 90);
      case 'experience':
        return (
          this.resume.experience.reduce((total, item) => {
            return total + this.estimateTextHeight(item.highlights, 60, 18, 84) + 56;
          }, 0) || 92
        );
      case 'projects':
        return (
          this.resume.projects.reduce((total, item) => {
            return total + this.estimateTextHeight(item.description, 60, 18, 76) + 52;
          }, 0) || 88
        );
      case 'education':
        return (this.resume.education.length || 1) * 72;
      case 'skills':
        return this.estimateSkillsHeight();
      default:
        return 72;
    }
  }

  private estimateTextHeight(text: string, charsPerLine: number, lineHeight: number, minHeight: number): number {
    const lines = Math.max(1, Math.ceil((text.trim().length || 1) / charsPerLine));
    return Math.max(minHeight, lines * lineHeight);
  }

  private estimateSkillsHeight(): number {
    const skillCount = this.skillList.length || 1;
    const lines = Math.max(1, Math.ceil(skillCount / 4));
    return Math.max(44, lines * 20 + 10);
  }

  public onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    this.resume.personal.photoDataUrl = previewUrl;

    const reader = new FileReader();
    reader.onload = () => {
      if (this.resume.personal.photoDataUrl === previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      this.resume.personal.photoDataUrl = typeof reader.result === 'string' ? reader.result : '';
      this.persistState();
      input.value = '';
    };
    reader.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  public onSectionDragHandleDown(section: SectionKey): void {
    this.dragArmedSection.set(section);
  }

  public onSectionDragStart(section: SectionKey, event: DragEvent): void {
    if (this.dragArmedSection() !== section) {
      event.preventDefault();
      return;
    }

    this.draggingSection.set(section);
    event.dataTransfer?.setData('text/plain', section);
  }

  public onSectionDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  public onSectionDragEnd(): void {
    this.draggingSection.set(null);
    this.dragArmedSection.set(null);
  }

  public onSectionDrop(targetSection: SectionKey): void {
    const draggingSection = this.draggingSection();
    if (!draggingSection || draggingSection === targetSection) {
      return;
    }

    const nextOrder = [...this.resume.sectionOrder];
    const fromIndex = nextOrder.indexOf(draggingSection);
    const toIndex = nextOrder.indexOf(targetSection);

    if (fromIndex === -1 || toIndex === -1) {
      this.draggingSection.set(null);
      return;
    }

    nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, draggingSection);
    this.resume.sectionOrder = nextOrder;
    this.draggingSection.set(null);
    this.dragArmedSection.set(null);
    this.persistState();
  }

  private updateDerivedState(): void {
    this.atsReport = this.buildAtsReport(this.resume);
    this.updatePreviewPages();
  }

  private async restoreSession(): Promise<void> {
    if (!this.browser) {
      return;
    }

    const saved = this.resumeStorage.loadSession();
    const session = saved ?? (await this.resumeStorage.loadSessionFromBackend());
    if (!session) {
      return;
    }

    this.currentUser = {
      username: session.username,
      displayName: session.displayName,
    };
  }

  private async restoreWorkspace(): Promise<void> {
    if (!this.browser) {
      return;
    }

    if (!this.auth.session?.username) {
      return;
    }

    const saved = this.resumeStorage.loadWorkspace(this.auth.session.username) ??
      (await this.resumeStorage.loadWorkspaceFromBackend(this.auth.session.username));
    if (!saved) {
      this.profiles.set([]);
      this.activeProfileId.set('');
      this.activeProfileNameDraft.set('');
      this.resume = this.createDefaultResume();
      this.activeScreen.set('list');
      this.atsReport = this.buildAtsReport(this.resume);
      this.lastSavedLabel.set('');
      return;
    }

    if (!Array.isArray(saved.profiles)) {
      this.resumeStorage.saveWorkspace(this.auth.session.username, {
        profiles: [],
        activeProfileId: '',
        activeScreen: 'list',
      });
      this.profiles.set([]);
      this.activeProfileId.set('');
      this.activeProfileNameDraft.set('');
      this.resume = this.createDefaultResume();
      this.activeScreen.set('list');
      this.atsReport = this.buildAtsReport(this.resume);
      this.lastSavedLabel.set('');
      return;
    }

    this.profiles.set(saved.profiles
      .map((profile) => this.normalizeProfile(profile))
      .filter((profile): profile is ResumeProfile => profile !== null));
    this.activeProfileId.set(
      typeof saved.activeProfileId === 'string' &&
      this.profiles().some((profile) => profile.id === saved.activeProfileId)
        ? saved.activeProfileId
        : this.profiles()[0]?.id ?? '');
    const activeProfile = this.activeProfile;
    this.resume = activeProfile?.resume ?? this.createDefaultResume();
    this.activeProfileNameDraft.set(activeProfile?.name ?? '');
    this.activeScreen.set(saved.activeScreen === 'editor' ? 'editor' : 'list');
    this.atsReport = this.buildAtsReport(this.resume);
    this.lastSavedLabel.set(this.profiles().length ? 'Loaded saved resumes' : '');
  }

  private saveWorkspace(): void {
    if (!this.browser) {
      return;
    }

    if (!this.auth.session?.username) {
      return;
    }

    const payload: WorkspaceState = {
      profiles: this.profiles(),
      activeProfileId: this.activeProfileId(),
      activeScreen: this.activeScreen(),
    };

    this.resumeStorage.saveWorkspace(this.auth.session.username, payload);
    void this.saveWorkspaceToBackend(payload);
  }

  private async saveWorkspaceToBackend(payload: WorkspaceState): Promise<void> {
    if (!this.browser || !this.auth.token) {
      return;
    }

    try {
      await fetch(this.workspaceApiUrl, {
        method: 'PUT',
        headers: this.workspaceHeaders(),
        body: JSON.stringify(payload),
      });
    } catch {
      // Keep local cache as fallback.
    }
  }

  private async createProfileOnBackend(profile: ResumeProfile): Promise<void> {
    if (!this.browser || !this.auth.token) {
      return;
    }

    try {
      const response = await fetch(`${this.workspaceApiUrl}/profiles`, {
        method: 'POST',
        headers: this.workspaceHeaders(),
        body: JSON.stringify({ name: profile.name, resume: profile.resume }),
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { workspace?: WorkspaceState };
      if (payload.workspace) {
        this.applyWorkspacePayload(payload.workspace);
      }
    } catch {
      // Ignore backend sync issues.
    }
  }

  private async activateProfileOnBackend(profileId: string): Promise<void> {
    if (!this.browser || !this.auth.token) {
      return;
    }

    try {
      const response = await fetch(`${this.workspaceApiUrl}/active-profile/${encodeURIComponent(profileId)}`, {
        method: 'POST',
        headers: this.workspaceHeaders(),
      });

      if (!response.ok) {
        return;
      }

      const workspace = (await response.json()) as WorkspaceState;
      this.applyWorkspacePayload(workspace);
    } catch {
      // Ignore backend sync issues.
    }
  }

  private async deleteProfileOnBackend(profileId: string): Promise<void> {
    if (!this.browser || !this.auth.token) {
      return;
    }

    try {
      const response = await fetch(`${this.workspaceApiUrl}/profiles/${encodeURIComponent(profileId)}`, {
        method: 'DELETE',
        headers: this.workspaceHeaders(),
      });

      if (!response.ok) {
        return;
      }

      const workspace = (await response.json()) as WorkspaceState;
      this.applyWorkspacePayload(workspace);
    } catch {
      // Ignore backend sync issues.
    }
  }

  private async updateProfileOnBackend(profileId: string, name: string, resume: ResumeState): Promise<void> {
    if (!this.browser || !this.auth.token) {
      return;
    }

    try {
      const response = await fetch(`${this.workspaceApiUrl}/profiles/${encodeURIComponent(profileId)}`, {
        method: 'PUT',
        headers: this.workspaceHeaders(),
        body: JSON.stringify({ name, resume }),
      });

      if (!response.ok) {
        return;
      }

      const workspace = (await response.json()) as WorkspaceState;
      this.applyWorkspacePayload(workspace);
    } catch {
      // Ignore backend sync issues.
    }
  }

  private applyWorkspacePayload(workspace: WorkspaceState): void {
    if (!workspace || !Array.isArray(workspace.profiles)) {
      this.resetWorkspace();
      return;
    }

    this.profiles.set(workspace.profiles
      .map((profile) => this.normalizeProfile(profile))
      .filter((profile): profile is ResumeProfile => profile !== null));
    this.activeProfileId.set(
      typeof workspace.activeProfileId === 'string' &&
      this.profiles().some((profile) => profile.id === workspace.activeProfileId)
        ? workspace.activeProfileId
        : this.profiles()[0]?.id ?? '');
    const activeProfile = this.activeProfile;
    this.resume = activeProfile?.resume ?? this.createDefaultResume();
    this.activeProfileNameDraft.set(activeProfile?.name ?? '');
    this.activeScreen.set(workspace.activeScreen === 'editor' ? 'editor' : 'list');
    this.atsReport = this.buildAtsReport(this.resume);
    this.lastSavedLabel.set(this.profiles().length ? 'Loaded saved resumes' : '');
  }

  private resetWorkspace(): void {
    this.profiles.set([]);
    this.activeProfileId.set('');
    this.activeProfileNameDraft.set('');
    this.resume = this.createDefaultResume();
    this.activeScreen.set('list');
    this.atsReport = this.buildAtsReport(this.resume);
    this.lastSavedLabel.set('');
  }

  private workspaceHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(this.auth.token ? { Authorization: `Bearer ${this.auth.token}` } : {}),
    };
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

  private normalizeProfile(value: unknown): ResumeProfile | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Partial<ResumeProfile>;
    return {
      id: typeof candidate.id === 'string' ? candidate.id : this.createId(),
      name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name : 'Resume',
      createdAt:
        typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
      updatedAt:
        typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
      resume: this.normalizeImportedState(candidate.resume),
    };
  }

  private createId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    return 'light';
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
      this.preparePdfExportClone(exportRoot);
      wrapper = document.createElement('div');
      wrapper.className = `pdf-export ${this.templateClass}`;
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-100000px';
      wrapper.style.top = '0';
      wrapper.style.width = '794px';
      wrapper.style.background = '#ffffff';
      wrapper.style.setProperty('--preview-scale', '1');

      const sourceShell = element.closest('.shell') as HTMLElement | null;
      const sourceStyles = getComputedStyle(sourceShell ?? document.documentElement);
      wrapper.style.fontFamily = sourceStyles.fontFamily;
      wrapper.style.color = sourceStyles.color;
      wrapper.style.lineHeight = sourceStyles.lineHeight;
      wrapper.style.backgroundColor = sourceStyles.backgroundColor || '#ffffff';

      for (let index = 0; index < sourceStyles.length; index += 1) {
        const propertyName = sourceStyles.item(index);
        if (propertyName.startsWith('--')) {
          wrapper.style.setProperty(
            propertyName,
            sourceStyles.getPropertyValue(propertyName),
            sourceStyles.getPropertyPriority(propertyName),
          );
        }
      }

      const exportWrapper = wrapper;
      Object.entries(this.accentStyle).forEach(([key, value]) => {
        if (key.startsWith('--')) {
          exportWrapper.style.setProperty(key, value);
        }
      });
      wrapper.appendChild(exportRoot);
      document.body.appendChild(wrapper);

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4',
        compress: true,
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 0;
      const marginY = 0;
      const contentWidth = pageWidth;
      const contentHeight = pageHeight;
      const pageTargets = Array.from(exportRoot.querySelectorAll('.preview-page')) as HTMLElement[];
      const fallbackTarget = (exportRoot.querySelector('.resume-card') as HTMLElement | null) ?? exportRoot;
      const targets = pageTargets.length ? pageTargets : [fallbackTarget];

      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        const targetClone = target.cloneNode(true) as HTMLElement;
        this.preparePdfExportPageClone(targetClone);
        wrapper.appendChild(targetClone);

        const canvas = await html2canvas(targetClone, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          width: targetClone.scrollWidth,
          height: targetClone.scrollHeight,
        });

        if (index > 0) {
          doc.addPage();
        }

        const imgData = canvas.toDataURL('image/png', 1.0);
        const imageHeight = (canvas.height * contentWidth) / canvas.width;
        doc.addImage(imgData, 'PNG', marginX, marginY, contentWidth, Math.min(imageHeight, contentHeight));

        targetClone.remove();
      }

      doc.save(this.buildDownloadFileName());
    } finally {
      if (wrapper?.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
      element.style.maxHeight = originalMaxHeight;
      element.style.overflow = originalOverflow;
    }
  }

  private createInlineStyledClone(source: HTMLElement): HTMLElement {
    return source.cloneNode(true) as HTMLElement;
  }

  private preparePdfExportClone(root: HTMLElement): void {
    const a4Width = '210mm';
    const a4MinWidth = '794px';

    root.style.width = a4Width;
    root.style.minWidth = a4MinWidth;
    root.style.maxWidth = a4Width;
    root.style.maxHeight = 'none';
    root.style.overflow = 'visible';
    root.style.transform = 'none';

    const header = root.querySelector('.preview-header') as HTMLElement | null;
    if (header) {
      header.style.width = a4Width;
      header.style.minWidth = a4MinWidth;
      header.style.maxWidth = a4Width;
    }

    const frame = root.querySelector('.preview-frame') as HTMLElement | null;
    if (frame) {
      frame.style.width = a4Width;
      frame.style.minWidth = a4MinWidth;
      frame.style.maxWidth = a4Width;
      frame.style.transform = 'none';
    }

    const pages = root.querySelectorAll('.preview-page');
    pages.forEach((page) => {
      const pageElement = page as HTMLElement;
      pageElement.style.width = a4Width;
      pageElement.style.minWidth = a4MinWidth;
      pageElement.style.maxWidth = a4Width;
    });

    const card = root.querySelector('.resume-card') as HTMLElement | null;
    if (card) {
      card.style.width = a4Width;
      card.style.minWidth = a4MinWidth;
      card.style.maxWidth = a4Width;
      card.style.minHeight = '297mm';
      card.style.fontSize = '14px';
    }

    const split = root.querySelector('.resume-split') as HTMLElement | null;
    if (split) {
      split.style.gridTemplateColumns = 'minmax(180px, 0.62fr) minmax(0, 1.38fr)';
    }

    const rows = root.querySelectorAll('.row');
    rows.forEach((row) => {
      const rowElement = row as HTMLElement;
      rowElement.style.flexWrap = 'wrap';
      rowElement.style.alignItems = 'baseline';
    });

    const textBlocks = root.querySelectorAll(
      '.contact > span, .sidebar-list > span, .preview-entry p, .preview-entry strong',
    );
    textBlocks.forEach((node) => {
      const elementNode = node as HTMLElement;
      elementNode.style.overflowWrap = 'anywhere';
      elementNode.style.wordBreak = 'break-word';
      elementNode.style.minWidth = '0';
    });
  }

  private preparePdfExportPageClone(page: HTMLElement): void {
    const a4Width = '210mm';
    const a4MinWidth = '794px';

    page.style.width = a4Width;
    page.style.minWidth = a4MinWidth;
    page.style.maxWidth = a4Width;
    page.style.transform = 'none';
    page.style.background = '#ffffff';
    page.style.breakAfter = 'auto';

    const card = page.querySelector('.resume-card') as HTMLElement | null;
    if (card) {
      card.style.width = a4Width;
      card.style.minWidth = a4MinWidth;
      card.style.maxWidth = a4Width;
      card.style.minHeight = '297mm';
      card.style.fontSize = '14px';
    }

    const textBlocks = page.querySelectorAll(
      '.contact > span, .sidebar-list > span, .row > *, .preview-entry p, .preview-entry strong',
    );
    textBlocks.forEach((node) => {
      const elementNode = node as HTMLElement;
      elementNode.style.overflowWrap = 'anywhere';
      elementNode.style.wordBreak = 'break-word';
      elementNode.style.minWidth = '0';
    });
  }

  private buildDownloadFileName(): string {
    const parts = [this.resume.personal.firstName, this.resume.personal.surname]
      .map((part) => part.trim())
      .filter(Boolean);
    const baseName = parts.length ? parts.join(' ') : 'Untitled';

    return `${baseName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_') || 'Untitled'}.pdf`;
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
