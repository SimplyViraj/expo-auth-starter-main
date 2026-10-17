import { AuthProvider } from '@/features/auth/auth-provider';
import { BiometricLockProvider } from '@/features/biometrics/biometric-lock-provider';
import { QueryProvider } from '@/providers/query-provider';
import { AppThemeProvider } from '@/theme/theme-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <BiometricLockProvider>{children}</BiometricLockProvider>
        </AuthProvider>
      </QueryProvider>
    </AppThemeProvider>
  );
}
