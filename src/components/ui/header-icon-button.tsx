import { Pressable } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { useAppTheme } from '@/theme/theme-provider';

type HeaderIconButtonProps = {
  accessibilityLabel: string;
  color?: string;
  disabled?: boolean;
  icon: IconName;
  onPress: () => void;
};

export function HeaderIconButton({ accessibilityLabel, color, disabled = false, icon, onPress }: HeaderIconButtonProps) {
  const { colors, motion, radius } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.pill,
        opacity: disabled ? 0.4 : pressed ? motion.opacity.pressed : 1,
      })}>
      <Icon name={icon} size={21} color={color ?? colors.text} />
    </Pressable>
  );
}
