import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { ResumeStateService } from '../../services/resume-state.service';
import { DrawerItem, ResumeProfile, SectionKey, TemplateKey } from '../../models/resume.models';

@Component({
  selector: 'app-resume-builder-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './resume-builder-page.component.html',
  styleUrl: '../../app.css',
})
export class ResumeBuilderPageComponent {
  protected readonly state = inject(ResumeStateService);
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  get title(): string {
    return this.state.title;
  }

  get templateOptions() {
    return this.state.templateOptions;
  }

  get sectionLabels() {
    return this.state.sectionLabels;
  }

  get sectionDescriptions() {
    return this.state.sectionDescriptions;
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

  get saveToastMessage(): string {
    return this.state.saveToastMessage();
  }

  get isSaveToastVisible(): boolean {
    return this.state.isSaveToastVisible();
  }

  get accentStyle(): Record<string, string> {
    return this.state.accentStyle;
  }

  get resume() {
    return this.state.resume;
  }

  get atsReport() {
    return this.state.atsReport;
  }

  get lastSavedLabel(): string {
    return this.state.lastSavedLabel();
  }

  get importError(): string {
    return this.state.importError();
  }

  get templateClass(): string {
    return this.state.templateClass;
  }

  get isTwoSideTemplate(): boolean {
    return this.state.isTwoSideTemplate;
  }

  get previewScale(): number {
    return this.state.previewScale();
  }

  get previewPages() {
    return this.state.previewPages();
  }

  get fullName(): string {
    return this.state.fullName;
  }

  get skillList(): string[] {
    return this.state.skillList;
  }

  get orderedSections(): SectionKey[] {
    return this.state.orderedSections;
  }

  get draggingSection(): SectionKey | null {
    return this.state.draggingSection();
  }

  get dragArmedSection(): SectionKey | null {
    return this.state.dragArmedSection();
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

  protected persistState(statusLabel?: string): void {
    this.state.persistState(statusLabel);
  }

  protected openResumeList(): void {
    this.state.openResumeList();
  }

  protected downloadResume(): void {
    this.state.downloadResume();
  }

  protected addExperience(): void {
    this.state.addExperience();
  }

  protected removeExperience(index: number): void {
    this.state.removeExperience(index);
  }

  protected addProject(): void {
    this.state.addProject();
  }

  protected removeProject(index: number): void {
    this.state.removeProject(index);
  }

  protected addEducation(): void {
    this.state.addEducation();
  }

  protected removeEducation(index: number): void {
    this.state.removeEducation(index);
  }

  protected clearPhoto(): void {
    this.state.clearPhoto();
  }

  protected setTemplate(template: TemplateKey): void {
    this.state.setTemplate(template);
  }

  protected setAccentColor(color: string): void {
    this.state.setAccentColor(color);
  }

  protected setSidebarColor(color: string): void {
    this.state.setSidebarColor(color);
  }

  protected onPhotoSelected(event: Event): void {
    this.state.onPhotoSelected(event);
  }

  protected onSectionDragHandleDown(section: SectionKey): void {
    this.state.onSectionDragHandleDown(section);
  }

  protected onSectionDragStart(section: SectionKey, event: DragEvent): void {
    this.state.onSectionDragStart(section, event);
  }

  protected onSectionDragEnd(): void {
    this.state.onSectionDragEnd();
  }

  protected onSectionDragOver(event: DragEvent): void {
    this.state.onSectionDragOver(event);
  }

  protected onSectionDrop(section: SectionKey): void {
    this.state.onSectionDrop(section);
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

    const profileId = this.route.snapshot.paramMap.get('id');
    if (profileId) {
      const profile = this.state.profiles().find((entry: ResumeProfile) => entry.id === profileId);
      if (!profile) {
        void this.router.navigateByUrl('/resumes');
        return;
      }

      if (this.state.activeProfile?.id !== profileId) {
        this.state.selectProfile(profileId);
      }
      return;
    }

    if (this.state.activeProfile) {
      this.state.selectProfile(this.state.activeProfile.id);
      return;
    }

    void this.router.navigateByUrl('/resumes');
  }
}
