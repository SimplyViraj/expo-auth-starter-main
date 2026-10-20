import { useRef, useState } from 'react';

import { Alert } from '@/components/feedback/alert';
import { appToast } from '@/components/feedback/app-toast';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProfileAvatar } from '@/features/profile/components/profile-avatar';
import { useRemoveProfilePhoto, useUploadProfilePhoto } from '@/features/profile/hooks/use-profile';
import type { MemberProfile } from '@/features/profile/profile-contract';
import { pickProfilePhoto, type SelectedProfilePhoto } from '@/features/profile/services/pick-profile-photo';
import { ApiError } from '@/lib/api/api-client';

export function ProfilePhotoEditor({ profile, onClose }: { profile: MemberProfile; onClose: () => void }) {
  const upload = useUploadProfilePhoto();
  const remove = useRemoveProfilePhoto();
  const [photo, setPhoto] = useState<SelectedProfilePhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const picking = useRef(false);
  const busy = isPicking || upload.isPending || remove.isPending;

  async function choosePhoto() {
    if (picking.current) return;
    picking.current = true;
    setIsPicking(true);
    setError(null);
    try {
      const selected = await pickProfilePhoto();
      if (selected) setPhoto(selected);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open your photos. Please try again.');
    } finally {
      picking.current = false;
      setIsPicking(false);
    }
  }

  async function savePhoto() {
    if (!photo || busy) return;
    setError(null);
    try {
      await upload.mutateAsync(photo.base64);
      appToast.success('Profile photo updated');
      onClose();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Check your connection and try again. Your photo has not been saved.');
    }
  }

  async function removePhoto() {
    if (busy) return;
    setError(null);
    try {
      await remove.mutateAsync();
      appToast.success('Profile photo removed');
      onClose();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Check your connection and try again. Your photo has not been removed.');
    }
  }

  return (
    <Card>
      <AppText variant="subtitle">Edit profile photo</AppText>
      <ProfileAvatar image={photo?.uri ?? profile.image} name={profile.name} size={112} />
      <AppText tone="muted">Choose a photo from your library. You can preview it before saving.</AppText>
      {error ? <Alert title="Photo not updated" body={error} tone="danger" /> : null}
      <Button label={photo ? 'Choose another photo' : 'Choose photo'} icon="photo" variant="outline" loading={isPicking} disabled={busy} onPress={() => void choosePhoto()} />
      {photo ? <Button label="Save photo" loading={upload.isPending} disabled={busy} onPress={() => void savePhoto()} /> : null}
      {profile.image && !photo ? <Button label="Remove photo" variant="ghost" loading={remove.isPending} disabled={busy} onPress={() => void removePhoto()} /> : null}
      <Button label="Cancel" variant="ghost" disabled={upload.isPending || remove.isPending} onPress={onClose} />
    </Card>
  );
}
