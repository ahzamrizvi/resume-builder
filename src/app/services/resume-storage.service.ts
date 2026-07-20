import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  AuthUserRecord,
  ResumeProfile,
  ResumeState,
  UserSession,
  WorkspaceState,
} from '../models/resume.models';

const USERS_KEY = 'br-resume-users';
const SESSION_KEY = 'br-resume-session';
const WORKSPACE_KEY = 'br-resume-workspace';
const TOKEN_KEY = 'br-resume-token';

@Injectable({ providedIn: 'root' })
export class ResumeStorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly apiBaseUrl = this.resolveApiBaseUrl();
  private readonly workspaceApiUrl = this.apiBaseUrl ? `${this.apiBaseUrl}/api/workspace` : '/api/workspace';
  private readonly syncReadyPromise: Promise<void>;

  constructor() {
    this.syncReadyPromise = Promise.resolve();
  }

  ready(): Promise<void> {
    return this.syncReadyPromise;
  }

  loadUsers(): AuthUserRecord[] {
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

  saveUsers(users: AuthUserRecord[]): void {
    if (!this.browser) {
      return;
    }

    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  saveSession(session: UserSession): void {
    if (!this.browser) {
      return;
    }

    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  loadSession(): UserSession | null {
    if (!this.browser) {
      return null;
    }

    const saved = window.localStorage.getItem(SESSION_KEY);
    if (!saved) {
      return null;
    }

    try {
      const parsed = JSON.parse(saved) as Partial<UserSession>;
      if (typeof parsed.username !== 'string' || typeof parsed.displayName !== 'string') {
        return null;
      }

      return {
        username: parsed.username,
        displayName: parsed.displayName,
      };
    } catch {
      return null;
    }
  }

  async loadSessionFromBackend(): Promise<UserSession | null> {
    return null;
  }

  clearSession(): void {
    if (this.browser) {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }

  loadWorkspace(username: string): WorkspaceState | null {
    if (!this.browser || !username) {
      return null;
    }

    const saved = window.localStorage.getItem(this.getWorkspaceKey(username));
    return saved ? (JSON.parse(saved) as WorkspaceState) : null;
  }

  async loadWorkspaceFromBackend(username: string): Promise<WorkspaceState | null> {
    if (!this.browser || !username) {
      return null;
    }

    return this.fetchWorkspaceToCache(username);
  }

  saveWorkspace(username: string, state: WorkspaceState): void {
    if (!this.browser || !username) {
      return;
    }

    const storageKey = this.getWorkspaceKey(username);
    window.localStorage.setItem(storageKey, JSON.stringify(state));
    void this.pushWorkspaceToBackend(state);
  }

  createUserRecord(
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

  createDisplayName(username: string): string {
    const localPart = username.split('@')[0] || username;
    return localPart
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  createResumeProfile(name: string, resume: ResumeState): ResumeProfile {
    const now = new Date().toISOString();
    return {
      id: this.createId(),
      name,
      createdAt: now,
      updatedAt: now,
      resume,
    };
  }

  normalizeUserRecord(value: unknown): AuthUserRecord | null {
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

  private createId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private resolveApiBaseUrl(): string {
    if (!this.browser) {
      return '';
    }

    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }

    return origin;
  }

  private async pushWorkspaceToBackend(state: WorkspaceState): Promise<void> {
    try {
      await fetch(this.workspaceApiUrl, {
        method: 'PUT',
        headers: this.workspaceHeaders(),
        body: JSON.stringify(state),
      });
    } catch {
      // Ignore backend sync errors; localStorage remains the fallback cache.
    }
  }

  private async fetchWorkspaceToCache(username: string): Promise<WorkspaceState | null> {
    try {
      const response = await fetch(this.workspaceApiUrl, {
        headers: this.workspaceHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const workspace = (await response.json()) as WorkspaceState;
      window.localStorage.setItem(this.getWorkspaceKey(username), JSON.stringify(workspace));
      return workspace;
    } catch {
      // Ignore backend sync errors.
      return null;
    }
  }

  private workspaceHeaders(): HeadersInit {
    const token = this.browser ? window.localStorage.getItem(TOKEN_KEY) : null;
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private getWorkspaceKey(username: string): string {
    return `${WORKSPACE_KEY}:${username}`;
  }
}
