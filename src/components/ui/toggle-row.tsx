import { Switch } from 'react-native';

import { ListRow } from '@/components/ui/list-row';
import { useAppTheme } from '@/theme/theme-provider';

type ToggleRowProps = {
  label: string;
  body?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export function ToggleRow({ label, body, value, onValueChange, disabled = false }: ToggleRowProps) {
  const { colors } = useAppTheme();

  return (
    <ListRow
      title={label}
      body={body}
      trailing={<Switch value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{ false: colors.border, true: colors.primarySoft }} thumbColor={value ? colors.primary : colors.surface} />}
    />
  );
}
