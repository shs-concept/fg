"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, RefreshCw, Send, WalletCards } from "lucide-react";
import { CrossmintEmbeddedCheckout, useWallet } from "@crossmint/client-sdk-react-ui";
import { IS_PRODUCTION } from "@/lib/crossmint-env";

const CHAIN = IS_PRODUCTION ? "base" : "base-sepolia";
const STABLECOIN = IS_PRODUCTION ? "usdc" : "usdxm";
const USDC_TOKEN = IS_PRODUCTION
  ? "base:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  : "base-sepolia:usdxm";

type WalletPanelProps = { email: string };
type WalletMode = "buy" | "send";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function UsdcWalletPanel({ email }: WalletPanelProps) {
  const { wallet, status, error: walletError, getWallet, createWallet } = useWallet();
  const [lookupDone, setLookupDone] = useState(false);
  const [working, setWorking] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [mode, setMode] = useState<WalletMode>("buy");
  const [buyAmount, setBuyAmount] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadWallet = useCallback(async () => {
    if (!email || status === "in-progress" || status === "loaded") return;
    setWorking(true);
    setSendError(null);
    try {
      await getWallet({ chain: CHAIN });
      setLookupDone(true);
    } catch (error) {
      setSendError(errorMessage(error));
    } finally {
      setWorking(false);
    }
  }, [email, getWallet, status]);

  useEffect(() => {
    if (email && status === "not-loaded" && !lookupDone) void loadWallet();
  }, [email, loadWallet, lookupDone, status]);

  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    setBalanceError(null);
    try {
      const balances = await wallet.balances(["usdxm"]);
      const stablecoinBalance = IS_PRODUCTION
        ? balances.usdc
        : balances.tokens.find((token) => token.symbol.toLowerCase() === STABLECOIN);
      setBalance(stablecoinBalance?.amount ?? "0");
    } catch (error) {
      setBalanceError(errorMessage(error));
    }
  }, [wallet]);

  useEffect(() => {
    if (wallet) void refreshBalance();
  }, [refreshBalance, wallet]);

  const createUserWallet = async () => {
    if (!email) return;
    setWorking(true);
    setSendError(null);
    try {
      await createWallet({
        chain: CHAIN,
        recoveryMethods: [{ type: "email", email }],
      });
      setLookupDone(true);
    } catch (error) {
      setSendError(errorMessage(error));
    } finally {
      setWorking(false);
    }
  };

  const copyAddress = async () => {
    if (!wallet) return;
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const submitSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!wallet) return;
    setSendError(null);
    setSendSuccess(null);
    const amount = Number(sendAmount);
    if (!recipient.trim() || !Number.isFinite(amount) || amount <= 0) {
      setSendError("Enter a valid recipient address and a USDC amount greater than zero.");
      return;
    }
    setWorking(true);
    try {
      const transaction = await wallet.send(recipient.trim(), STABLECOIN, amount.toString());
      setSendSuccess(transaction.explorerLink);
      setSendAmount("");
      setRecipient("");
      await refreshBalance();
    } catch (error) {
      setSendError(errorMessage(error));
    } finally {
      setWorking(false);
    }
  };

  const checkout = useMemo(() => {
    if (!wallet || !buyAmount || !checkoutOpen) return null;
    const amount = Number(buyAmount);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return (
      <div className="mt-4 overflow-hidden rounded-[10px] border border-black/10 bg-white">
        <CrossmintEmbeddedCheckout
          lineItems={{
            tokenLocator: USDC_TOKEN,
            executionParameters: { mode: "exact-in", amount: buyAmount },
          }}
          recipient={{ walletAddress: wallet.address }}
          payment={{
            receiptEmail: email,
            fiat: { enabled: true, allowedMethods: { card: true, applePay: true, googlePay: true } },
            crypto: { enabled: false },
            defaultMethod: "fiat",
          }}
        />
      </div>
    );
  }, [buyAmount, checkoutOpen, email, wallet]);

  if (!email) return null;

  return (
    <section className="rounded-[10px] border border-[#00150d]/10 bg-[#00150d] p-5 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[20px] font-medium tracking-[-0.4px]">
            <WalletCards className="size-5 text-[#62e89b]" />
            USDC wallet
          </div>
          <p className="mt-1 text-sm text-white/65">Buy with a card or send USDC from your Base wallet.</p>
        </div>
        {wallet && (
          <button
            type="button"
            onClick={() => void refreshBalance()}
            className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        )}
      </div>

      {status === "in-progress" || working ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="size-4 animate-spin" /> Loading wallet…
        </div>
      ) : wallet ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button type="button" onClick={() => void copyAddress()} className="rounded-md border border-white/15 bg-white/5 p-3 text-left hover:bg-white/10">
              <span className="block text-xs text-white/50">Wallet address · {CHAIN}</span>
              <span className="mt-1 flex items-center gap-2 break-all font-mono text-xs text-white/90">
                {wallet.address}
                {copied ? <Check className="size-3.5 shrink-0 text-[#62e89b]" /> : <Copy className="size-3.5 shrink-0 text-white/50" />}
              </span>
            </button>
            <div className="rounded-md border border-white/15 bg-white/5 p-3 sm:min-w-[150px]">
              <span className="block text-xs text-white/50">USDC balance</span>
              <span className="mt-1 block text-lg font-medium text-[#62e89b]">{balance ?? "—"} USDC</span>
            </div>
          </div>

          <div className="mt-5 flex gap-2 border-b border-white/15">
            <button type="button" onClick={() => { setMode("buy"); setSendError(null); }} className={`border-b-2 px-3 pb-2 text-sm ${mode === "buy" ? "border-[#62e89b] text-[#62e89b]" : "border-transparent text-white/55"}`}>
              Buy USDC
            </button>
            <button type="button" onClick={() => { setMode("send"); setSendError(null); }} className={`inline-flex items-center gap-2 border-b-2 px-3 pb-2 text-sm ${mode === "send" ? "border-[#62e89b] text-[#62e89b]" : "border-transparent text-white/55"}`}>
              <Send className="size-3.5" /> Send to another wallet
            </button>
          </div>

          {mode === "buy" ? (
            <div className="mt-4">
              <label className="block text-sm text-white/75" htmlFor="usdc-buy-amount">Amount in USD</label>
              <div className="mt-2 flex flex-wrap gap-2">
                <input id="usdc-buy-amount" value={buyAmount} onChange={(event) => { setBuyAmount(event.target.value); setCheckoutOpen(false); }} inputMode="decimal" min="1" step="0.01" placeholder="100.00" className="w-40 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#62e89b]" />
                <button type="button" onClick={() => setCheckoutOpen(true)} disabled={!buyAmount || !Number.isFinite(Number(buyAmount)) || Number(buyAmount) <= 0} className="rounded-md bg-[#62e89b] px-4 py-2 text-sm font-medium text-[#00150d] disabled:cursor-not-allowed disabled:opacity-40">Continue to card checkout</button>
              </div>
              <p className="mt-2 text-xs text-white/45">Card details stay inside Crossmint&apos;s hosted checkout. USDC is delivered to this wallet after payment completes.</p>
              {checkout}
            </div>
          ) : (
            <form onSubmit={submitSend} className="mt-4 space-y-3">
              <div>
                <label className="block text-sm text-white/75" htmlFor="usdc-recipient">Recipient wallet address</label>
                <input id="usdc-recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="0x…" autoComplete="off" className="mt-2 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-white/35 focus:border-[#62e89b]" />
              </div>
              <div>
                <label className="block text-sm text-white/75" htmlFor="usdc-send-amount">USDC amount</label>
                <input id="usdc-send-amount" value={sendAmount} onChange={(event) => setSendAmount(event.target.value)} inputMode="decimal" min="0.000001" step="0.000001" placeholder="10.00" className="mt-2 w-40 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#62e89b]" />
              </div>
              <button type="submit" disabled={working || !recipient || !sendAmount} className="inline-flex items-center gap-2 rounded-md bg-[#62e89b] px-4 py-2 text-sm font-medium text-[#00150d] disabled:cursor-not-allowed disabled:opacity-40">
                <Send className="size-3.5" /> Review and send USDC
              </button>
              <p className="text-xs text-white/45">Sending is an on-chain transaction. Confirm the address and amount carefully before submitting.</p>
            </form>
          )}
        </>
      ) : (
        <div className="mt-5 rounded-md border border-white/15 bg-white/5 p-4">
          <p className="text-sm text-white/75">Your Base wallet is ready to be created.</p>
          <button type="button" onClick={() => void createUserWallet()} className="mt-3 rounded-md bg-[#62e89b] px-4 py-2 text-sm font-medium text-[#00150d]">Create my wallet</button>
        </div>
      )}

      {(walletError || balanceError || sendError) && (
        <div className="mt-4 rounded-md border border-red-300/30 bg-red-400/10 p-3 text-xs text-red-100">
          {walletError?.message ?? balanceError ?? sendError}
        </div>
      )}
      {sendSuccess && (
        <p className="mt-4 text-xs text-[#62e89b]">USDC send submitted. <a href={sendSuccess} target="_blank" rel="noreferrer" className="underline">View transaction</a></p>
      )}
    </section>
  );
}
