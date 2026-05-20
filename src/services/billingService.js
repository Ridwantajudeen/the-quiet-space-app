import { Platform } from 'react-native';

import { apiRequest } from './api';

export const PREMIUM_PRODUCT_ID = 'com.thequietspace.premium.monthly';

const normalizeStore = (store) => {
  if (store === 'google') return 'google';
  if (store === 'apple') return 'apple';
  return Platform.OS === 'android' ? 'google' : 'apple';
};

const normalizePurchaseToken = (purchase) =>
  purchase?.purchaseTokenAndroid || purchase?.purchaseToken || null;

export const claimPremiumPurchase = async ({ purchase, source = 'purchase' }) => {
  const transactionId =
    purchase?.transactionId || purchase?.id || purchase?.transaction_id || '';
  const originalTransactionId =
    purchase?.originalTransactionIdentifierIOS ||
    purchase?.originalTransactionId ||
    null;
  const expiresAt =
    purchase?.expirationDateIOS || purchase?.expirationDate || null;

  if (!transactionId) {
    throw new Error('We could not confirm that purchase.');
  }

  return apiRequest('/billing/subscription/claim', {
    method: 'POST',
    body: {
      productId: purchase?.productId || PREMIUM_PRODUCT_ID,
      transactionId,
      originalTransactionId,
      purchaseToken: normalizePurchaseToken(purchase),
      store: normalizeStore(purchase?.store),
      expiresAt,
      isActive: true,
      source,
    },
  });
};

export const syncPremiumSubscriptionState = async ({ subscriptions = [] } = {}) => {
  return apiRequest('/billing/subscription/sync', {
    method: 'POST',
    body: {
      subscriptions: subscriptions.map((item) => ({
        productId: item?.productId || PREMIUM_PRODUCT_ID,
        transactionId:
          item?.transactionId ||
          item?.purchaseTokenAndroid ||
          item?.purchaseToken ||
          item?.id ||
          '',
        originalTransactionId:
          item?.originalTransactionIdentifierIOS ||
          item?.originalTransactionId ||
          null,
        purchaseToken: normalizePurchaseToken(item),
        store: normalizeStore(item?.store),
        expiresAt: item?.expirationDateIOS || item?.expiresAt || null,
      })),
    },
  });
};

export const getPremiumStatus = async () => {
  return apiRequest('/billing/subscription/status');
};
