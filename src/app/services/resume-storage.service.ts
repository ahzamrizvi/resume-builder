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

@Injectable({ providedIn: 'root' })
export class ResumeStorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);

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
    if (!saved) {
      return null;
    }

    try {
      return JSON.parse(saved) as WorkspaceState;
    } catch {
      window.localStorage.removeItem(this.getWorkspaceKey(username));
      return null;
    }
  }

  saveWorkspace(username: string, state: WorkspaceState): void {
    if (!this.browser || !username) {
      return;
    }

    window.localStorage.setItem(this.getWorkspaceKey(username), JSON.stringify(state));
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

  private getWorkspaceKey(username: string): string {
    return `${WORKSPACE_KEY}:${username}`;
  }
}
