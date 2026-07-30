# Fix All React Native App Build Errors

The `npm run android` build fails after ~8 minutes. `npx tsc --noEmit` reports **800+ TypeScript errors** across the entire `app/src/` tree, but they collapse into **only 5 distinct root causes**. Once those are fixed, both TypeScript and the Android Gradle build should pass.

## Root Cause Analysis

| # | Error Code(s) | Root Cause | Scope |
|---|---|---|---|
| 1 | TS6053 | `tsconfig.json` `extends` can't resolve `@react-native/typescript-config/tsconfig.json` (package uses `exports` map, so the bare specifier must drop the `/tsconfig.json` suffix) | 1 file |
| 2 | TS17004, TS6142, TS1259 | Cascading from #1: `jsx`, `esModuleInterop`, `allowSyntheticDefaultImports` never get inherited, so every `.tsx` file errors | ~40 files (auto-fixed by #1) |
| 3 | TS2741 | `Card` and `Screen` components declare `children: React.ReactNode` as **required**, but callers pass children as nested JSX elements which TS infers correctly — the real problem is that `CardProps` and `ScreenProps` don't export their types so the error message is misleading. Looking deeper, every `<Screen>` and `<Card>` usage *does* pass children. These are **false positives** from the missing `--jsx` flag (root cause #1). | Auto-fixed by #1 |
| 4 | TS2322, TS2345 | `key` prop passed alongside component props (`ContributionCardProps`, `MemberCardProps`, `ClubChip`); `toQuery` param type mismatch with interface params containing optional typed fields; `style` arrays `[styles.x, condition && styles.y]` resolve to `(false \| ViewStyle)[]` instead of `ViewStyle` | ~10 locations |
| 5 | TS2339 | `ContributionCard` accesses `user.role` but `user` is typed as `Pick<User, 'id' | 'name' | 'email'>` which doesn't include `role` | 1 file |

> [!IMPORTANT]
> **~95% of the 800+ errors are cascading from root cause #1** (the broken `extends`). Fixing `tsconfig.json` alone should eliminate all TS17004, TS6142, and TS1259 errors, and most TS2741 errors.

## Proposed Changes

### 1. TypeScript Configuration

#### [MODIFY] [tsconfig.json](file:///c:/workspace/club_projects/ClubMgmt/app/tsconfig.json)
- Change `"extends": "@react-native/typescript-config/tsconfig.json"` → `"extends": "@react-native/typescript-config"` 
- The package's `exports` map routes `"."` → `"./tsconfig.json"`, so the bare specifier works but the subpath doesn't.

---

### 2. Type Signature Fixes — `toQuery` function

#### [MODIFY] [member.api.ts](file:///c:/workspace/club_projects/ClubMgmt/app/src/api/member.api.ts)
- Widen `toQuery` param type from `Record<string, string | number | undefined>` to `Record<string, string | number | boolean | undefined>` to accept `ListMembersParams` (which contains `clubStatus` as a string union) and `ListContributionsParams` (which has optional `clubId`/`userId`).
- The real issue: `ListMembersParams` has a `clubStatus` field typed as `'assigned' | 'unassigned'` which doesn't satisfy `string | number | undefined` literally. Fix by using a generic type constraint or simply widening.

---

### 3. Component Type Fixes

#### [MODIFY] [ContributionCard.tsx](file:///c:/workspace/club_projects/ClubMgmt/app/src/components/ContributionCard.tsx)
- Line 34: `user.role` — The `user` field on `Contribution` is `Pick<User, 'id' | 'name' | 'email'>` which doesn't include `role`. 
- **Fix**: Remove the `role` prop from the `Avatar` call (line 34), since the API doesn't return `role` in the contribution's user object. The Avatar should gracefully handle the missing role.

#### [MODIFY] [Avatar.tsx](file:///c:/workspace/club_projects/ClubMgmt/app/src/components/Avatar.tsx)
- Make the `role` prop optional so it can be omitted when rendering from contribution data.

---

### 4. Style Type Fixes

Several screens pass conditional style arrays like `[styles.row, isMe && styles.meRow]` which TypeScript narrows to `(ViewStyle | false)[]`. This doesn't match `ViewStyle`.

#### Affected files:
- [LeaderboardScreen.tsx](file:///c:/workspace/club_projects/ClubMgmt/app/src/screens/leaderboard/LeaderboardScreen.tsx) — Card `style` prop
- [InvitesScreen.tsx](file:///c:/workspace/club_projects/ClubMgmt/app/src/screens/invites/InvitesScreen.tsx) — Card `style` prop

#### Fix approach:
- Change `Card`'s `style` prop type from `ViewStyle` to `StyleProp<ViewStyle>` (from `react-native`). This accepts `ViewStyle | false | undefined | ViewStyle[]` natively.
- Similarly update `Screen`'s `style` and `contentStyle` props.

#### [MODIFY] [Card.tsx](file:///c:/workspace/club_projects/ClubMgmt/app/src/components/ui/Card.tsx)
- Import `StyleProp` from `react-native`
- Change `style?: ViewStyle` → `style?: StyleProp<ViewStyle>`

#### [MODIFY] [Screen.tsx](file:///c:/workspace/club_projects/ClubMgmt/app/src/components/ui/Screen.tsx)
- Import `StyleProp` from `react-native`
- Change `contentStyle?: ViewStyle` → `contentStyle?: StyleProp<ViewStyle>`
- Change `style?: ViewStyle` → `style?: StyleProp<ViewStyle>`

---

### 5. `key` Prop on Custom Components

TypeScript errors where `key` is spread alongside component props (e.g., `<ContributionCard key={id} contribution={...} />`). In React 19 + TS 19.x, `key` is no longer implicitly included in props. This is actually not a real error — it's **only surfacing because `--jsx` is not set** (root cause #1). Once tsconfig is fixed, React's JSX intrinsics will handle `key` correctly.

**These should auto-resolve with fix #1.**

---

### 6. Android Gradle Build — `jcenter()` (Already Fixed)

The `@react-native-cookies/cookies` package had `jcenter()` calls in its `android/build.gradle`. This was already patched via `patch-package` in the previous session. No additional changes needed.

> [!NOTE]
> After fixing the TypeScript errors, the Android build should proceed past the Metro bundler step. If the previous Gradle error was *only* from jcenter, then both the TS compilation and the native build should succeed.

## Verification Plan

### Automated Tests
```bash
cd app && npx tsc --noEmit       # Should exit 0 with no errors
cd app && npm run android         # Should build and install on emulator
```

### Manual Verification
- Confirm the app launches on the Android emulator
- Confirm navigation between screens works
- Confirm the app communicates with the backend API at `http://10.0.2.2:4000/api`
