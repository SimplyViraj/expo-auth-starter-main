import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ImagePicker from 'expo-image-picker';

import { pickProfilePhoto } from '@/features/profile/services/pick-profile-photo';
import { profilePhotoPolicy } from '@/lib/config/profile-photo-policy';

const mocks = vi.hoisted(() => ({
  manipulate: vi.fn(), crop: vi.fn(), resize: vi.fn(), render: vi.fn(), save: vi.fn(), releaseContext: vi.fn(), releaseImage: vi.fn(),
}));
vi.mock('expo-image-picker', () => ({ launchImageLibraryAsync: vi.fn() }));
vi.mock('expo-image-manipulator', () => ({ ImageManipulator: { manipulate: mocks.manipulate }, SaveFormat: { JPEG: 'jpeg' } }));

const launch = vi.mocked(ImagePicker.launchImageLibraryAsync);
const asset = { uri: 'file:///photo.png', width: 1600, height: 900, fileSize: 20_000 };

beforeEach(() => {
  launch.mockResolvedValue({ canceled: false, assets: [asset] });
  mocks.manipulate.mockReturnValue({ crop: mocks.crop, resize: mocks.resize, renderAsync: mocks.render, release: mocks.releaseContext });
  mocks.render.mockResolvedValue({ saveAsync: mocks.save, release: mocks.releaseImage });
  mocks.save.mockResolvedValue({ base64: 'dGVzdA==', uri: 'file:///prepared.jpg' });
});

describe('profile photo selection', () => {
  it('leaves the existing photo unchanged when the picker is cancelled', async () => {
    launch.mockResolvedValue({ canceled: true, assets: null });
    await expect(pickProfilePhoto()).resolves.toBeNull();
    expect(mocks.manipulate).not.toHaveBeenCalled();
  });

  it('prepares a square JPEG thumbnail and releases native image resources', async () => {
    await expect(pickProfilePhoto()).resolves.toEqual({ base64: 'dGVzdA==', uri: 'data:image/jpeg;base64,dGVzdA==' });
    expect(launch).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], exif: false }));
    expect(mocks.crop).toHaveBeenCalledWith({ originX: 350, originY: 0, width: 900, height: 900 });
    expect(mocks.resize).toHaveBeenCalledWith({ width: profilePhotoPolicy.thumbnailSize, height: profilePhotoPolicy.thumbnailSize });
    expect(mocks.save).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.85, base64: true });
    expect(mocks.releaseContext).toHaveBeenCalledOnce();
    expect(mocks.releaseImage).toHaveBeenCalledOnce();
  });

  it('rejects source files beyond the local processing limit', async () => {
    launch.mockResolvedValue({ canceled: false, assets: [{ ...asset, fileSize: profilePhotoPolicy.maxSourceBytes + 1 }] });
    await expect(pickProfilePhoto()).rejects.toThrow('20 MB');
    expect(mocks.manipulate).not.toHaveBeenCalled();
  });

  it('rejects unreadable assets', async () => {
    launch.mockResolvedValue({ canceled: false, assets: [{ ...asset, width: 0 }] });
    await expect(pickProfilePhoto()).rejects.toThrow('valid image');
  });

  it('rejects a failed encoding and releases image resources', async () => {
    mocks.save.mockResolvedValue({ uri: 'file:///prepared.jpg' });
    await expect(pickProfilePhoto()).rejects.toThrow('Could not prepare');
    expect(mocks.releaseContext).toHaveBeenCalledOnce();
    expect(mocks.releaseImage).toHaveBeenCalledOnce();
  });

  it('rejects a prepared image that exceeds the upload limit', async () => {
    mocks.save.mockResolvedValue({ base64: 'A'.repeat(4 * Math.ceil(profilePhotoPolicy.maxUploadBytes / 3) + 4) });
    await expect(pickProfilePhoto()).rejects.toThrow('too large');
  });

  it('preserves picker permission errors for the editor to show', async () => {
    launch.mockRejectedValue(new Error('Photo access was denied.'));
    await expect(pickProfilePhoto()).rejects.toThrow('Photo access was denied.');
  });
});
