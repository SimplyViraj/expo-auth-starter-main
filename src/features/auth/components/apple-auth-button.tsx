import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-provider";
import { signInWithApple } from "@/lib/auth/apple-sign-in";
import { appToast } from "@/lib/toast/app-toast";
import { useAppTheme } from "@/theme/theme-provider";

export function AppleAuthButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { refreshSession } = useAuth();
  const { colors, motion, radius } = useAppTheme();
  const [loading, setLoading] = useState(false);

  if (Platform.OS !== "ios") return null;

  async function handlePress() {
    setLoading(true);

    try {
      const outcome = await signInWithApple();
      if (outcome === "cancelled") return;

      await refreshSession();
    } catch (error) {
      appToast.error("Could not continue with Apple", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      accessibilityLabel="Continue with Apple"
      accessibilityRole="button"
      disabled={loading}
      onPress={() => void handlePress()}
      style={({ pressed }) => [
        {
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          opacity: loading ? 0.56 : pressed ? motion.opacity.pressed : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Icon name="apple" size={24} color={colors.text} />
      )}
    </Pressable>
  );
}
