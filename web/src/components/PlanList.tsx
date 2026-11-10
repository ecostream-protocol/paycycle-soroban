import { Users } from 'lucide-react';
import { fromStroops, type PlanRow } from 'paycycle-sdk';
import { periodLabel, truncateAddress } from '../lib/format';

interface Props {
  plans: PlanRow[];
  me: string | null;
  busyKey: string | null;
  onSubscribe: (plan: PlanRow) => void;
  onDeactivate: (plan: PlanRow) => void;
}

export default function PlanList({ plans, me, busyKey, onSubscribe, onDeactivate }: Props) {
  if (plans.length === 0) {
    return <p className="card p-6 text-ink/60">No plans yet. Create the first one.</p>;
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {plans.map((p) => {
        const key = `plan-${p.id}`;
        const mine = me === p.merchant;
        return (
          <li key={key} className={`card flex flex-col p-5 ${p.active ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xl font-bold">{p.name}</h3>
              {!p.active && <span className="rounded-full border-2 border-ink px-2 text-xs font-semibold">Ended</span>}
            </div>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="num font-display text-3xl font-bold">{fromStroops(p.amount)}</span>
              <span className="text-sm text-ink/60">USDC / {periodLabel(p.period)}</span>
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink/60">
              <Users size={14} aria-hidden /> {p.subscribers} subscriber{p.subscribers === 1 ? '' : 's'} · by{' '}
              {mine ? 'you' : truncateAddress(p.merchant)}
            </p>
            <div className="perforation mt-4 flex gap-2 pt-4">
              <button className="btn-primary flex-1" onClick={() => onSubscribe(p)} disabled={!me || !p.active || busyKey === key}>
                {busyKey === key ? 'Working…' : 'Subscribe'}
              </button>
              {mine && p.active && (
                <button className="btn-plain" onClick={() => onDeactivate(p)} disabled={busyKey === key}>
                  End plan
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
