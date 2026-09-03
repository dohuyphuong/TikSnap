import React, {
  createContext,
  useContext,
  useEffect,
  type PropsWithChildren,
} from 'react';
import {
  ClerkLoaded,
  ClerkProvider,
  useAuth as useClerkAuth,
  useClerk,
  useUser,
} from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setAuthTokenGetter } from '@workspace/api-client-react';

export type AppAuthUser = {
  firstName: string | null;
  fullName: string | null;
  emailAddress: string | null;
};

type AppAuthValue = {
  isConfigured: boolean;
  isSignedIn: boolean;
  user: AppAuthUser | null;
  signOut: () => Promise<void>;
};

const localAuth: AppAuthValue = {
  isConfigured: false,
  isSignedIn: false,
  user: null,
  signOut: async () => undefined,
};

const AppAuthContext = createContext<AppAuthValue>(localAuth);

export function useAppAuth() {
  return useContext(AppAuthContext);
}

export function AuthProvider({
  publishableKey,
  proxyUrl,
  children,
}: PropsWithChildren<{ publishableKey?: string; proxyUrl?: string }>) {
  if (!publishableKey) {
    setAuthTokenGetter(null);
    return <AppAuthContext.Provider value={localAuth}>{children}</AppAuthContext.Provider>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl || undefined}
    >
      <ClerkLoaded>
        <ClerkAuthBridge>{children}</ClerkAuthBridge>
      </ClerkLoaded>
    </ClerkProvider>
  );
}

function ClerkAuthBridge({ children }: PropsWithChildren) {
  const { isSignedIn, getToken } = useClerkAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);

  const value: AppAuthValue = {
    isConfigured: true,
    isSignedIn: isSignedIn === true,
    user: user
      ? {
          firstName: user.firstName,
          fullName: user.fullName,
          emailAddress: user.primaryEmailAddress?.emailAddress ?? null,
        }
      : null,
    signOut: () => signOut(),
  };

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}