import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PERIODS, toStroops } from 'paycycle-sdk';

interface Props {
  disabled: boolean;
  busy: boolean;
  onCreate: (input: { name: string; amount: bigint; period: bigint }) => Promise<void>;
}

export default function PlanForm({ disabled, busy, onCreate }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('9.99');
  const [period, setPeriod] = useState<string>('monthly');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      if (!name.trim()) throw new Error('Give the plan a name');
      const stroops = toStroops(amount);
      if (stroops <= 0n) throw new Error('Price must be greater than zero');
      const p = PERIODS.find((x) => x.id === period)!;
      await onCreate({ name: name.trim(), amount: stroops, period: p.seconds });
      setName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create plan');
    }
  }

  return (
    <div className="card p-5">
      <h2 className="text-xl font-bold">Create a plan</h2>
      <p className="mt-1 text-sm text-ink/60">You are the merchant. Subscribers pay you directly, every period.</p>
      <div className="mt-4 space-y-3">
        <label className="block text-sm font-semibold">
          Plan name
          <input className="field mt-1 font-normal" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">
            Price (USDC)
            <input className="field num mt-1 font-normal" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="block text-sm font-semibold">
            Billed
            <select className="field mt-1 font-normal" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-tangerine-dark">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" onClick={submit} disabled={disabled || busy}>
          <Plus size={16} aria-hidden /> {busy ? 'Creating…' : 'Create plan'}
        </button>
        {disabled && <p className="text-center text-xs text-ink/50">Connect a wallet to create plans.</p>}
      </div>
    </div>
  );
}
