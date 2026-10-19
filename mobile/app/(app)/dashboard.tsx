import { Redirect } from 'expo-router';

// Preserve existing dashboard links; the protected index owns the home screen.
export default function DashboardRedirect() {
  return <Redirect href="/(app)" />;
}
