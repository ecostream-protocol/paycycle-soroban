import { fromStroops, formatDuration, isDueAt, progress, secondsUntil, type PlanRow, type SubscriptionRow } from 'paycycle-sdk';
import { fmtDate, periodLabel } from '../lib/format';

interface Props {
  subs: SubscriptionRow[];
  plans: PlanRow[];
  now: number;
  busyKey: string | null;
  onCancel: (sub: SubscriptionRow) => void;
  onCharge: (sub: SubscriptionRow) => void;
}

function Ring({ value, due }: { value: number; due: boolean }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${Math.round(value * 100)}% of the billing period elapsed`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#1B1A17" strokeOpacity="0.12" strokeWidth="6" />
      <circle
        cx="32" cy="32" r={r} fill="none" stroke={due ? '#2F6F4F' : '#E8590C'} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value)} transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

export default function Subscriptions({ subs, plans, now, busyKey, onCancel, onCharge }: Props) {
  if (subs.length === 0) {
    return <p className="card p-6 text-ink/60">You have no subscriptions yet. Pick a plan on the Plans tab.</p>;
  }
  return (
    <ul className="space-y-4">
      {subs.map((s) => {
        const plan = plans.find((p) => p.id === s.planId);
        if (!plan) return null;
        const key = `sub-${s.id}`;
        const due = s.active && plan.active && isDueAt(s.nextCharge, now);
        return (
          <li key={key} className={`card flex flex-wrap items-center gap-5 p-5 ${s.active ? '' : 'opacity-60'}`}>
            <Ring value={s.active ? progress(s.nextCharge, plan.period, now) : 0} due={due} />
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-bold">
                {plan.name} <span className="text-sm font-normal text-ink/50">#{s.id.toString()}</span>
              </h3>
              <p className="num text-sm text-ink/70">
                {fromStroops(plan.amount)} USDC / {periodLabel(plan.period)} · {s.charges} payment{s.charges === 1 ? '' : 's'} ·{' '}
                {fromStroops(s.totalPaid)} paid
              </p>
              <p className="num mt-1 text-sm font-semibold">
                {!s.active
                  ? 'Cancelled'
                  : !plan.active
                    ? 'Plan ended by merchant'
                    : due
                      ? 'Payment is due now'
                      : `Next payment in ${formatDuration(secondsUntil(s.nextCharge, now))} (${fmtDate(s.nextCharge)})`}
              </p>
            </div>
            {s.active && (
              <div className="flex gap-2">
                {due && (
                  <button className="btn-ink" onClick={() => onCharge(s)} disabled={busyKey === key}>
                    {busyKey === key ? 'Charging…' : 'Charge now'}
                  </button>
                )}
                <button className="btn-plain" onClick={() => onCancel(s)} disabled={busyKey === key}>
                  Cancel
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
