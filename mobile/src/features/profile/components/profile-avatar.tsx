import { useState } from 'react';
import { Image, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useAppTheme } from '@/theme/theme-provider';

export function ProfileAvatar({ image, name, size = 88 }: { image: string | null; name: string; size?: number }) {
  const { colors, radius } = useAppTheme();
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <View style={{ width: size, height: size, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {image && image !== failedImage ? (
        <Image
          accessibilityLabel={`${name}'s profile photo`}
          source={{ uri: image }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFailedImage(image)}
        />
      ) : (
        <AppText variant="hero" tone="primary" accessibilityLabel={`${name}'s initials`}>{initials || '?'}</AppText>
      )}
    </View>
  );
}
