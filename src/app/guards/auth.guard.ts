import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth.service';

export const requireAuthGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.initialize();
  return auth.session ? true : router.createUrlTree(['/login']);
};

export const redirectIfAuthenticatedGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.initialize();
  return auth.session ? router.createUrlTree(['/resumes']) : true;
};
