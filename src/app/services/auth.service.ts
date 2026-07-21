import { isPlatformBrowser } from '@angular/common';
import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';

import { AuthMode, UserSession } from '../models/resume.models';
import { environment } from '../../environments/environment';

type AuthResponse = {
  token: string;
  user: {
    username: string;
    displayName: string;
  };
};

type MeResponse = {
  user: {
    username: string;
    displayName: string;
  };
};

const TOKEN_KEY = 'br-resume-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly apiBaseUrl = environment.apiUrl;
  private readonly authApiUrl = this.apiBaseUrl ? `${this.apiBaseUrl}/api/auth` : '/api/auth';

  public readonly loginUsername = signal('');
  public readonly loginEmail = signal('');
  public readonly loginPassword = signal('');
  public readonly loginConfirmPassword = signal('');
  public readonly authMode = signal<AuthMode>('sign-in');
  public readonly authError = signal('');
  private readonly currentUser = signal<UserSession | null>(null);
  private readonly accessToken = signal<string | null>(null);

  public async initialize(): Promise<void> {
    if (!this.browser) {
      return;
    }

    this.accessToken.set(window.localStorage.getItem(TOKEN_KEY));
    if (!this.accessToken()) {
      return;
    }

    const session = await this.loadSessionFromBackend();
    if (session) {
      this.currentUser.set(session);
      return;
    }

    this.clearToken();
  }

  public get session(): UserSession | null {
    return this.currentUser();
  }

  public get token(): string | null {
    return this.accessToken();
  }

  public setAuthMode(mode: AuthMode): void {
    this.authMode.set(mode);
    this.authError.set('');
  }

  public async login(): Promise<void> {
    if (this.authMode() === 'sign-up') {
      await this.signUp();
      return;
    }

    await this.signIn();
  }

  public logout(): void {
    this.currentUser.set(null);
    this.accessToken.set(null);
    this.authMode.set('sign-in');
    this.authError.set('');
    this.loginPassword.set('');
    this.loginEmail.set('');
    this.loginConfirmPassword.set('');

    if (this.browser) {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  }

  private async signIn(): Promise<void> {
    const identifier = this.loginUsername().trim();
    const password = this.loginPassword().trim();

    if (!identifier || !password) {
      this.authError.set('Enter a username or email and password.');
      return;
    }

    const response = await this.fetchAuth<AuthResponse>('/login', {
      identifier,
      password,
    });

    if (!response) {
      return;
    }

    this.setSession(response.token, response.user.username, response.user.displayName);
  }

  private async signUp(): Promise<void> {
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

    const response = await this.fetchAuth<AuthResponse>('/register', {
      username,
      email,
      password,
      displayName: this.createDisplayName(username),
    });

    if (!response) {
      return;
    }

    this.setSession(response.token, response.user.username, response.user.displayName);
  }

  private async loadSessionFromBackend(): Promise<UserSession | null> {
    const token = this.accessToken();
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${this.authApiUrl}/me`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as MeResponse;
      if (!payload?.user?.username || !payload?.user?.displayName) {
        return null;
      }

      return {
        username: payload.user.username,
        displayName: payload.user.displayName,
      };
    } catch {
      return null;
    }
  }

  private setSession(token: string, username: string, displayName: string): void {
    this.accessToken.set(token);
    this.currentUser.set({
      username,
      displayName,
    });
    this.authError.set('');

    if (this.browser) {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
  }

  private async fetchAuth<T>(path: '/login' | '/register', body: Record<string, unknown>): Promise<T | null> {
    try {
      const response = await fetch(`${this.authApiUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | T | null;
      if (!response.ok) {
        this.authError.set(
          payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
            ? payload.message
            : 'Authentication failed.',
        );
        return null;
      }

      return payload as T;
    } catch {
      this.authError.set('Unable to reach the authentication service.');
      return null;
    }
  }

  private clearToken(): void {
    this.accessToken.set(null);
    if (this.browser) {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  }

  private createDisplayName(username: string): string {
    return username
      .split('@')[0]
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || username;
  }
}
