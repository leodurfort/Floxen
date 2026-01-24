# Test Strategy Document

## Overview
This document outlines the testing strategy for the Floxen API, covering authentication flows, shop connections (WooCommerce OAuth), and sync triggers.

## Test Stack
- **Framework**: Vitest
- **HTTP Testing**: Supertest
- **Mocking**: Vitest's built-in mocking capabilities
- **Database**: Mocked Prisma client (no real database calls in unit tests)

## Test Categories

### 1. Authentication Flow Tests (`auth.test.ts`)

#### 1.1 Registration Flow (Multi-Step)
| Test Case | Endpoint | Expected Behavior |
|-----------|----------|-------------------|
| Start registration with valid email | `POST /auth/register/start` | Returns success, sends verification code |
| Start registration with invalid email | `POST /auth/register/start` | Returns 400 with validation error |
| Start registration with existing verified email | `POST /auth/register/start` | Returns 409 conflict |
| Verify email with valid code | `POST /auth/register/verify` | Returns success |
| Verify email with invalid code | `POST /auth/register/verify` | Returns 400 |
| Verify email with expired code | `POST /auth/register/verify` | Returns 400 |
| Resend verification code | `POST /auth/register/resend` | Returns success |
| Resend verification code (rate limited) | `POST /auth/register/resend` | Returns 429 |
| Set password with valid data | `POST /auth/register/password` | Returns 201 with tokens |
| Set password with weak password | `POST /auth/register/password` | Returns 400 |
| Complete profile with valid data | `POST /auth/register/complete` | Returns success with tokens |
| Complete profile without verification | `POST /auth/register/complete` | Returns 400 |

#### 1.2 Login Flow
| Test Case | Endpoint | Expected Behavior |
|-----------|----------|-------------------|
| Login with valid credentials | `POST /auth/login` | Returns user + tokens |
| Login with invalid email | `POST /auth/login` | Returns 401 |
| Login with invalid password | `POST /auth/login` | Returns 401 |
| Login with Google-only account | `POST /auth/login` | Returns 401 with google_account error |
| Login with unverified email | `POST /auth/login` | Returns tokens (email verification separate) |

#### 1.3 Token Refresh
| Test Case | Endpoint | Expected Behavior |
|-----------|----------|-------------------|
| Refresh with valid token | `POST /auth/refresh` | Returns new tokens |
| Refresh with invalid token | `POST /auth/refresh` | Returns 401 |
| Refresh with expired token | `POST /auth/refresh` | Returns 401 |
| Refresh with access token (wrong type) | `POST /auth/refresh` | Returns 401 |

#### 1.4 Protected Routes
| Test Case | Endpoint | Expected Behavior |
|-----------|----------|-------------------|
| Access /me with valid token | `GET /auth/me` | Returns user profile |
| Access /me without token | `GET /auth/me` | Returns 401 |
| Access /me with invalid token | `GET /auth/me` | Returns 401 |
| Access /me with expired token | `GET /auth/me` | Returns 401 |

### 2. Shop Connection Tests (`shop.test.ts`)

#### 2.1 Shop Creation
| Test Case | Endpoint | Expected Behavior |
|-----------|----------|-------------------|
| Create shop with valid WooCommerce URL | `POST /shops` | Returns shop + OAuth URL |
| Create shop with invalid URL | `POST /shops` | Returns 400 |
| Create shop with non-WooCommerce URL | `POST /shops` | Returns 500 |
| Create shop with already-connected URL | `POST /shops` | Returns 500 |
| Create shop without auth | `POST /shops` | Returns 401 |

#### 2.2 OAuth Flow
| Test Case | Endpoint | Expected Behavior |
|-----------|----------|-------------------|
| OAuth callback with valid credentials | `POST /shops/:id/oauth/callback` | Returns shop with isConnected=true |
| OAuth callback missing credentials | `POST /shops/:id/oauth/callback` | Returns 400 |
| OAuth callback for non-existent shop | `POST /shops/:id/oauth/callback` | Returns 500 |
| Get OAuth URL for retry | `GET /shops/:id/oauth-url` | Returns OAuth URL |
| Get OAuth URL for connected shop | `GET /shops/:id/oauth-url` | Returns 400 |

#### 2.3 Shop Management
| Test Case | Endpoint | Expected Behavior |
|-----------|----------|-------------------|
| List user's shops | `GET /shops` | Returns array of shops |
| Get shop by ID | `GET /shops/:id` | Returns shop details |
| Get another user's shop | `GET /shops/:id` | Returns 403 |
| Update shop settings | `PATCH /shops/:id` | Returns updated shop |
| Delete shop | `DELETE /shops/:id` | Returns success |
| Verify connection | `POST /shops/:id/verify` | Returns verification status |

### 3. Sync Trigger Tests (`sync.test.ts`)

#### 3.1 Sync Operations
| Test Case | Endpoint | Expected Behavior |
|-----------|----------|-------------------|
| Trigger sync for connected shop | `POST /shops/:id/sync` | Returns QUEUED status |
| Trigger sync without auth | `POST /shops/:id/sync` | Returns 401 |
| Trigger sync for non-existent shop | `POST /shops/:id/sync` | Returns 404 |
| Trigger sync when reselection needed | `POST /shops/:id/sync` | Returns 400 with NEEDS_RESELECTION |
| Trigger sync (Redis unavailable) | `POST /shops/:id/sync` | Returns 503 |

#### 3.2 Sync History
| Test Case | Endpoint | Expected Behavior |
|-----------|----------|-------------------|
| Get sync history | `GET /shops/:id/sync/history` | Returns array of sync batches |

#### 3.3 Feed Operations
| Test Case | Endpoint | Expected Behavior |
|-----------|----------|-------------------|
| Push feed generation | `POST /shops/:id/sync/push` | Returns pushed=true |
| Push feed during sync | `POST /shops/:id/sync/push` | Returns 409 conflict |
| Preview feed | `GET /shops/:id/sync/feed/preview` | Returns feed items |

## Test Infrastructure

### Mocking Strategy
1. **Prisma Client**: Mock all database operations
2. **Verification Service**: Mock email sending and token generation
3. **Redis/BullMQ**: Mock queue operations
4. **External APIs**: Mock WooCommerce API calls
5. **Encryption**: Mock encryption functions for credentials

### Test Utilities
- `createTestUser()`: Generate mock user data
- `createTestShop()`: Generate mock shop data
- `generateTestToken()`: Create valid JWT for testing
- `mockPrisma()`: Setup Prisma mock with common responses

### Test Data
- Test user: `test@example.com` / `password123`
- Test shop URL: `https://test-store.example.com`
- Test WooCommerce credentials: Mock consumer key/secret

## Coverage Goals
- **Line Coverage**: 80%+
- **Branch Coverage**: 75%+
- **Critical Paths**: 100% (auth, OAuth, sync triggers)

## Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts

# Run in watch mode
npm run test:watch
```

## CI/CD Integration
Tests should run:
- On every pull request
- Before deployment to staging/production
- As part of the build pipeline
