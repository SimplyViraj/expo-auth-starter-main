import { Tabs } from 'expo-router';

import { Icon, type IconName } from '@/components/ui/icon';
import { useAppTheme } from '@/theme/theme-provider';

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'appointments', title: 'Appointments', icon: 'calendar' },
  { name: 'wellness', title: 'Wellness', icon: 'wellness' },
  { name: 'profile', title: 'Profile', icon: 'person' },
];

export default function MemberTabsLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      initialRouteName="index"
      backBehavior="initialRoute"
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarHideOnKeyboard: true,
      }}>
      {tabs.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarAccessibilityLabel: `${title} tab`,
            tabBarIcon: ({ color, size }) => <Icon name={icon} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
