# Technology Stack

**Analysis Date:** 2026-03-01

## Languages

**Primary:**
- TypeScript 5.9.2 - All source code (strict mode enabled)
- SQL - Supabase schema definitions and migrations

**Secondary:**
- JavaScript - Expo configuration and build scripts

## Runtime

**Environment:**
- Node.js (via npm) - Development and build environment
- Expo 54.0.33 - Cross-platform runtime for React Native
- React 19.1.0 - UI framework
- React Native 0.81.5 - Native application framework

**Package Manager:**
- npm - Primary package manager
- Lockfile: package-lock.json present

## Frameworks

**Core:**
- Expo 54.0.33 - Cross-platform mobile development framework
- React Native 0.81.5 - Native mobile application runtime
- React Navigation 7.x - Navigation across all platforms
  - `@react-navigation/native` 7.1.28
  - `@react-navigation/native-stack` 7.12.0
  - `@react-navigation/bottom-tabs` 7.13.0

**UI/Styling:**
- React Native StyleSheet - All styling via StyleSheet API
- Expo Linear Gradient 15.0.8 - Gradient rendering
- Expo Blur 15.0.8 - Blur effects
- `@expo/vector-icons` 15.0.3 - Icon library (Ionicons)

**Data & State:**
- Expo SQLite 16.0.10 - Local database (SQLite 3)
- React Context API - State management (AuthContext defined in `src/contexts/AuthContext.tsx`)
- AsyncStorage 2.2.0 - Persistent key-value storage via `@react-native-async-storage/async-storage`

**Charts & Visualization:**
- react-native-gifted-charts 1.4.74 - LineChart and BarChart components

**Device Integration:**
- Expo Notifications 0.32.16 - Push/local notifications
- Expo Haptics 15.0.8 - Haptic feedback
- Expo Image Picker 17.0.10 - Photo/gallery access
- Expo Keep Awake 15.0.8 - Screen wake lock
- Expo Quick Actions 6.0.1 - Home screen quick actions (iOS & Android)
- react-native-android-widget 0.20.1 - Android home screen widget support

**Platform Support:**
- react-native-web 0.21.0 - Web browser support
- react-native-screens 4.16.0 - Native screen stacks
- react-native-safe-area-context 5.6.0 - Safe area handling
- react-native-url-polyfill 3.0.0 - URL API polyfill for React Native
- react-native-svg 15.12.1 - SVG rendering

**Testing & Dev:**
- TypeScript compiler (strict mode)
- No formal test framework configured

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.98.0 - Cloud database and authentication client
- @react-native-async-storage/async-storage 2.2.0 - Local data persistence required for auth tokens and app state
- expo-sqlite 16.0.10 - Local SQLite database for offline-first architecture

**Infrastructure:**
- react-native-gifted-charts 1.4.74 - Progress visualization (charts)
- expo-notifications 0.32.16 - Workout reminders and inactivity nudges
- react-native-android-widget 0.20.1 - Android home screen workout widget

## Configuration

**Environment:**
- Expo config file: `app.json` (standard Expo configuration)
- TypeScript: `tsconfig.json` (extends `expo/tsconfig.base`, strict mode enabled)
- Environment variables: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (required - set in `.env.local`)
- Expo uses prefix `EXPO_PUBLIC_` for variables accessible to frontend

**Build:**
- Expo build system (managed workflow)
- App entry point: `index.ts`
- Main component: `App.tsx`
- Build targets: Android, iOS (via Expo), Web (via Expo Web)

**Expo Plugins:**
- expo-sqlite - SQLite database support
- expo-notifications - Notification scheduling
- expo-quick-actions - Quick action shortcuts
- react-native-android-widget - Android widget support (WorkoutWidget configured)

## Platform Requirements

**Development:**
- Node.js with npm
- Expo CLI (via npm scripts: `npm start`, `npm run android`, `npm run ios`, `npm run web`)
- TypeScript 5.9.2 or later

**Production:**
- iOS: Apple Developer account and build tools (compiled via Expo)
- Android: Google Play credentials (compiled via Expo)
- Supabase project with configured PostgreSQL database and authentication

**App Configuration:**
- iOS bundle identifier: `com.workouttracker.app`
- Android package: `com.workouttracker.app`
- Scheme: `workouttracker://`
- Supports portrait orientation only
- New React Native Architecture enabled (`newArchEnabled: true`)

---

*Stack analysis: 2026-03-01*
