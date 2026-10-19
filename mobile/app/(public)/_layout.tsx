import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { HeaderIconButton } from '@/components/ui/header-icon-button';
import { useAppTheme } from '@/theme/theme-provider';

export default function PublicLayout() {
  const { colors } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen
        name="public"
        options={{
          title: 'Daily tip',
          headerLeft: () => (
            <HeaderIconButton
              accessibilityLabel="Go back"
              icon="arrowLeft"
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/');
              }}
            />
          ),
        }}
      />
    </Stack>
  );
}
