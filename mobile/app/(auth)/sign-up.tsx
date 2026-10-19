import { Redirect } from 'expo-router';

// Preserve existing registration links after the route rename.
export default function SignUpRedirect() {
  return <Redirect href="/register" />;
}
