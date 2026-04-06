import { apiRequest } from '../../services/api';

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
