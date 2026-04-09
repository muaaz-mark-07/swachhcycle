'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Home, BookOpen, MapPin, Gift, ClipboardList,
  CheckCircle, Clock, Truck, CalendarCheck, Building2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
type User = { id: number; name: string; points: number; waste_saved_kg: number; pickups: number };
type Pickup = {
  id: number; user_id: number; collector_id: number | null; community_id: number | null;
  category: string; est_weight: number; actual_weight: number | null;
  status: 'pending' | 'assigned' | 'collected'; amount_paid: number | null; created_at: string;
};
type Community = { id: number; name: string; zone: string; collection_day: string; households: number };
type RewardItem = { id: number; name: string; points_cost: number; emoji: string; description: string };

// ─── Fallbacks ────────────────────────────────────────────────────────────────
const FALLBACK_USER: User = { id: 1, name: 'Priya Sharma', points: 340, waste_saved_kg: 12.5, pickups: 6 };
const FALLBACK_COMMUNITIES: Community[] = [
  { id: 1, name: 'Sunshine Enclave',        zone: 'Gachibowli',  collection_day: 'Friday',    households: 280 },
  { id: 2, name: 'Green Meadows Residency', zone: 'Gachibowli',  collection_day: 'Friday',    households: 195 },
  { id: 4, name: 'Royal Enclave',           zone: 'Jubilee Hills', collection_day: 'Wednesday', households: 210 },
  { id: 7, name: 'Tech City Residences',    zone: 'Madhapur',    collection_day: 'Tuesday',   households: 320 },
];

const CATEGORIES = [
  { label: 'Plastic', price: '₹20/kg', emoji: '🧴', value: 'Plastic',  rate: 20 },
  { label: 'Metal',   price: '₹30/kg', emoji: '⚙️', value: 'Metal',    rate: 30 },
  { label: 'Paper',   price: '₹12/kg', emoji: '📄', value: 'Paper',    rate: 12 },
  { label: 'E-Waste', price: '₹60/kg', emoji: '💻', value: 'E-Waste',  rate: 60 },
];

const REWARD_ITEMS: RewardItem[] = [
  { id: 1, name: 'SwachhCycle Cap',  points_cost: 150, emoji: '🧢', description: 'Made from recycled PET plastic' },
  { id: 2, name: 'Eco T-Shirt',      points_cost: 300, emoji: '👕', description: 'Recycled fabric, premium quality' },
  { id: 3, name: 'Water Bottle',     points_cost: 200, emoji: '🍶', description: 'BPA-free sustainable bottle'     },
  { id: 4, name: 'Tote Bag',         points_cost: 100, emoji: '👜', description: 'Jute + recycled material blend'  },
];

const STATUS_STEPS = ['pending', 'assigned', 'collected'] as const;
const DAY_COLORS: Record<string, string> = {
  Monday: 'bg-blue-50 border-blue-200 text-blue-800',
  Tuesday: 'bg-purple-50 border-purple-200 text-purple-800',
  Wednesday: 'bg-amber-50 border-amber-200 text-amber-800',
  Thursday: 'bg-orange-50 border-orange-200 text-orange-800',
  Friday: 'bg-green-50 border-green-200 text-green-800',
  Saturday: 'bg-teal-50 border-teal-200 text-teal-800',
  Sunday: 'bg-rose-50 border-rose-200 text-rose-800',
};

function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[#15693b] border-t-transparent rounded-full animate-spin"/></div>;
}

// ─── HomeView ────────────────────────────────────────────────────────────────
function HomeView({ user, onRequestPickup }: { user: User; onRequestPickup: () => void }) {
  const progress = Math.min((user.points / 500) * 100, 100);
  return (
    <div className="space-y-4">
      <div className="bg-[#15693b] rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute right-8 bottom-0 w-20 h-20 bg-white/5 rounded-full translate-y-6" />
        <p className="text-green-200 text-sm mb-1">Good morning,</p>
        <h2 className="text-2xl font-bold mb-4">{user.name} 👋</h2>
        <div className="flex gap-6">
          <div><p className="text-2xl font-bold">{user.points}</p><p className="text-green-300 text-xs">Points earned</p></div>
          <div><p className="text-2xl font-bold">{user.waste_saved_kg} kg</p><p className="text-green-300 text-xs">Waste saved</p></div>
          <div><p className="text-2xl font-bold">{user.pickups}</p><p className="text-green-300 text-xs">Pickups</p></div>
        </div>
      </div>
      <button onClick={onRequestPickup} className="w-full bg-[#15693b] text-white rounded-2xl py-4 text-base font-semibold hover:bg-[#0f4d2c] transition-colors">
        📦 Request Scrap Pickup
      </button>
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Scrap Categories</h3>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.label} className="bg-white rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onRequestPickup}>
              <div className="text-4xl mb-2">{cat.emoji}</div>
              <p className="font-semibold text-gray-800">{cat.label}</p>
              <p className="text-sm text-gray-500">{cat.price}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🌱</span>
          <div>
            <p className="font-semibold text-gray-800">Your Eco Impact</p>
            <p className="text-sm text-gray-600">
              You&apos;ve diverted <span className="font-bold text-[#15693b]">{user.waste_saved_kg} kg</span> from landfills this month!
            </p>
          </div>
        </div>
        <div className="w-full bg-green-200 rounded-full h-2.5 mb-1">
          <div className="bg-[#15693b] h-2.5 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-500">{user.points} / 500 pts · Eco Champion badge</p>
      </div>
    </div>
  );
}

// ─── BookView (REFACTORED with Zonal Cluster) ─────────────────────────────────
function BookView({ userId, onSuccess }: { userId: number; onSuccess: () => void }) {
  const [communities, setCommunities]       = useState<Community[]>(FALLBACK_COMMUNITIES);
  const [commLoading, setCommLoading]       = useState(true);
  const [selectedCommId, setSelectedCommId] = useState<number | ''>('');
  const [category, setCategory]             = useState('Plastic');
  const [weight, setWeight]                 = useState('');
  const [loading, setLoading]               = useState(false);
  const [success, setSuccess]               = useState(false);
  const [error, setError]                   = useState('');

  // Fetch communities on mount
  useEffect(() => {
    async function fetchCommunities() {
      try {
        const { data, error } = await supabase
          .from('communities').select('*').order('zone').order('name');
        if (error) throw error;
        if (data?.length) setCommunities(data);
      } catch {
        setCommunities(FALLBACK_COMMUNITIES);
      } finally {
        setCommLoading(false);
      }
    }
    fetchCommunities();
  }, []);

  const selectedCommunity = communities.find((c) => c.id === selectedCommId) ?? null;
  const selectedCategory  = CATEGORIES.find((c) => c.value === category)!;
  const estimatedEarning  = weight ? Math.round(parseFloat(weight) * selectedCategory.rate) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!selectedCommId) { setError('Please select your Gated Community.'); return; }
    if (!weight || parseFloat(weight) <= 0) { setError('Please enter a valid estimated weight.'); return; }
    setLoading(true);
    try {
      const { error: insertError } = await supabase.from('pickups').insert({
        user_id:      userId,
        community_id: selectedCommId,
        category,
        est_weight:   parseFloat(weight),
        status:       'pending',
        created_at:   new Date().toISOString(),
      });
      if (insertError) throw insertError;
      setSuccess(true);
      setTimeout(() => onSuccess(), 1800);
    } catch {
      setError('Failed to schedule pickup. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="text-[#15693b]" size={36} />
        </div>
        <p className="text-xl font-bold text-gray-800">Pickup Scheduled!</p>
        {selectedCommunity && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3">
            <p className="text-sm text-[#15693b] font-semibold">🏘️ {selectedCommunity.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">Zonal Day: <strong>{selectedCommunity.collection_day}</strong></p>
          </div>
        )}
        <p className="text-sm text-gray-400">Redirecting to Track...</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-bold text-lg text-gray-800 mb-1">Schedule a Pickup</h3>
      <p className="text-xs text-gray-400 mb-5">SwachhCycle uses Zonal Cluster routing — your pickup is locked to your community&apos;s bulk collection day for 25% faster service.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">

          {/* Step 1 — Community Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <Building2 size={14} className="inline mr-1 text-[#15693b]" />
              Step 1 · Select Your Gated Community
            </label>
            {commLoading ? (
              <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <select
                value={selectedCommId}
                onChange={(e) => setSelectedCommId(e.target.value ? Number(e.target.value) : '')}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#15693b] bg-gray-50"
              >
                <option value="">— Choose your community —</option>
                {/* Group by zone */}
                {Array.from(new Set(communities.map((c) => c.zone))).sort().map((zone) => (
                  <optgroup key={zone} label={`📍 ${zone}`}>
                    {communities.filter((c) => c.zone === zone).map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.households} households)</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          {/* Zonal Day Banner — appears once community is selected */}
          {selectedCommunity && (
            <div className={`border-2 rounded-2xl p-4 ${DAY_COLORS[selectedCommunity.collection_day] || 'bg-green-50 border-green-200 text-green-800'}`}>
              <div className="flex items-start gap-3">
                <CalendarCheck size={22} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-sm">Zonal Cluster Assigned</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    Bulk pickup scheduled for <strong>{selectedCommunity.collection_day}</strong>s
                    · {selectedCommunity.zone} Zone
                  </p>
                  <p className="text-xs mt-1 opacity-70">
                    🏘️ {selectedCommunity.households} households · Route optimised for your area
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Step 2 · Scrap Category</label>
            <select
              value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#15693b] bg-gray-50"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label} — {c.price}</option>)}
            </select>
          </div>

          {/* Step 3 — Weight */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Step 3 · Estimated Weight (kg)</label>
            <input
              type="number" min="0.5" step="0.5" value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 5"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#15693b] bg-gray-50"
            />
          </div>
        </div>

        {/* Earning estimate */}
        {weight && parseFloat(weight) > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Estimated earning</p>
              <p className="text-2xl font-bold text-[#15693b]">₹{estimatedEarning}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Points to earn</p>
              <p className="text-lg font-bold text-[#15693b]">+{Math.round(estimatedEarning / 10)} pts</p>
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm text-center bg-red-50 border border-red-100 rounded-xl py-2 px-3">{error}</p>
        )}

        <button
          type="submit" disabled={loading || commLoading}
          className="w-full bg-[#15693b] text-white rounded-2xl py-4 text-base font-semibold hover:bg-[#0f4d2c] transition-colors disabled:opacity-60"
        >
          {loading ? 'Scheduling...' : '📦 Confirm Zonal Pickup'}
        </button>
      </form>
    </div>
  );
}

// ─── TrackView ────────────────────────────────────────────────────────────────
function TrackView({ userId }: { userId: number }) {
  const [pickups, setPickups] = useState<(Pickup & { communities: Community | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPickups() {
      try {
        const { data, error } = await supabase
          .from('pickups')
          .select('*, communities(id, name, zone, collection_day, households)')
          .eq('user_id', userId)
          .in('status', ['pending', 'assigned'])
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPickups(data || []);
      } catch {
        setPickups([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPickups();
  }, [userId]);

  const statusColor = (s: string) =>
    s === 'pending' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50';
  const statusIcon  = (s: string) => s === 'pending' ? <Clock size={12}/> : <Truck size={12}/>;
  const stepIdx     = (s: string) => STATUS_STEPS.indexOf(s as typeof STATUS_STEPS[number]);
  const catEmoji    = (c: string) => c === 'Plastic' ? '🧴' : c === 'Metal' ? '⚙️' : c === 'Paper' ? '📄' : '💻';

  if (loading) return <Spinner />;

  if (!pickups.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <span className="text-5xl">📭</span>
        <p className="font-semibold text-gray-700">No active pickups</p>
        <p className="text-sm text-gray-400">Schedule a pickup from the Book tab</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-bold text-lg text-gray-800 mb-4">Active Pickups</h3>
      <div className="space-y-4">
        {pickups.map((p) => {
          const community = p.communities;
          return (
            <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{catEmoji(p.category)}</span>
                  <div>
                    <p className="font-semibold text-gray-800">{p.category}</p>
                    <p className="text-xs text-gray-400">~{p.est_weight} kg</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor(p.status)}`}>
                  {statusIcon(p.status)} {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                </span>
              </div>

              {/* Zonal Cluster badge */}
              {community && (
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-3 border text-xs font-medium ${DAY_COLORS[community.collection_day] || 'bg-green-50 border-green-200 text-green-800'}`}>
                  <CalendarCheck size={13} />
                  <span>
                    <strong>{community.name}</strong> · {community.zone} Zone · Bulk day: <strong>{community.collection_day}</strong>
                  </span>
                </div>
              )}

              {/* Timeline */}
              <div className="flex items-center">
                {STATUS_STEPS.slice(0, 2).map((step, i) => {
                  const done   = stepIdx(p.status) > i;
                  const active = stepIdx(p.status) === i;
                  return (
                    <div key={step} className="flex items-center flex-1 last:flex-none">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                        ${done || active ? 'bg-[#15693b] border-[#15693b] text-white' : 'bg-white border-gray-200 text-gray-400'}`}>
                        {done ? '✓' : i + 1}
                      </div>
                      {i < 1 && <div className={`flex-1 h-1 ${done ? 'bg-[#15693b]' : 'bg-gray-100'}`} />}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">Requested</span>
                <span className="text-xs text-gray-400">Collector Assigned</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RewardsView ──────────────────────────────────────────────────────────────
function RewardsView({ user, onPointsUpdate }: { user: User; onPointsUpdate: (pts: number) => void }) {
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [redeemed, setRedeemed]   = useState<number[]>([]);
  const [msg, setMsg]             = useState('');
  const progress = Math.min((user.points / 500) * 100, 100);

  async function handleRedeem(item: RewardItem) {
    if (user.points < item.points_cost) { setMsg(`Not enough points for ${item.name}.`); return; }
    setRedeeming(item.id);
    try {
      const newPoints = user.points - item.points_cost;
      const { error } = await supabase.from('users').update({ points: newPoints }).eq('id', user.id);
      if (error) throw error;
      onPointsUpdate(newPoints);
      setRedeemed((prev) => [...prev, item.id]);
      setMsg(`🎉 ${item.name} redeemed! Your reward will be shipped soon.`);
    } catch {
      setMsg('Redemption failed. Please try again.');
    } finally {
      setRedeeming(null);
    }
  }

  return (
    <div>
      <div className="bg-[#15693b] rounded-2xl p-4 text-white mb-5">
        <p className="text-green-200 text-sm">Your SwachhCoins</p>
        <p className="text-4xl font-bold mt-1">{user.points} pts</p>
        <div className="w-full bg-white/20 rounded-full h-2 mt-3 mb-1">
          <div className="bg-white h-2 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-green-200 text-xs">{user.points} / 500 pts to Eco Champion</p>
      </div>
      {msg && <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-sm text-green-800 text-center">{msg}</div>}
      <h3 className="font-bold text-gray-800 mb-3">Redeem Rewards</h3>
      <div className="space-y-3">
        {REWARD_ITEMS.map((item) => {
          const canAfford  = user.points >= item.points_cost;
          const isRedeemed = redeemed.includes(item.id);
          return (
            <div key={item.id} className={`bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 ${!canAfford ? 'opacity-60' : ''}`}>
              <div className="text-3xl w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">{item.emoji}</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                <p className="text-xs text-gray-400">{item.description}</p>
                <p className="text-xs font-bold text-[#15693b] mt-1">{item.points_cost} pts</p>
              </div>
              <button
                disabled={!canAfford || isRedeemed || redeeming === item.id}
                onClick={() => handleRedeem(item)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${isRedeemed ? 'bg-gray-100 text-gray-400' : canAfford ? 'bg-[#15693b] text-white hover:bg-[#0f4d2c]' : 'bg-gray-100 text-gray-400'}`}
              >
                {isRedeemed ? 'Redeemed ✓' : redeeming === item.id ? '...' : 'Redeem'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── HistoryView ──────────────────────────────────────────────────────────────
function HistoryView({ userId }: { userId: number }) {
  const [pickups, setPickups] = useState<(Pickup & { communities: Community | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data, error } = await supabase
          .from('pickups')
          .select('*, communities(id, name, zone, collection_day, households)')
          .eq('user_id', userId)
          .eq('status', 'collected')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPickups(data || []);
      } catch {
        setPickups([]);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [userId]);

  const catEmoji = (c: string) => c === 'Plastic' ? '🧴' : c === 'Metal' ? '⚙️' : c === 'Paper' ? '📄' : '💻';
  const catPrice = (c: string) => c === 'Plastic' ? 20 : c === 'Metal' ? 30 : c === 'Paper' ? 12 : 60;

  if (loading) return <Spinner />;

  if (!pickups.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-5xl">📋</span>
        <p className="font-semibold text-gray-700">No completed pickups yet</p>
        <p className="text-sm text-gray-400">Your history will appear here</p>
      </div>
    );
  }

  const totalEarned = pickups.reduce((s, p) => s + (p.amount_paid || 0), 0);
  const totalKg     = pickups.reduce((s, p) => s + (p.actual_weight || p.est_weight || 0), 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-[#15693b] rounded-2xl p-4 text-white">
          <p className="text-green-200 text-xs">Total Earned</p>
          <p className="text-2xl font-bold">₹{totalEarned.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-gray-400 text-xs">Total Waste Saved</p>
          <p className="text-2xl font-bold text-gray-800">{totalKg.toFixed(1)} kg</p>
        </div>
      </div>
      <h3 className="font-bold text-gray-800 mb-3">Completed Pickups</h3>
      <div className="space-y-3">
        {pickups.map((p) => {
          const kg     = p.actual_weight || p.est_weight;
          const earned = p.amount_paid ?? Math.round(kg * catPrice(p.category));
          const points = Math.round(earned / 10);
          return (
            <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl">{catEmoji(p.category)}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{p.category}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {kg} kg
                  </p>
                  {p.communities && (
                    <p className="text-xs text-[#15693b] mt-0.5">🏘️ {p.communities.name}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#15693b]">₹{earned}</p>
                  <p className="text-xs text-gray-400">+{points} pts</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserApp() {
  const [user, setUser]           = useState<User>(FALLBACK_USER);
  const [activeNav, setActiveNav] = useState('Home');

  const navItems = [
    { label: 'Home',    icon: Home },
    { label: 'Book',    icon: BookOpen },
    { label: 'Track',   icon: MapPin },
    { label: 'Rewards', icon: Gift },
    { label: 'History', icon: ClipboardList },
  ];

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', 1).single();
        if (error || !data) throw error;
        setUser(data);
      } catch {
        setUser(FALLBACK_USER);
      }
    }
    fetchUser();
  }, []);

  const initials = user.name.split(' ').map((n: string) => n[0]).join('');

  function renderView() {
    switch (activeNav) {
      case 'Home':    return <HomeView user={user} onRequestPickup={() => setActiveNav('Book')} />;
      case 'Book':    return <BookView userId={user.id} onSuccess={() => setActiveNav('Track')} />;
      case 'Track':   return <TrackView userId={user.id} />;
      case 'Rewards': return <RewardsView user={user} onPointsUpdate={(pts) => setUser((u) => ({ ...u, points: pts }))} />;
      case 'History': return <HistoryView userId={user.id} />;
      default:        return null;
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f9f5]">
      <div className="max-w-md mx-auto pb-24 relative">
        <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">♻️</span>
            <span className="font-bold text-gray-800 text-lg">SwachhCycle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#15693b] flex items-center justify-center text-white font-semibold text-sm">{initials}</div>
            <button className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50">Logout</button>
          </div>
        </div>
        <div className="px-4 pt-4">{renderView()}</div>
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 max-w-md mx-auto z-10">
          <div className="flex justify-around py-2">
            {navItems.map(({ label, icon: Icon }) => {
              const isActive = activeNav === label;
              return (
                <button key={label} onClick={() => setActiveNav(label)} className="flex flex-col items-center gap-1 px-3 py-1">
                  <Icon size={22} className={isActive ? 'text-[#15693b]' : 'text-gray-400'} />
                  <span className={`text-xs ${isActive ? 'text-[#15693b] font-semibold' : 'text-gray-400'}`}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
