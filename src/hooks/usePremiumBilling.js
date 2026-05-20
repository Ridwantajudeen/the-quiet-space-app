import { useCallback, useEffect, useMemo, useState } from 'react';
import { getActiveSubscriptions, requestPurchase, useIAP } from 'expo-iap';
import { useQueryClient } from '@tanstack/react-query';

import {
  PREMIUM_PRODUCT_ID,
  claimPremiumPurchase,
  syncPremiumSubscriptionState,
} from '../services/billingService';
import { useUser } from './useUser';

export const usePremiumBilling = ({ profile }) => {
  const queryClient = useQueryClient();
  const { user, setUser } = useUser();
  const userId = user?.id;
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  const markPremium = useCallback(
    (nextUser) => {
      if (nextUser) {
        setUser({
          ...user,
          ...nextUser,
          token: user?.token || nextUser?.token || null,
        });
      }
      if (userId) {
        queryClient.invalidateQueries(['profile', userId]);
      }
    },
    [queryClient, setUser, user, userId]
  );

  const syncEntitlements = useCallback(async () => {
    const activeSubscriptions = await getActiveSubscriptions([PREMIUM_PRODUCT_ID]);
    const result = await syncPremiumSubscriptionState({
      subscriptions: activeSubscriptions,
    });

    if (result?.user) {
      markPremium(result.user);
    }

    return result;
  }, [markPremium]);

  const handleClaim = useCallback(
    async (purchase, source = 'purchase') => {
      if (!purchase || purchase.productId !== PREMIUM_PRODUCT_ID) return;
      setBusy(true);
      try {
        const result = await claimPremiumPurchase({ purchase, source });
        if (result?.user) {
          markPremium(result.user);
        }
        setStatus('Premium subscription saved. Thank you.');
      } catch (error) {
        setStatus(error?.message || 'We could not confirm that subscription yet.');
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [markPremium]
  );

  const purchaseState = useIAP({
    onPurchaseSuccess: async (purchase) => {
      if (purchase?.productId === PREMIUM_PRODUCT_ID) {
        try {
          await handleClaim(purchase, 'purchase');
        } catch (_) {
          // status is already updated above
        }
      }
    },
    onPurchaseError: (error) => {
      setBusy(false);
      setStatus(error?.message || 'The purchase could not be completed.');
    },
    onError: (error) => {
      setStatus(error?.message || 'Billing is not available right now.');
    },
  });

  const { connected, products, fetchProducts: loadProducts } = purchaseState;

  useEffect(() => {
    if (!connected) return;
    setProductsLoading(true);
    loadProducts({ skus: [PREMIUM_PRODUCT_ID], type: 'subs' }).catch(() => {
      setStatus('We could not load the premium subscription right now.');
    }).finally(() => {
      setProductsLoading(false);
    });
  }, [connected, loadProducts]);

  const product = useMemo(
    () => products.find((item) => item.id === PREMIUM_PRODUCT_ID) || null,
    [products]
  );

  const restorePurchases = useCallback(async () => {
    setBusy(true);
    setStatus('');
    try {
      await syncEntitlements();
      setStatus('Premium subscription sync complete.');
    } catch (error) {
      setStatus(error?.message || 'We could not restore purchases right now.');
    } finally {
      setBusy(false);
    }
  }, [syncEntitlements]);

  const refreshProducts = useCallback(async () => {
    if (!connected) {
      setStatus('Store billing is not ready yet.');
      return;
    }

    setProductsLoading(true);
    setStatus('');
    try {
      await loadProducts({ skus: [PREMIUM_PRODUCT_ID], type: 'subs' });
    } catch (error) {
      setStatus(error?.message || 'We could not load the premium subscription right now.');
    } finally {
      setProductsLoading(false);
    }
  }, [connected, loadProducts]);

  const purchasePremium = useCallback(async () => {
    if (!connected) {
      setStatus('Store billing is not ready yet.');
      return;
    }

    setStatus('');
    setBusy(true);
    try {
      await requestPurchase({
        request: {
          apple: { sku: PREMIUM_PRODUCT_ID },
          google: { skus: [PREMIUM_PRODUCT_ID] },
        },
        type: 'subs',
      });
    } catch (error) {
      setBusy(false);
      setStatus(error?.message || 'The purchase could not be started.');
    }
  }, [connected]);

  return {
    connected,
    product,
    status,
    busy,
    purchasePremium,
    restorePurchases,
    refreshProducts,
    syncEntitlements,
    hasPremium: !!(profile?.is_premium ?? user?.isPremium),
    productsLoading,
  };
};
