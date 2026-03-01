# Coding Conventions

**Analysis Date:** 2026-03-01

## Naming Patterns

**Files:**
- Screen components: PascalCase with `Screen` suffix (e.g., `DashboardScreen.tsx`, `ActiveWorkoutScreen.tsx`)
- Utility functions: camelCase with descriptive names (e.g., `avatarPicker.ts`, `notifications.ts`)
- Services: camelCase with `Service` suffix (e.g., `profileService.ts`, `syncEngine.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useRestTimer.ts`)
- Components: PascalCase without suffix (e.g., `GlassCard.tsx`, `ErrorBoundary.tsx`)
- Context files: PascalCase with `Context` suffix (e.g., `AuthContext.tsx`, `ProfileContext.tsx`)
- Directories: lowercase with hyphens where multi-word (e.g., `src/glass`, `src/components/glass`, `src/database`)

**Functions:**
- camelCase for all functions and methods
- Async functions: use async/await syntax, no special naming prefix (e.g., `async function getProfile()`)
- Handler functions: prefix with `handle` (e.g., `handleRetry`, `handleUpdateProfile`, `handleSaveEdit`)
- Callback functions: inline or named with appropriate prefix (e.g., `onComplete`, `onPress`)
- Getter functions in services: prefix with `get` (e.g., `getProfile`, `getAllMuscleGroups`, `getExercisesByMuscleGroup`)
- Query/search functions: use `search` prefix (e.g., `searchExercises`)
- Setter/mutation functions: use appropriate verb (e.g., `addSet`, `addCustomExercise`, `upsertProfile`, `deleteAvatar`)

**Variables:**
- camelCase for all variables and constants
- State variables: descriptive nouns (e.g., `secondsRemaining`, `isRunning`, `totalDuration`)
- Boolean variables: prefix with `is`, `has`, `should`, or `can` (e.g., `isLoading`, `hasError`, `hasProfile`)
- Interface/type instances: PascalCase when TypeScript interfaces, camelCase when instances (e.g., `interface UserProfile {}`, `const profile: UserProfile`)
- Local constants: UPPER_SNAKE_CASE for module-level constants (e.g., `DEFAULT_REST_SECONDS`, `DAY_LABELS`, `DAY_WEEKDAYS`)
- Refs: Suffix with `Ref` (e.g., `endTimeRef`, `intervalRef`, `isRunningRef`, `onCompleteRef`)

**Types:**
- Interfaces: PascalCase (e.g., `UserProfile`, `ExerciseWithSets`, `WorkoutDetail`)
- Interface naming: Use descriptive names that show composition (`Exercise` vs `ExerciseWithMuscleGroup`)
- Generic types: Use standard capitalization (e.g., `ReactNode`, `ErrorInfo`)
- Type aliases: PascalCase (e.g., `SessionStatus`, `AuthContextValue`)
- Props interfaces: `ComponentNameProps` pattern (e.g., `GlassCardProps`, `UseRestTimerOptions`, `UseRestTimerReturn`)

## Code Style

**Formatting:**
- No explicit formatter configured (no `.prettierrc`, `.eslintrc` found)
- Indentation: 2 spaces (observed throughout codebase)
- Line length: No strict limit enforced, but files generally keep lines under 100 characters
- Trailing commas: Present in arrays/objects
- Semicolons: Always present

**Linting:**
- TypeScript strict mode enabled in `tsconfig.json`: `"strict": true`
- No explicit ESLint configuration file found
- Type checking enforced at compile time via TypeScript

**React & React Native Patterns:**
- Functional components exclusively (no class components except `ErrorBoundary`)
- Hooks used for state management (`useState`, `useCallback`, `useEffect`, `useMemo`)
- Refs used for performance optimization and app state management (`useRef`)
- Memoization: `useCallback` used extensively for event handlers and dependent functions

## Import Organization

**Order:**
1. React and React Native core imports (e.g., `import { useEffect, useState } from 'react'`)
2. React Native components (e.g., `import { View, StyleSheet, Text } from 'react-native'`)
3. External third-party libraries (e.g., `@expo/vector-icons`, `@react-navigation/native`, `expo-blur`)
4. Local absolute imports from `src/` (e.g., `import { useThemeControl } from '../theme'`)
5. Type imports grouped together: `import type { ... } from '...'`

**Path Aliases:**
- No path aliases configured (uses relative paths throughout)
- Relative imports use `../` pattern (e.g., `../theme`, `../services/profileService`)

**Barrel Files:**
- Used for re-exports in organized modules:
  - `src/theme/index.ts`: Re-exports colors, theme provider, and tokens
  - `src/components/glass/index.ts`: Re-exports all glass components
  - This pattern centralizes imports for consumers

## Error Handling

**Patterns:**
- **Try-catch blocks**: Used in async functions, typically catching and rethrowing or returning errors
  - Example pattern: `catch (error) { console.error('context:', error); fallbackValue }`
  - Errors logged to console with descriptive context
- **Service functions**: Return error objects when appropriate (e.g., `{ error: AuthError | null }`)
- **Async/await**: No callback-based promises, all async operations use async/await
- **Null checking**: Use nullish coalescing (`??`) and optional chaining (`?.`)
- **Error boundary**: `ErrorBoundary` component wraps app to catch render errors
- **Specific error codes**: Used in database services (e.g., `error.code === 'PGRST116'` for "not found")

**Error propagation:**
- Service functions throw errors for true failures: `if (error) throw error;`
- Caller-level error handling in screens and contexts via try-catch
- Console error/warn used for non-critical failures: `console.error('Edit profile error:', e)`

## Logging

**Framework:** console (native console.log, console.error, console.warn)

**Patterns:**
- Error logging: `console.error('context:', error)` with descriptive prefix
- Warning logging: `console.warn('Failed to sync notification schedules:', e)` for non-critical issues
- No structured logging library used
- Logging occurs in:
  - Error boundary: `console.error('ErrorBoundary caught:', error, info)`
  - Screen components during failures: `console.error('Edit profile error:', e)`
  - Utility functions for sync/notifications: `console.warn('Widget data fetch failed:', e)`

## Comments

**When to Comment:**
- Use sparingly; code should be self-documenting
- Comments appear for:
  - Safe imports with fallbacks: `// Safe import — expo-quick-actions native module may not be available`
  - Complex logic: `// Recalculate remaining time after returning from background`
  - Workarounds: `// Append cache-buster so image refreshes after update`
  - Data structure explanations: Comments in types explaining field meanings

**JSDoc/TSDoc:**
- Limited use; only for complex interfaces with non-obvious fields
- Example in `types/index.ts`: Comments on `NotificationPreferences` explaining Expo weekday numbering
- Type imports explicitly use `type` keyword: `import type { UserProfile } from '../types'`

## Function Design

**Size:**
- Generally 30-80 lines for simple functions
- Larger screen components up to 1400+ lines (e.g., `ActiveWorkoutScreen.tsx` at 1464 lines)
- Services group related operations in single file (e.g., `services.ts` at 23KB)
- No strict line limits; logical grouping takes precedence

**Parameters:**
- Functions accept simple parameters and objects
- Option objects used for optional parameters: `interface GlassCardProps { blur?: 'light' | 'medium' | 'heavy' }`
- Default parameters: `blur = 'medium'` in component props
- Type-safe: All parameters have explicit types

**Return Values:**
- Typed explicitly: `Promise<UserProfile | null>`, `SyncResult`, etc.
- Async functions return typed promises
- Service functions return domain types: `Exercise[]`, `WorkoutDetail`, etc.
- void used for functions with side effects only

**Callbacks:**
- Used extensively in React components
- Wrapped with `useCallback` for memoization
- Return event objects or void

## Module Design

**Exports:**
- Named exports for functions: `export async function getProfile()`
- Default exports for screens: `export default function SettingsScreen()`
- Type exports explicitly marked: `export type { ThemeColors } from './colors'`
- Re-exports in barrel files to organize public API

**Barrel Files:**
- `src/theme/index.ts`: Re-exports all theme utilities and types
- `src/components/glass/index.ts`: Re-exports all glass UI components
- Pattern: Import from barrel file instead of deep paths

**Context Pattern:**
- Context created with `createContext<ContextValue | undefined>(undefined)`
- Provider component wraps with `useContext` hook
- Custom hook enforces provider usage: `if (!ctx) throw new Error('useAuth must be used within AuthProvider')`
- Context value typed as explicit interface

---

*Convention analysis: 2026-03-01*
