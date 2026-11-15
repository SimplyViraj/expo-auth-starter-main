import { randomUUID } from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { Alert } from '@/components/feedback/alert';
import { LoadingIndicator } from '@/components/feedback/loading-indicator';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeroPanel } from '@/components/ui/hero-panel';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { ToggleRow } from '@/components/ui/toggle-row';
import { useAuth } from '@/providers/auth-provider';
import { useMembershipQuote, useMemberships } from '../hooks/use-memberships';
import { durationLabel, formatPrice, titleCase, type AccountType, type Membership, type Tier } from '../membership-contract';

export default function MembershipsScreen() {
  const { user } = useAuth();
  // Reset drafts and request keys when identities change without a full navigation remount.
  return <MembershipFlow key={user?.id} initialName={user?.name ?? ''} />;
}

function MembershipFlow({ initialName }: { initialName: string }) {
  const data = useMemberships();
  const [view, setView] = useState<'plans' | 'mine'>('plans');
  const [step, setStep] = useState(0);
  const [accountType, setAccountType] = useState<AccountType>('INDIVIDUAL');
  const [tier, setTier] = useState<Tier>('STARTER');
  const [months, setMonths] = useState(1);
  const [accountId, setAccountId] = useState('');
  const [programId, setProgramId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [names, setNames] = useState([initialName]);
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [confirmRecurring, setConfirmRecurring] = useState<string | null>(null);
  const [autoRenew, setAutoRenew] = useState(false);
  const creationKey = useRef(randomUUID());
  const purchaseKey = useRef(randomUUID());
  const processing = useRef(false);
  const [busy, setBusy] = useState(false);
  const quote = useMembershipQuote({ accountType, tier, months }, step >= 3 && view === 'plans');
  const { refetch } = data.memberships;
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  const catalog = data.catalog.data;
  const account = data.accounts.data?.find(a => a.id === accountId);
  const unavailableAccounts = new Set(data.memberships.data?.filter(m => m.status === 'ACTIVE' || m.status === 'PENDING_PAYMENT' || (m.recurring && m.recurring.status !== 'CANCELLED')).map(m => m.account.id));
  const accountEligible = Boolean(account && !unavailableAccounts.has(account.id) && (account.accountType !== 'GROUP' || account.participants.length <= (data.catalog.data?.groupMaximum ?? 0)));
  const program = catalog?.programs.find(p => p.id === programId);
  const selectedQuote = quote.data;
  const labels = ['Account type', 'Membership tier', 'Duration', 'Price & allowance', 'Member account', 'Wellness program', 'Review'];
  const selectionChanged = () => { purchaseKey.current = randomUUID(); setError(''); };

  async function perform(work: () => Promise<void>) {
    if (processing.current) return;
    processing.current = true; setBusy(true); setError('');
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { processing.current = false; setBusy(false); }
  }

  async function createAccount() {
    if (accountName.trim().length < 2 || names.some(name => name.trim().length < 2)) { setError('Enter an account name and a full name for every participant.'); return; }
    await perform(async () => {
      const created = await data.createAccount.mutateAsync({ name: accountName.trim(), accountType, creationKey: creationKey.current, participants: names.map(name => ({ name: name.trim() })) });
      setAccountId(created.id); selectionChanged();
    });
  }

  async function purchase() {
    if (!selectedQuote || !account || !accountEligible || !program) return;
    await perform(async () => {
      await data.purchase.mutateAsync({ accountType, tier, months, accountId, programId, autoRenew, catalogVersion: selectedQuote.catalogVersion, idempotencyKey: purchaseKey.current });
      setView('mine'); setStep(0); purchaseKey.current = randomUUID();
    });
  }

  return <Screen hasHeader>
    <HeroPanel eyebrow="AAyuva membership" title="Make wellbeing a habit" body="Explore programs and find a plan for you, your partner, or your group." />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Button label="Explore plans" fullWidth={false} style={{ flex: 1 }} variant={view === 'plans' ? 'primary' : 'outline'} disabled={busy} onPress={() => { setView('plans'); setError(''); }} />
      <Button label="My memberships" fullWidth={false} style={{ flex: 1 }} variant={view === 'mine' ? 'primary' : 'outline'} disabled={busy} onPress={() => { setView('mine'); setError(''); void refetch(); }} />
    </View>
    {error ? <Alert title="Could not complete request" body={error} tone="warning" /> : null}
    {view === 'mine' ? <>
      {data.memberships.isPending ? <LoadingIndicator label="Loading memberships..." /> : null}
      {data.memberships.isError ? <Card><Alert title="Memberships unavailable" body="Check your connection and retry." tone="warning" /><Button label="Retry" onPress={() => void refetch()} /></Card> : null}
      {data.memberships.data?.length === 0 ? <Card><AppText variant="subtitle">Your membership journey starts here</AppText><AppText>Choose a plan and one wellness program to get started.</AppText><Button label="Explore plans" onPress={() => setView('plans')} /></Card> : null}
      {data.memberships.data?.map(membership => <Card key={membership.id}>
        <MembershipDetails membership={membership} />
        {membership.status === 'ACTIVE' && membership.recurring?.status === 'PENDING_SETUP' && membership.paymentAvailable ? <Button label="Refresh recurring authorization" disabled={busy} variant="outline" onPress={() => void perform(async () => { await data.refresh.mutateAsync(membership.id); })} /> : null}
        {membership.recurring && membership.recurring.status !== 'CANCELLED' ? confirmRecurring === membership.recurring.id ? <>
          <AppText>Stop future renewals? Your paid membership remains valid until its expiry.</AppText>
          <Button label="Confirm stop renewals" loading={busy} variant="danger" onPress={() => void perform(async () => { await data.cancelRecurring.mutateAsync(membership.recurring!.id); setConfirmRecurring(null); })} />
          <Button label="Keep renewals" disabled={busy} variant="ghost" onPress={() => setConfirmRecurring(null)} />
        </> : <Button label={membership.recurring.status === 'CANCEL_REQUESTED' ? 'Retry renewal cancellation' : 'Stop auto-renewal'} disabled={busy} variant="outline" onPress={() => setConfirmRecurring(membership.recurring!.id)} /> : null}
        {membership.status === 'PENDING_PAYMENT' ? <>
          <AppText tone="muted">{membership.paymentAvailable ? 'Payment must be verified before this membership can start.' : 'Online payment is not available yet. No payment has been taken and this membership is not active.'}</AppText>
          <Button label="Refresh payment status" variant="outline" loading={busy} onPress={() => void perform(async () => { if (membership.paymentAvailable) await data.refresh.mutateAsync(membership.id); else await refetch(); })} />
          {!membership.paymentAvailable ? confirmCancel === membership.id ? <>
            <AppText>Withdraw this pending membership? No payment has been taken.</AppText>
            <Button label="Confirm withdrawal" variant="danger" loading={busy} onPress={() => void perform(async () => { await data.cancel.mutateAsync(membership.id); setConfirmCancel(null); })} />
            <Button label="Keep pending membership" variant="ghost" disabled={busy} onPress={() => setConfirmCancel(null)} />
          </> : <Button label="Withdraw pending membership" variant="ghost" disabled={busy} onPress={() => setConfirmCancel(membership.id)} /> : null}
        </> : null}
      </Card>)}
    </> : <>
      {data.catalog.isPending ? <LoadingIndicator label="Loading membership plans..." /> : null}
      {data.catalog.isError ? <Card><Alert title="Plans unavailable" body="We could not load current prices. Please retry." tone="warning" /><Button label="Retry plans" onPress={() => void data.catalog.refetch()} /></Card> : null}
      {catalog ? <>
        <AppText variant="eyebrow">Step {step + 1} of 7 · {labels[step]}</AppText>
        <Card>
          {step === 0 ? <>
            <AppText variant="subtitle">Who is this membership for?</AppText>
            {catalog.accountTypes.map(type => <Button key={type} label={`${titleCase(type)}${type === 'GROUP' ? ' · 2–' + catalog.groupMaximum + ' people' : type === 'COUPLE' ? ' · 2 people' : ' · 1 person'}`} variant={accountType === type ? 'primary' : 'outline'} accessibilityState={{ selected: accountType === type }} onPress={() => { setAccountType(type); setAccountId(''); setNames(type === 'INDIVIDUAL' ? [initialName] : [initialName, '']); creationKey.current = randomUUID(); selectionChanged(); }} />)}
            <AppText tone="muted">Each person gets their own session allowance. Couple and Group memberships share one wellness program.</AppText>
          </> : null}
          {step === 1 ? <>
            <AppText variant="subtitle">Choose your pace</AppText>
            {catalog.tiers.map(value => <Button key={value} label={`${titleCase(value)} · ${catalog.plans.find(p => p.accountType === accountType && p.tier === value)?.sessionsPerMonth} sessions/person/month`} variant={tier === value ? 'primary' : 'outline'} accessibilityState={{ selected: tier === value }} onPress={() => { setTier(value); selectionChanged(); }} />)}
            <AppText tone="muted">Every tier includes the Session A and Session B protocols for your chosen program.</AppText>
          </> : null}
          {step === 2 ? <>
            <AppText variant="subtitle">Choose your duration</AppText>
            {catalog.durations.filter(value => catalog.plans.some(p => p.accountType === accountType && p.tier === tier && p.months === value)).map(value => <Button key={value} label={`${durationLabel(value)} · ${formatPrice(catalog.plans.find(p => p.accountType === accountType && p.tier === tier && p.months === value)!.amountPaise)}`} variant={months === value ? 'primary' : 'outline'} accessibilityState={{ selected: months === value }} onPress={() => { setMonths(value); selectionChanged(); }} />)}
          </> : null}
          {step === 3 || step === 6 ? <>
            {quote.isPending ? <LoadingIndicator label="Checking current price..." /> : null}
            {quote.isError ? <><Alert title="Price check failed" body="A current server quote is required to continue." tone="warning" /><Button label="Retry price check" onPress={() => void quote.refetch()} /></> : null}
            {selectedQuote ? <>
              <AppText variant="subtitle">{titleCase(accountType)} · {titleCase(tier)} · {durationLabel(months)}</AppText>
              <AppText variant="title">{formatPrice(selectedQuote.amountPaise)}</AppText>
              <AppText>Total membership price for {months} {months === 1 ? 'month' : 'months'}.</AppText>
              <AppText>{selectedQuote.sessionsPerMonth} sessions per person each month · {selectedQuote.totalSessionsPerPerson} per person over the full term.</AppText>
              <AppText tone="muted">Separate monthly balances for each participant. Auto-renewal is optional at review.</AppText>
            </> : null}
            <Button label="Refresh current price" variant="ghost" loading={quote.isFetching} disabled={busy} onPress={() => { selectionChanged(); void quote.refetch(); }} />
          </> : null}
          {step === 4 ? <>
            <AppText variant="subtitle">Select a member account</AppText>
            {data.accounts.isPending ? <LoadingIndicator label="Loading member accounts..." /> : null}
            {data.accounts.isError ? <><Alert title="Accounts unavailable" body="Retry before creating another account." tone="warning" /><Button label="Retry accounts" onPress={() => void data.accounts.refetch()} /></> : null}
            {data.accounts.data?.filter(a => a.accountType === accountType).map(a => <Button key={a.id} label={`${a.name} · ${unavailableAccounts.has(a.id) ? 'existing membership' : `${a.participants.length} people`}`} disabled={unavailableAccounts.has(a.id)} variant={accountId === a.id ? 'primary' : 'outline'} accessibilityState={{ selected: accountId === a.id }} onPress={() => { setAccountId(a.id); selectionChanged(); }} />)}
            {unavailableAccounts.size > 0 ? <AppText tone="muted">Accounts with an active membership, pending purchase, or recurring agreement are managed in My memberships.</AppText> : null}
            {account ? <AppText>Participants: {account.participants.map(p => p.name).join(', ')}</AppText> : null}
            <AppText variant="subtitle">Or create a member account</AppText>
            <Input label="Member account name" value={accountName} maxLength={80} editable={!busy} onChangeText={value => { setAccountName(value); creationKey.current = randomUUID(); }} />
            {names.map((name, index) => <Input key={index} label={`Participant ${index + 1} full name`} value={name} maxLength={80} editable={!busy} onChangeText={value => { setNames(current => current.map((n, i) => i === index ? value : n)); creationKey.current = randomUUID(); }} />)}
            {accountType === 'GROUP' ? <>
              {names.length < catalog.groupMaximum ? <Button label="Add participant" variant="outline" disabled={busy} onPress={() => { setNames([...names, '']); creationKey.current = randomUUID(); }} /> : null}
              {names.length > 2 ? <Button label="Remove last participant" variant="ghost" disabled={busy} onPress={() => { setNames(names.slice(0, -1)); creationKey.current = randomUUID(); }} /> : null}
            </> : null}
            <AppText tone="muted">These are participant profiles managed by you. Each receives a separate balance and attendance history. Names cannot be changed after creation.</AppText>
            <Button label="Create member account" loading={busy} disabled={data.accounts.isError || data.accounts.isPending} onPress={() => void createAccount()} />
          </> : null}
          {step === 5 ? <>
            <AppText variant="subtitle">Choose one shared wellness program</AppText>
            {catalog.programs.map(p => <View key={p.id} style={{ gap: 8 }}>
              <Button label={p.name} variant={programId === p.id ? 'primary' : 'outline'} accessibilityState={{ selected: programId === p.id }} onPress={() => { setProgramId(p.id); selectionChanged(); }} />
              {programId === p.id ? <><AppText>Session A · {p.sessionMinutes} minutes · {p.sessionA}</AppText><AppText>Session B · {p.sessionMinutes} minutes · {p.sessionB}</AppText>{p.note ? <AppText tone="muted">{p.note}</AppText> : null}</> : null}
            </View>)}
          </> : null}
          {step === 6 ? <>
            <AppText variant="subtitle">{account?.name}</AppText>
            <AppText>{account?.participants.map(p => p.name).join(', ')}</AppText>
            <AppText>Shared program: {program?.name}</AppText>
            <AppText>Earn your first credit after {catalog.firstCreditSessions} attended sessions, then every {catalog.creditSessionRates[programId]} subsequent {catalog.creditSessionRates[programId] === 1 ? 'session earns' : 'sessions earn'} one credit in this program. Credits expire after {catalog.creditValidityMonths} months.</AppText>
            <ToggleRow label="Auto-renew this membership" value={autoRenew} disabled={busy} onValueChange={value => { setAutoRenew(value); selectionChanged(); }} body={`If enabled, I agree to renew at ${selectedQuote ? formatPrice(selectedQuote.amountPaise) : 'the reviewed price'} every ${months} ${months === 1 ? 'month' : 'months'}, after provider mandate verification. I can stop future renewals in My memberships. Changes to your membership terms require fresh consent.`} />
            {catalog.terms.map(term => <AppText key={term} tone="muted">{term}</AppText>)}
            {!catalog.paymentAvailable ? <Alert title="Payment is not available yet" body="You can save this purchase as pending. No payment will be taken, no sessions will be allocated, and your membership will not start until payment is verified." /> : null}
            <Button label={catalog.paymentAvailable ? 'Continue to payment' : 'Save pending membership'} loading={busy} disabled={!selectedQuote || quote.isError || quote.isFetching || !accountEligible || !program} onPress={() => void purchase()} />
          </> : null}
        </Card>
        {step < 6 ? <Button label="Continue" disabled={busy || (step === 0 && !catalog.accountTypes.includes(accountType)) || (step === 1 && !catalog.tiers.includes(tier)) || (step === 2 && !catalog.durations.includes(months)) || (step === 3 && (!selectedQuote || quote.isError || quote.isFetching)) || (step === 4 && (!accountEligible || data.accounts.isError)) || (step === 5 && !program)} onPress={() => { setError(''); setStep(step + 1); }} /> : null}
        {step > 0 ? <Button label="Back" variant="ghost" disabled={busy} onPress={() => { setError(''); setStep(step - 1); }} /> : null}
      </> : null}
    </>}
  </Screen>;
}

function MembershipDetails({ membership: m }: { membership: Membership }) {
  return <>
    <AppText variant="eyebrow">{m.status.replaceAll('_', ' ')}</AppText>
    <AppText variant="subtitle">{m.account.name} · {titleCase(m.tier)}</AppText>
    <AppText>{titleCase(m.account.accountType)} · {durationLabel(m.months)} · {formatPrice(m.amountPaise)}</AppText>
    <AppText>Shared program: {m.program.name}</AppText>
    <AppText>{m.sessionsPerMonth} sessions per person per month</AppText>
    {m.recurring ? <>
      <AppText>Auto-renewal: {m.recurring.status.replaceAll('_', ' ')}</AppText>
      {m.recurring.status === 'PENDING_SETUP' ? <AppText tone="muted">Recurring billing awaits verified payment authorization. No automatic charges are enabled yet.</AppText> : null}
      {m.recurring.status === 'PRICE_REVIEW' ? <AppText tone="muted">Renewals are paused because the plan terms changed. Cancel this agreement and review a new plan to provide fresh consent.</AppText> : null}
      {m.recurring.status === 'CANCEL_REQUESTED' ? <AppText tone="muted">New renewal attempts are stopped locally; provider cancellation confirmation is pending.</AppText> : null}
      {m.recurring.status === 'ACTIVE' && m.recurring.nextBillingAt ? <AppText>Next renewal: {new Date(m.recurring.nextBillingAt).toLocaleDateString()} · {formatPrice(m.amountPaise)}</AppText> : null}
    </> : <AppText tone="muted">One-time membership · auto-renewal off</AppText>}
    {m.startsAt && m.endsAt ? <AppText>{new Date(m.startsAt).toLocaleDateString()} – {new Date(m.endsAt).toLocaleDateString()} (expiry at {new Date(m.endsAt).toLocaleTimeString()})</AppText> : null}
    {m.account.participants.map(person => {
      const periods = m.balances.filter(balance => balance.participantId === person.id);
      const current = periods.find(balance => balance.current);
      return <View key={person.id} style={{ gap: 6 }}>
        <AppText variant="subtitle">{person.name}</AppText>
        <AppText>{person.creditBalance ?? 0} available credits · {person.attendedSessions ?? 0} attended sessions</AppText>
        {person.credits?.filter(credit => new Date(credit.expiresAt) > new Date()).map(credit => <AppText key={credit.id} variant="caption" tone="muted">{credit.points} credit earned {new Date(credit.earnedAt).toLocaleDateString()}, expires {new Date(credit.expiresAt).toLocaleDateString()}</AppText>)}
        <AppText>{current ? `${current.remaining} of ${current.included} sessions remaining this month` : m.status === 'PENDING_PAYMENT' ? 'Allowance starts after verified payment' : 'No current allowance period'}</AppText>
        {periods.map(period => <View key={period.monthIndex} style={{ gap: 4 }}>
          <AppText variant="caption">Month {period.monthIndex + 1} · {new Date(period.startsAt).toLocaleDateString()} – {new Date(period.endsAt).toLocaleDateString()} · {period.used}/{period.included} attended</AppText>
          {period.attendance.map(visit => <AppText key={visit.id} variant="caption" tone="muted">Attended {new Date(visit.attendedAt).toLocaleString()}</AppText>)}
        </View>)}
      </View>;
    })}
    <AppText variant="caption" tone="muted">Reference: {m.id}</AppText>
  </>;
}
