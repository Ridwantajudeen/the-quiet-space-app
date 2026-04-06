import { apiRequest } from '../../services/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export const getProfile = async (userId) => {
  return apiRequest(`/profile?userId=${encodeURIComponent(userId)}`);
};

export const updateProfile = async (payload) => {
  return apiRequest('/profile', {
    method: 'PATCH',
    body: payload,
  });
};

export const uploadAvatar = async ({ userId, uri }) => {
  const formData = new FormData();
  const filename = `avatar_${Date.now()}.jpg`;

  formData.append('file', {
    uri,
    name: filename,
    type: 'image/jpeg',
  });

  if (userId) {
    formData.append('userId', userId);
  }

  const response = await fetch(`${API_URL}/uploads/profile`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || 'Upload failed');
  }

  return data?.url;
};

export const deleteAccount = async (userId) => {
  return apiRequest('/account/delete', {
    method: 'POST',
    body: { userId },
  });
};

export const requestPasswordReset = async (email) => {
  return apiRequest('/account/reset-password', {
    method: 'POST',
    body: { email },
  });
};
