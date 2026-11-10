import { LogOut, Wallet } from 'lucide-react';
import type { Signer } from 'paycycle-sdk';
import { isMock } from '../lib/api';
import { truncateAddress } from '../lib/format';
import { DEMO_ADDRESS } from '../lib/wallet';

interface Props {
  signer: Signer | null;
  connecting: boolean;
  onConnect: () => void;
  onDemo: () => void;
  onDisconnect: () => void;
}

export default function Header({ signer, connecting, onConnect, onDemo, onDisconnect }: Props) {
  return (
    <header className="border-b-2 border-ink bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
            <circle cx="17" cy="17" r="14" fill="none" stroke="#1B1A17" strokeWidth="3" />
            <path d="M17 3 A14 14 0 1 1 3 17" fill="none" stroke="#E8590C" strokeWidth="3" strokeLinecap="round" />
            <circle cx="17" cy="17" r="3.5" fill="#1B1A17" />
          </svg>
          <div className="leading-none">
            <p className="font-display text-2xl font-bold">PayCycle</p>
            <p className="mt-1 text-xs text-ink/60">Subscriptions anyone can bill, nobody can custody</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border-2 border-ink px-3 py-1 text-xs font-semibold ${
              isMock ? 'bg-tangerine-soft' : 'bg-moss text-white'
            }`}
          >
            {isMock ? 'Demo mode' : 'Stellar testnet'}
          </span>
          {signer ? (
            <>
              <span className="num rounded-lg border-2 border-ink bg-white px-3 py-1.5 text-sm">
                {signer.publicKey === DEMO_ADDRESS ? 'Demo wallet' : truncateAddress(signer.publicKey)}
              </span>
              <button className="btn-plain !px-3" onClick={onDisconnect} aria-label="Disconnect wallet">
                <LogOut size={16} aria-hidden />
              </button>
            </>
          ) : (
            <>
              {isMock && (
                <button className="btn-plain" onClick={onDemo}>
                  Try demo wallet
                </button>
              )}
              <button className="btn-primary" onClick={onConnect} disabled={connecting}>
                <Wallet size={16} aria-hidden />
                {connecting ? 'Connecting…' : 'Connect Freighter'}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
