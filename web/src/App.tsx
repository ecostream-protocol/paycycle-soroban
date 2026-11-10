import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { describeError, listPlans, listSubscriptions, type PlanRow, type Signer, type SubscriptionRow } from 'paycycle-sdk';
import Header from './components/Header';
import PlanForm from './components/PlanForm';
import PlanList from './components/PlanList';
import Subscriptions from './components/Subscriptions';
import { api, isMock, seedDemo, tokenId } from './lib/api';
import { connectFreighter, demoSigner, restoreFreighter } from './lib/wallet';

type Tab = 'plans' | 'subs';

export default function App() {
  const [signer, setSigner] = useState<Signer | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [tab, setTab] = useState<Tab>('plans');
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await seedDemo();
      setPlans(await listPlans(api));
      setSubs(signer ? await listSubscriptions(api, signer.publicKey) : []);
    } catch (e) {
      setError(describeError(e));
    }
  }, [signer]);

  useEffect(() => {
    void restoreFreighter().then((s) => s && !isMock && setSigner(s));
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  async function connect() {
    setConnecting(true);
    setError(null);
    try {
      setSigner(await connectFreighter());
    } catch (e) {
      setError(describeError(e));
    } finally {
      setConnecting(false);
    }
  }

  async function run(key: string, action: (s: Signer) => Promise<unknown>, after?: () => void) {
    if (!signer) return;
    setBusyKey(key);
    setError(null);
    try {
      await action(signer);
      await refresh();
      after?.();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusyKey(null);
    }
  }

  const createPlan = (input: { name: string; amount: bigint; period: bigint }) =>
    run('create', (s) => api.createPlan(s, { token: tokenId, ...input }));

  const subscribe = (plan: PlanRow) =>
    run(
      `plan-${plan.id}`,
      async (s) => {
        // Allow ~12 future periods so a keeper can pull later payments.
        if (!isMock) await api.approveAllowance(s, plan.token, plan.amount * 12n);
        await api.subscribe(s, plan.id);
      },
      () => setTab('subs'),
    );

  const deactivate = (plan: PlanRow) => run(`plan-${plan.id}`, (s) => api.deactivatePlan(s, plan.id));
  const cancel = (sub: SubscriptionRow) => run(`sub-${sub.id}`, (s) => api.cancel(s, sub.id));
  const charge = (sub: SubscriptionRow) => run(`sub-${sub.id}`, (s) => api.charge(s, sub.id));

  const tabBtn = (id: Tab, label: string) => (
    <button
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`rounded-lg border-2 border-ink px-4 py-2 text-sm font-semibold ${tab === id ? 'bg-ink text-paper' : 'bg-white'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen">
      <Header
        signer={signer}
        connecting={connecting}
        onConnect={connect}
        onDemo={() => setSigner(demoSigner)}
        onDisconnect={() => setSigner(null)}
      />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="mb-8">
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            Recurring payments, <span className="text-tangerine">without handing over the keys.</span>
          </h1>
          <p className="mt-3 max-w-xl text-ink/70">
            Subscribe once, approve a spending limit, and anyone can trigger each payment when it is due. Funds move
            straight from you to the merchant. Cancel any time.
          </p>
        </section>

        {error && (
          <div role="alert" className="card mb-6 flex items-start gap-3 !border-tangerine-dark bg-tangerine-soft p-4 text-sm">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <section>
            <div role="tablist" className="mb-4 flex gap-2">
              {tabBtn('plans', `Plans (${plans.length})`)}
              {tabBtn('subs', `My subscriptions (${subs.length})`)}
            </div>
            {tab === 'plans' ? (
              <PlanList plans={plans} me={signer?.publicKey ?? null} busyKey={busyKey} onSubscribe={subscribe} onDeactivate={deactivate} />
            ) : (
              <Subscriptions subs={subs} plans={plans} now={now} busyKey={busyKey} onCancel={cancel} onCharge={charge} />
            )}
          </section>
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <PlanForm disabled={!signer} busy={busyKey === 'create'} onCreate={createPlan} />
          </aside>
        </div>
      </main>
    </div>
  );
}
