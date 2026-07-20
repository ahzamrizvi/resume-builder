import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

import { AuthMode } from "../../models/resume.models";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-auth-page",
  imports: [FormsModule],
  templateUrl: "./auth-page.component.html",
  styleUrl: "../../app.css",
})
export class AuthPageComponent {
  protected readonly title = "BUILD YOUR RESUME";
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  get loginUsername(): string {
    return this.auth.loginUsername();
  }

  set loginUsername(value: string) {
    this.auth.loginUsername.set(value);
  }

  get loginEmail(): string {
    return this.auth.loginEmail();
  }

  set loginEmail(value: string) {
    this.auth.loginEmail.set(value);
  }

  get loginPassword(): string {
    return this.auth.loginPassword();
  }

  set loginPassword(value: string) {
    this.auth.loginPassword.set(value);
  }

  get loginConfirmPassword(): string {
    return this.auth.loginConfirmPassword();
  }

  set loginConfirmPassword(value: string) {
    this.auth.loginConfirmPassword.set(value);
  }

  get authMode(): AuthMode {
    return this.auth.authMode();
  }

  get authError(): string {
    return this.auth.authError();
  }

  protected setAuthMode(mode: AuthMode): void {
    this.auth.setAuthMode(mode);
  }

  protected async submit(): Promise<void> {
    await this.auth.login();

    if (this.auth.session) {
      void this.router.navigateByUrl("/resumes");
    }
  }
}
