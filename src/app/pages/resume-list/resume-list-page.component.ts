import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DrawerItem, ResumeProfile } from '../../models/resume.models';
import { AuthService } from '../../services/auth.service';
import { ResumeStateService } from '../../services/resume-state.service';

@Component({
  selector: 'app-resume-list-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './resume-list-page.component.html',
  styleUrl: '../../app.css',
})
export class ResumeListPageComponent {
  protected readonly state = inject(ResumeStateService);
  protected readonly auth = inject(AuthService);

  get title(): string {
    return this.state.title;
  }

  get isHeaderMenuOpen(): boolean {
    return this.state.isHeaderMenuOpen();
  }

  get currentUserAvatar(): string {
    return this.state.currentUserAvatar;
  }

  get currentUserName(): string {
    return this.state.currentUserName;
  }

  get profiles(): ResumeProfile[] {
    return this.state.profiles();
  }

  get hasProfiles(): boolean {
    return this.state.hasProfiles;
  }

  get accentStyle(): Record<string, string> {
    return this.state.accentStyle;
  }

  get drawerItems(): DrawerItem[] {
    return this.state.drawerItems;
  }

  get currentUser() {
    return this.auth.session;
  }

  protected toggleHeaderMenu(): void {
    this.state.toggleHeaderMenu();
  }

  protected closeHeaderMenu(): void {
    this.state.closeHeaderMenu();
  }

  protected onDrawerItemClick(action: DrawerItem['action']): void {
    this.state.onDrawerItemClick(action);
  }

  protected createProfile(): void {
    this.state.createProfile();
  }

  protected createFirstResume(): void {
    this.state.createFirstResume();
  }

  protected selectProfile(profileId: string): void {
    this.state.selectProfile(profileId);
  }

  protected deleteProfile(profileId: string): void {
    this.state.deleteProfile(profileId);
  }

  protected profileDisplayName(profile: ResumeProfile): string {
    return this.state.profileDisplayName(profile);
  }

  protected profileScore(profile: ResumeProfile): number {
    return this.state.profileScore(profile);
  }

  protected profileScoreClass(profile: ResumeProfile): string {
    return this.state.profileScoreClass(profile);
  }

  protected persistState(statusLabel?: string): void {
    this.state.persistState(statusLabel);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.state.isHeaderMenuOpen()) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    if (target.closest('.header-drawer') || target.closest('.hamburger-btn')) {
      return;
    }

    this.state.closeHeaderMenu();
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.state.updatePreviewScale();
    this.state.updatePreviewPages();
  }

  protected async ngOnInit(): Promise<void> {
    await this.state.initialize();
  }
}
