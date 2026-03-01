# Testing Patterns

**Analysis Date:** 2026-03-01

## Test Framework

**Runner:** Not detected

**Assertion Library:** Not detected

**Run Commands:** Not applicable - no test runner configured

**Status:** No testing infrastructure currently implemented in the codebase

## Test File Organization

**Location:** Not applicable - no test files exist

**Naming:** Not applicable - no test files exist

**Structure:** Not applicable - no test files exist

## Observations & Recommendations

**Current State:**
- The codebase has no test files (no `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx` files)
- No Jest, Vitest, or other test runner configured
- No test configuration files (jest.config.js, vitest.config.ts, etc.)
- TypeScript strict mode enabled (`tsconfig.json` sets `"strict": true`), providing compile-time type safety

**Code Structure for Future Testing:**
The codebase has moderate testability without dedicated test files:

**Testable Components:**
- Service layer functions: `src/services/profileService.ts`, `src/services/syncEngine.ts` contain pure async functions suitable for unit testing
- Database service functions: `src/database/services.ts` contains query and mutation functions that could be tested with a mock database
- Utility functions: `src/utils/notifications.ts`, `src/utils/avatarPicker.ts` contain standalone functions
- Custom hooks: `src/hooks/useRestTimer.ts` follows standard Hook patterns and could use `@testing-library/react-hooks`

**Testable Business Logic:**
- Context providers: `src/contexts/AuthContext.tsx`, `src/contexts/ProfileContext.tsx` manage state updates
- Timer calculations in `useRestTimer`: Complex math for remaining time, background app transitions
- Sync engine: `src/services/syncEngine.ts` handles data synchronization logic

**Not Easily Testable (Without Mocking):**
- Screen components: Tightly coupled to navigation, theme, and database
- React Native UI components: Require test renderer or react-native-testing-library
- Async storage interactions: Platform-specific

## Test Structure

**Recommended Pattern (Based on Codebase Structure):**

```typescript
// For service functions
describe('profileService', () => {
  describe('getProfile', () => {
    it('should return user profile when found', async () => {
      // Mock supabase
      // Assert profile returned
    });

    it('should return null when profile not found', async () => {
      // Mock supabase with PGRST116 error
      // Assert null returned
    });

    it('should throw on unexpected error', async () => {
      // Mock supabase with error
      // Assert error thrown
    });
  });
});

// For hooks
describe('useRestTimer', () => {
  it('should track remaining seconds', () => {
    // renderHook(useRestTimer)
    // act(() => startTimer(60))
    // Assert secondsRemaining updates
  });
});

// For context providers
describe('AuthProvider', () => {
  it('should provide auth state to consumers', async () => {
    // render(AuthProvider with test child)
    // Check useAuth hook returns expected values
  });
});
```

**Error Testing Pattern (Based on Code):**
The codebase uses specific error codes for differentiation:

```typescript
// From profileService.ts line 11
if (error && error.code === 'PGRST116') return null; // Not found
if (error) throw error;

// Tests should verify this pattern:
describe('error handling', () => {
  it('should handle 404 errors as null', async () => {
    mockSupabase.to.returns({ error: { code: 'PGRST116' } });
    const result = await getProfile('id');
    expect(result).toBeNull();
  });
});
```

## Mocking

**Recommended Framework:** Jest or Vitest with Mock utilities

**Patterns:**

```typescript
// Mock external libraries
jest.mock('@supabase/supabase-js');
jest.mock('@react-native-async-storage/async-storage');

// Mock context consumers
const mockAuthContext = {
  user: { id: 'test-user' },
  session: null,
  isLoading: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
};

// Mock navigation (React Navigation)
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock theme context
jest.mock('../theme', () => ({
  useThemeControl: () => ({
    colors: mockColors,
    isDark: false,
  }),
}));
```

**What to Mock:**
- External APIs: Supabase client (`src/lib/supabase.ts`)
- Navigation: React Navigation hooks
- Storage: AsyncStorage
- Platform-specific modules: `react-native-android-widget`, `expo-notifications`
- Database: `src/database/database.ts` getDatabase() calls
- Context providers: Auth, Profile, Sync contexts

**What NOT to Mock:**
- Pure utility functions: `formatTime()`, `formatRelativeTime()`
- Constants and tokens: Theme colors, spacing, typography
- Business logic: Sync algorithms, timer calculations (unless testing integration)

## Fixtures and Factories

**Recommended Test Data Pattern (Based on Types):**

```typescript
// Factory for creating test UserProfile
export function createUserProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    id: 'test-uuid',
    display_name: 'Test User',
    bio: 'Test bio',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Factory for creating test Exercise
export function createExercise(overrides?: Partial<Exercise>): Exercise {
  return {
    id: 1,
    name: 'Bench Press',
    muscle_group_id: 1,
    is_custom: 0,
    ...overrides,
  };
}

// Factory for creating test Workout
export function createWorkout(overrides?: Partial<Workout>): Workout {
  return {
    id: 1,
    date: '2024-01-01',
    muscle_group_id: 1,
    notes: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
```

**Location:** Recommend `src/testing/factories.ts` or `src/__fixtures__/` directory

## Coverage

**Requirements:** Not enforced (no coverage configuration found)

**Recommendation for Setup:**

```bash
# In package.json scripts
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"

# Jest config
{
  "testEnvironment": "node",
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/screens/**",
    "!src/widget/**"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 60,
      "functions": 60,
      "lines": 60,
      "statements": 60
    }
  }
}
```

## Test Types

**Unit Tests:**
- **Scope:** Individual functions, hooks, utilities
- **Approach:** Test in isolation with mocked dependencies
- **Files:** `src/services/`, `src/utils/`, `src/hooks/`
- **Example:** Test `getProfile()` returns null for 404 errors

**Integration Tests:**
- **Scope:** Multiple components working together
- **Approach:** Mock external APIs (Supabase, AsyncStorage) but test real context logic
- **Files:** Context providers, service combinations
- **Example:** Test `ProfileProvider` fetches and updates profile through `useProfile` hook

**E2E Tests:**
- **Framework:** Not used currently
- **Recommendation:** Could use Detox for React Native, but not required for current codebase
- **Scope:** Would test full user flows on real/simulated devices

## Common Patterns

**Async Testing:**
```typescript
// Service functions return typed Promises
export async function getProfile(userId: string): Promise<UserProfile | null>

// Test pattern with async/await
describe('getProfile', () => {
  it('should fetch profile', async () => {
    const profile = await getProfile('user-id');
    expect(profile).toEqual(expect.objectContaining({
      id: 'user-id',
    }));
  });
});

// Hook async pattern (useRestTimer)
describe('useRestTimer', () => {
  it('should countdown timer', async () => {
    const { result } = renderHook(() => useRestTimer({ onComplete: () => {} }));
    act(() => {
      result.current.startTimer(5);
    });
    await waitFor(() => {
      expect(result.current.secondsRemaining).toBeLessThan(5);
    });
  });
});
```

**Error Testing:**
```typescript
// Service layer error handling (from profileService.ts)
describe('error handling', () => {
  it('should throw on Supabase errors', async () => {
    mockSupabase.from.returns({
      select: () => ({ single: () => ({ error: new Error('DB error') }) }),
    });
    await expect(getProfile('id')).rejects.toThrow('DB error');
  });

  it('should handle not found (PGRST116) as null', async () => {
    mockSupabase.from.returns({
      select: () => ({
        eq: () => ({
          single: () => ({
            error: { code: 'PGRST116' }
          })
        }),
      }),
    });
    const result = await getProfile('id');
    expect(result).toBeNull();
  });

  it('should log errors for debugging', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    // Trigger error condition
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('context:'),
      expect.any(Error)
    );
  });
});
```

## Recommended Setup Strategy

**Phase 1: Service Layer Tests**
- Start with `src/services/` unit tests (simpler, well-isolated)
- Mock Supabase client
- Target: 80%+ coverage

**Phase 2: Hook Tests**
- Add tests for `src/hooks/useRestTimer.ts`
- Use @testing-library/react-hooks
- Test state updates and effects

**Phase 3: Context Tests**
- Test Auth and Profile providers
- Verify context value updates
- Test provider composition

**Phase 4: Screen Integration Tests**
- Test screen components with mocked navigation and context
- Focus on critical user paths
- Lower priority due to complexity

---

*Testing analysis: 2026-03-01*
