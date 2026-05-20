import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { apiRequest } from '../../services/api';

WebBrowser.maybeCompleteAuthSession();

export const signup = async ({ firstName, lastName, email, password }) => {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: { firstName, lastName, email, password },
  });
};

export const login = async ({ email, password }) => {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
};

export const requestPasswordReset = async (email) => {
  return apiRequest('/account/reset-password', {
    method: 'POST',
    body: { email },
  });
};

const buildRedirectUri = () => {
  return Linking.createURL('auth/callback');
};

const parseCallbackUrl = (url) => {
  const parsed = Linking.parse(url);
  const code = parsed?.queryParams?.code;
  const flowId = parsed?.queryParams?.state;

  if (typeof code !== 'string' || typeof flowId !== 'string') {
    throw new Error('We could not finish that sign-in. Please try again.');
  }

  return { code, flowId };
};

export const signInWithProvider = async (provider) => {
  const redirectTo = buildRedirectUri();
  const start = await apiRequest('/auth/oauth/start', {
    method: 'POST',
    body: { provider, redirectTo },
  });

  const result = await WebBrowser.openAuthSessionAsync(start.authUrl, redirectTo);
  if (result.type !== 'success' || !result.url) {
    throw new Error('The sign-in was canceled.');
  }

  const { code, flowId } = parseCallbackUrl(result.url);
  return apiRequest('/auth/oauth/complete', {
    method: 'POST',
    body: { code, flowId },
  });
};
