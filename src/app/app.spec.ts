import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the builder shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Local authentication');
    expect(compiled.textContent).toContain('Login');
    expect(compiled.textContent).toContain('Sign up');
  });

  it('should create a user when signing up with a new username', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as any;

    app.setAuthMode('sign-up');
    app.loginUsername = 'new.user@example.com';
    app.loginEmail = 'new.user@example.com';
    app.loginPassword = 'secret123';
    app.loginConfirmPassword = 'secret123';
    app.login();

    await fixture.whenStable();

    expect(app.isAuthenticated).toBe(true);
    expect(app.currentUser?.username).toBe('new.user@example.com');
    expect(localStorage.getItem('br-resume-users')).toContain('new.user@example.com');
  });

  it('should sign in with an existing user', async () => {
    localStorage.setItem(
      'br-resume-users',
      JSON.stringify([
        {
          username: 'existing@example.com',
          email: 'existing@example.com',
          password: 'pass123',
          displayName: 'Existing User',
          createdAt: new Date().toISOString(),
        },
      ]),
    );

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as any;

    app.setAuthMode('sign-in');
    app.loginUsername = 'existing@example.com';
    app.loginPassword = 'pass123';
    app.login();

    await fixture.whenStable();

    expect(app.isAuthenticated).toBe(true);
    expect(app.currentUser?.displayName).toBe('Existing User');
  });

  it('should reject signup when passwords do not match', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as any;

    app.setAuthMode('sign-up');
    app.loginUsername = 'mismatch';
    app.loginEmail = 'mismatch@example.com';
    app.loginPassword = 'secret123';
    app.loginConfirmPassword = 'secret456';
    app.login();

    await fixture.whenStable();

    expect(app.isAuthenticated).toBe(false);
    expect(app.authError).toContain('Passwords do not match');
  });
});
