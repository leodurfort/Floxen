import request from 'supertest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import {
  createVerificationToken,
  verifyToken,
  checkRateLimit,
} from '../src/services/verificationService';
import {
  createTestUser,
  generateAccessToken,
  generateRefreshToken,
  generateExpiredToken,
  generateInvalidToken,
  TEST_JWT_SECRET,
  TEST_JWT_REFRESH_SECRET,
} from './utils/testHelpers';

const app = createApp();

// Type assertions for mocks
const mockPrisma = prisma as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const mockVerificationService = {
  createVerificationToken: createVerificationToken as ReturnType<typeof vi.fn>,
  verifyToken: verifyToken as ReturnType<typeof vi.fn>,
  checkRateLimit: checkRateLimit as ReturnType<typeof vi.fn>,
};

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // REGISTRATION FLOW TESTS
  // ===========================================
  describe('Registration Flow', () => {
    describe('POST /api/v1/auth/register/start', () => {
      it('should start registration with valid email', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);
        mockVerificationService.checkRateLimit.mockResolvedValue({ allowed: true });
        mockVerificationService.createVerificationToken.mockResolvedValue({ success: true });

        const res = await request(app)
          .post('/api/v1/auth/register/start')
          .send({ email: 'newuser@example.com' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('Verification code sent');
      });

      it('should reject registration with invalid email', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register/start')
          .send({ email: 'invalid-email' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
      });

      it('should reject registration for already verified email', async () => {
        const existingUser = createTestUser({ emailVerified: true });
        mockPrisma.user.findUnique.mockResolvedValue(existingUser);

        const res = await request(app)
          .post('/api/v1/auth/register/start')
          .send({ email: existingUser.email });

        expect(res.status).toBe(409);
        expect(res.body.error).toContain('already registered');
      });

      it('should allow re-sending code for unverified user', async () => {
        const existingUser = createTestUser({ emailVerified: false });
        mockPrisma.user.findUnique.mockResolvedValue(existingUser);
        mockVerificationService.checkRateLimit.mockResolvedValue({ allowed: true });
        mockVerificationService.createVerificationToken.mockResolvedValue({ success: true });

        const res = await request(app)
          .post('/api/v1/auth/register/start')
          .send({ email: existingUser.email });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should return 429 when rate limited', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);
        mockVerificationService.checkRateLimit.mockResolvedValue({
          allowed: false,
          waitSeconds: 3600,
        });

        const res = await request(app)
          .post('/api/v1/auth/register/start')
          .send({ email: 'newuser@example.com' });

        expect(res.status).toBe(429);
        expect(res.body.error).toContain('Too many requests');
      });
    });

    describe('POST /api/v1/auth/register/verify', () => {
      it('should verify email with valid code', async () => {
        mockVerificationService.verifyToken.mockResolvedValue({ valid: true });

        const res = await request(app)
          .post('/api/v1/auth/register/verify')
          .send({ email: 'test@example.com', code: '123456' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toContain('verified');
      });

      it('should reject invalid verification code', async () => {
        mockVerificationService.verifyToken.mockResolvedValue({
          valid: false,
          error: 'Invalid code',
        });

        const res = await request(app)
          .post('/api/v1/auth/register/verify')
          .send({ email: 'test@example.com', code: '000000' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
      });

      it('should reject code with wrong length', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register/verify')
          .send({ email: 'test@example.com', code: '123' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
      });
    });

    describe('POST /api/v1/auth/register/resend', () => {
      it('should resend verification code', async () => {
        mockVerificationService.checkRateLimit.mockResolvedValue({ allowed: true });
        mockVerificationService.createVerificationToken.mockResolvedValue({ success: true });

        const res = await request(app)
          .post('/api/v1/auth/register/resend')
          .send({ email: 'test@example.com' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should rate limit resend requests', async () => {
        mockVerificationService.checkRateLimit.mockResolvedValue({
          allowed: false,
          waitSeconds: 1800,
        });

        const res = await request(app)
          .post('/api/v1/auth/register/resend')
          .send({ email: 'test@example.com' });

        expect(res.status).toBe(429);
      });
    });

    describe('POST /api/v1/auth/register/password', () => {
      it('should create user with valid password', async () => {
        const newUser = createTestUser({
          emailVerified: false,
          onboardingComplete: false,
        });
        mockPrisma.user.findUnique.mockResolvedValue(null);
        mockPrisma.user.create.mockResolvedValue(newUser);
        mockPrisma.user.update.mockResolvedValue({ ...newUser, emailVerified: true });

        const res = await request(app)
          .post('/api/v1/auth/register/password')
          .send({ email: 'newuser@example.com', password: 'password123' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.tokens).toBeDefined();
        expect(res.body.tokens.accessToken).toBeDefined();
        expect(res.body.tokens.refreshToken).toBeDefined();
      });

      it('should reject password shorter than 8 characters', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register/password')
          .send({ email: 'test@example.com', password: 'short' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
      });

      it('should reject if user already completed registration', async () => {
        const existingUser = createTestUser({
          emailVerified: true,
          onboardingComplete: true,
        });
        mockPrisma.user.findUnique.mockResolvedValue(existingUser);

        const res = await request(app)
          .post('/api/v1/auth/register/password')
          .send({ email: existingUser.email, password: 'password123' });

        expect(res.status).toBe(409);
        expect(res.body.error).toContain('Account already exists');
      });
    });

    describe('POST /api/v1/auth/register/complete', () => {
      it('should complete profile with valid data', async () => {
        const user = createTestUser({ emailVerified: true, onboardingComplete: false });
        const updatedUser = { ...user, firstName: 'John', surname: 'Doe', name: 'John Doe' };

        mockPrisma.user.findUnique.mockResolvedValue(user);
        mockPrisma.user.update.mockResolvedValue(updatedUser);

        const res = await request(app)
          .post('/api/v1/auth/register/complete')
          .send({ email: user.email, firstName: 'John', surname: 'Doe' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.firstName).toBe('John');
        expect(res.body.user.surname).toBe('Doe');
        expect(res.body.tokens).toBeDefined();
      });

      it('should reject completion without email verification', async () => {
        const user = createTestUser({ emailVerified: false });
        mockPrisma.user.findUnique.mockResolvedValue(user);

        const res = await request(app)
          .post('/api/v1/auth/register/complete')
          .send({ email: user.email, firstName: 'John', surname: 'Doe' });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('verify your email');
      });

      it('should reject if user not found', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const res = await request(app)
          .post('/api/v1/auth/register/complete')
          .send({ email: 'nonexistent@example.com', firstName: 'John', surname: 'Doe' });

        expect(res.status).toBe(404);
        expect(res.body.error).toContain('User not found');
      });

      it('should reject missing required fields', async () => {
        const res = await request(app)
          .post('/api/v1/auth/register/complete')
          .send({ email: 'test@example.com', firstName: '' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
      });
    });
  });

  // ===========================================
  // LOGIN FLOW TESTS
  // ===========================================
  describe('Login Flow', () => {
    describe('POST /api/v1/auth/login', () => {
      it('should login with valid credentials', async () => {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash('password123', 10);
        const user = createTestUser({ passwordHash: hashedPassword });

        mockPrisma.user.findUnique
          .mockResolvedValueOnce(user) // findUserByEmail
          .mockResolvedValueOnce(user); // verifyPassword internal lookup

        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: user.email, password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.user).toBeDefined();
        expect(res.body.tokens).toBeDefined();
        expect(res.body.tokens.accessToken).toBeDefined();
        expect(res.body.tokens.refreshToken).toBeDefined();
      });

      it('should reject non-existent user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'nonexistent@example.com', password: 'password123' });

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('No account found');
      });

      it('should reject incorrect password', async () => {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash('correctpassword', 10);
        const user = createTestUser({ passwordHash: hashedPassword });

        mockPrisma.user.findUnique
          .mockResolvedValueOnce(user) // findUserByEmail
          .mockResolvedValueOnce(user); // verifyPassword internal lookup

        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: user.email, password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('Incorrect password');
      });

      it('should reject Google-only user attempting password login', async () => {
        // Create a Google-only user with NO password hash
        const googleUser = {
          ...createTestUser({
            authProvider: 'google',
            googleId: 'google-123',
          }),
          passwordHash: null, // Explicitly null for Google-only user
        };

        // Only mock findUnique once - the controller checks authProvider before verifyPassword
        mockPrisma.user.findUnique.mockResolvedValue(googleUser);

        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: googleUser.email, password: 'password123' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('google_account');
        expect(res.body.message).toContain('Google Sign-In');
      });

      it('should reject invalid email format', async () => {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'invalid-email', password: 'password123' });

        expect(res.status).toBe(400);
      });

      it('should normalize email to lowercase', async () => {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash('password123', 10);
        const user = createTestUser({ email: 'test@example.com', passwordHash: hashedPassword });

        mockPrisma.user.findUnique
          .mockResolvedValueOnce(user)
          .mockResolvedValueOnce(user);

        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'TEST@EXAMPLE.COM', password: 'password123' });

        expect(res.status).toBe(200);
        // Verify findUnique was called with lowercase email
        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { email: 'test@example.com' },
          })
        );
      });
    });
  });

  // ===========================================
  // TOKEN REFRESH TESTS
  // ===========================================
  describe('Token Refresh', () => {
    describe('POST /api/v1/auth/refresh', () => {
      it('should refresh with valid refresh token', async () => {
        const user = createTestUser();
        const refreshToken = generateRefreshToken(user, TEST_JWT_REFRESH_SECRET);

        mockPrisma.user.findUnique.mockResolvedValue(user);

        const res = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken });

        expect(res.status).toBe(200);
        expect(res.body.tokens).toBeDefined();
        expect(res.body.tokens.accessToken).toBeDefined();
        expect(res.body.tokens.refreshToken).toBeDefined();
      });

      it('should reject invalid refresh token', async () => {
        const res = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: generateInvalidToken() });

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('Invalid refresh token');
      });

      it('should reject access token used as refresh token', async () => {
        const user = createTestUser();
        const accessToken = generateAccessToken(user, TEST_JWT_SECRET);

        const res = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: accessToken });

        expect(res.status).toBe(401);
      });

      it('should reject if user no longer exists', async () => {
        const user = createTestUser();
        const refreshToken = generateRefreshToken(user, TEST_JWT_REFRESH_SECRET);

        mockPrisma.user.findUnique.mockResolvedValue(null);

        const res = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken });

        expect(res.status).toBe(401);
        expect(res.body.error).toContain('User not found');
      });

      it('should reject missing refresh token', async () => {
        const res = await request(app)
          .post('/api/v1/auth/refresh')
          .send({});

        expect(res.status).toBe(400);
      });
    });
  });

  // ===========================================
  // PROTECTED ROUTE TESTS
  // ===========================================
  describe('Protected Routes', () => {
    describe('GET /api/v1/auth/me', () => {
      it('should return user profile with valid token', async () => {
        const user = createTestUser();
        const accessToken = generateAccessToken(user, TEST_JWT_SECRET);

        mockPrisma.user.findUnique.mockResolvedValue(user);

        const res = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe(user.email);
        // Should not expose sensitive fields
        expect(res.body.user.passwordHash).toBeUndefined();
      });

      it('should reject request without token', async () => {
        const res = await request(app).get('/api/v1/auth/me');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Unauthorized');
      });

      it('should reject invalid token', async () => {
        const res = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${generateInvalidToken()}`);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid token');
      });

      it('should reject expired token', async () => {
        const user = createTestUser();
        const expiredToken = generateExpiredToken(user, TEST_JWT_SECRET);

        const res = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(res.status).toBe(401);
      });

      it('should reject malformed authorization header', async () => {
        const user = createTestUser();
        const accessToken = generateAccessToken(user, TEST_JWT_SECRET);

        // Missing "Bearer " prefix
        const res = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', accessToken);

        expect(res.status).toBe(401);
      });

      it('should return 404 if user no longer exists', async () => {
        const user = createTestUser();
        const accessToken = generateAccessToken(user, TEST_JWT_SECRET);

        mockPrisma.user.findUnique.mockResolvedValue(null);

        const res = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(404);
        expect(res.body.error).toContain('User not found');
      });
    });
  });

  // ===========================================
  // FORGOT PASSWORD FLOW TESTS
  // ===========================================
  describe('Forgot Password Flow', () => {
    describe('POST /api/v1/auth/forgot-password', () => {
      it('should send reset code for existing user', async () => {
        const user = createTestUser();
        mockPrisma.user.findUnique.mockResolvedValue(user);
        mockVerificationService.checkRateLimit.mockResolvedValue({ allowed: true });
        mockVerificationService.createVerificationToken.mockResolvedValue({ success: true });

        const res = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({ email: user.email });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // Message should not reveal if email exists
        expect(res.body.message).toContain('If your email is registered');
      });

      it('should return success even for non-existent email (security)', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const res = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({ email: 'nonexistent@example.com' });

        // Should return 200 to not reveal if email exists
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should skip Google-only users silently', async () => {
        // Create a Google-only user with explicitly null passwordHash
        const googleUser = {
          ...createTestUser({
            authProvider: 'google',
            googleId: 'google-123',
          }),
          passwordHash: null, // Explicitly null for Google-only user
        };
        mockPrisma.user.findUnique.mockResolvedValue(googleUser);

        const res = await request(app)
          .post('/api/v1/auth/forgot-password')
          .send({ email: googleUser.email });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // Should not have called createVerificationToken because Google-only user
        expect(mockVerificationService.createVerificationToken).not.toHaveBeenCalled();
      });
    });

    describe('POST /api/v1/auth/forgot-password/verify', () => {
      it('should verify valid reset code', async () => {
        mockVerificationService.verifyToken.mockResolvedValue({ valid: true });

        const res = await request(app)
          .post('/api/v1/auth/forgot-password/verify')
          .send({ email: 'test@example.com', code: '123456' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });

      it('should reject invalid reset code', async () => {
        mockVerificationService.verifyToken.mockResolvedValue({
          valid: false,
          error: 'Invalid or expired code',
        });

        const res = await request(app)
          .post('/api/v1/auth/forgot-password/verify')
          .send({ email: 'test@example.com', code: '000000' });

        expect(res.status).toBe(400);
      });
    });

    describe('POST /api/v1/auth/forgot-password/reset', () => {
      it('should reset password with valid code', async () => {
        const user = createTestUser();
        mockPrisma.user.findUnique
          .mockResolvedValueOnce(user) // findUserByEmail
          .mockResolvedValueOnce(user); // updateUserPassword internal lookup
        mockPrisma.user.update.mockResolvedValue(user);
        mockVerificationService.verifyToken.mockResolvedValue({ valid: true });

        const res = await request(app)
          .post('/api/v1/auth/forgot-password/reset')
          .send({ email: user.email, code: '123456', password: 'newpassword123' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.tokens).toBeDefined();
      });

      it('should reject weak password', async () => {
        const res = await request(app)
          .post('/api/v1/auth/forgot-password/reset')
          .send({ email: 'test@example.com', code: '123456', password: 'short' });

        expect(res.status).toBe(400);
      });

      it('should reject invalid code', async () => {
        const user = createTestUser();
        mockPrisma.user.findUnique.mockResolvedValue(user);
        mockVerificationService.verifyToken.mockResolvedValue({
          valid: false,
          error: 'Invalid code',
        });

        const res = await request(app)
          .post('/api/v1/auth/forgot-password/reset')
          .send({ email: user.email, code: '000000', password: 'newpassword123' });

        expect(res.status).toBe(400);
      });
    });
  });
});
