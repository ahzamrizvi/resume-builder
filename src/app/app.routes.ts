import { Routes } from '@angular/router';

import { AuthPageComponent } from './pages/auth/auth-page.component';
import { ResumeBuilderPageComponent } from './pages/resume-builder/resume-builder-page.component';
import { ResumeListPageComponent } from './pages/resume-list/resume-list-page.component';
import { redirectIfAuthenticatedGuard, requireAuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: AuthPageComponent, canActivate: [redirectIfAuthenticatedGuard] },
  { path: 'resumes', component: ResumeListPageComponent, canActivate: [requireAuthGuard] },
  { path: 'builder/:id', component: ResumeBuilderPageComponent, canActivate: [requireAuthGuard] },
  { path: 'builder', redirectTo: 'resumes', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
