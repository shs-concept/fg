"use client";

import { createStytchClient, StytchProvider } from "@stytch/nextjs";
import {
  CrossmintProvider,
  CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-ui";
import { CROSSMINT_API_KEY } from "@/lib/crossmint-env";
import { useStytch, useStytchUser } from "@stytch/nextjs";
import { useCrossmint } from "@crossmint/client-sdk-react-ui";
import { useEffect } from "react";

const stytch = createStytchClient(
  process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN!
);

function StytchJwtBridge() {
  const stytchClient = useStytch();
  const { user, isInitialized } = useStytchUser();
  const { setJwt } = useCrossmint();

  useEffect(() => {
    const jwt = isInitialized && user ? stytchClient.session.getTokens()?.session_jwt : undefined;
    setJwt(jwt);
  }, [isInitialized, setJwt, stytchClient, user]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StytchProvider stytch={stytch}>
      <CrossmintProvider apiKey={CROSSMINT_API_KEY}>
        <StytchJwtBridge />
        <CrossmintWalletProvider>
          {children}
        </CrossmintWalletProvider>
      </CrossmintProvider>
    </StytchProvider>
  );
}
