import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Alert } from '@/components/feedback/alert';
import { appToast } from '@/components/feedback/app-toast';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useUpdateProfile } from '@/features/profile/hooks/use-profile';
import { updateProfileSchema, type MemberProfile, type UpdateProfileInput } from '@/features/profile/profile-contract';
import { ApiError } from '@/lib/api/api-client';

export function ProfileForm({ profile, onClose }: { profile: MemberProfile; onClose: () => void }) {
  const updateProfile = useUpdateProfile();
  const { control, handleSubmit, setError, clearErrors, formState: { errors, isDirty, isSubmitting, isValid } } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: profile.name, username: profile.username ?? '' },
    mode: 'onChange',
  });

  async function submit(values: UpdateProfileInput) {
    clearErrors('root');
    try {
      await updateProfile.mutateAsync(values);
      appToast.success('Profile updated');
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'USERNAME_TAKEN') {
        setError('username', { message: error.message });
        return;
      }
      setError('root', {
        message: error instanceof ApiError ? error.message : 'Check your connection and try again. Your changes have not been saved.',
      });
    }
  }

  return (
    <Card>
      <AppText variant="subtitle">Edit profile</AppText>
      <Controller
        control={control}
        name="name"
        render={({ field: { onBlur, onChange, value }, fieldState }) => (
          <Input
            label="Full name"
            accessibilityLabel="Full name"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={fieldState.error?.message}
            autoComplete="name"
            autoCapitalize="words"
            maxLength={80}
            editable={!isSubmitting}
            leftIcon="person"
          />
        )}
      />
      <Controller
        control={control}
        name="username"
        render={({ field: { onBlur, onChange, value }, fieldState }) => (
          <Input
            label="Username"
            accessibilityLabel="Username"
            value={value}
            onBlur={onBlur}
            onChangeText={(text) => onChange(text.toLowerCase())}
            error={fieldState.error?.message}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
            editable={!isSubmitting}
            leftIcon="edit"
          />
        )}
      />
      <AppText variant="caption" tone="muted">Use 3–24 letters, numbers, or underscores. Start with a letter.</AppText>
      {errors.root?.message ? <Alert title="Profile not saved" body={errors.root.message} tone="danger" /> : null}
      <Button label="Save changes" loading={isSubmitting} disabled={!isDirty || !isValid} onPress={() => void handleSubmit(submit)()} />
      <Button label="Cancel" variant="ghost" disabled={isSubmitting} onPress={onClose} />
    </Card>
  );
}
