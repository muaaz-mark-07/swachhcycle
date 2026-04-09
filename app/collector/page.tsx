'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard, FileText, Map, CheckSquare, IndianRupee, MapPin, Building2, Users,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Community = { id: number; name: string; zone: string; collection_day: string; households: number };
type Pickup = {
  id: number; user_id: number; collector_id: number | null; community_id: number | null;
  category: string; est_weight: number; actual_weight: number | null;
  status: 'pending' | 'assigned' | 'collected'; amount_paid: number | null; created_at: string;
  communities?: Community | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const COLLECTOR_ID = 1;

const FALLBACK_EARNINGS   = { today: 320, week: 2840, month: 12400, totalJobs: 47 };
const FALLBACK_WEEK_DATA  = [
  { day: 'Mon', earnings: 420 }, { day: 'Tue', earnings: 310 },
  { day: 'Wed', earnings: 580 }, { day: 'Thu', earnings: 240 },
  { day: 'Fri', earnings: 490 }, { day: 'Sat', earnings: 620 },
  { day: 'Sun', earnings: 180 },
];
const FALLBACK_COMPLETIONS = [
  { id: 1, category: 'Plastic',  date: 'Apr 3, 2026',  weight_kg: 4, amount_paid: 80,  emoji: '🧴' },
  { id: 2, category: 'E-Waste', date: 'Mar 28, 2026', weight_kg: 2, amount_paid: 120, emoji: '💻' },
];

const catPrice = (c: string) => c === 'Plastic' ? 20 : c === 'Metal' ? 30 : c === 'Paper' ? 12 : 60;
const catEmoji = (c: string) => c === 'Plastic' ? '🧴' : c === 'Metal' ? '⚙️' : c === 'Paper' ? '📄' : '💻';

const DAY_ACCENT: Record<string, { ring: string; bg: string; text: string; badge: string }> = {
  Monday:    { ring: 'border-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-800',   badge: 'bg-blue-100 text-blue-800'   },
  Tuesday:   { ring: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-800', badge: 'bg-purple-100 text-purple-800' },
  Wednesday: { ring: 'border-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-800',  badge: 'bg-amber-100 text-amber-800'  },
  Thursday:  { ring: 'border-orange-400', bg: 'bg-orange-50', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-800' },
  Friday:    { ring: 'border-green-400',  bg: 'bg-green-50',  text: 'text-green-800',  badge: 'bg-green-100 text-green-800'  },
  Saturday:  { ring: 'border-teal-400',   bg: 'bg-teal-50',   text: 'text-teal-800',   badge: 'bg-teal-100 text-teal-800'    },
  Sunday:    { ring: 'border-rose-400',   bg: 'bg-rose-50',   text: 'text-rose-800',   badge: 'bg-rose-100 text-rose-800'    },
};

function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[#15693b] border-t-transparent rounded-full animate-spin"/></div>;
}

// ─── Zonal Cluster Header Banner ──────────────────────────────────────────────
function ZonalBanner({ community }: { community: Community }) {
  const accent = DAY_ACCENT[community.collection_day] ?? DAY_ACCENT.Friday;
  return (
    <div className={`rounded-2xl border-2 p-4 mb-4 ${accent.ring} ${accent.bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <Building2 size={16} className={accent.text} />
        <span className={`text-xs font-bold uppercase tracking-wider ${accent.text}`}>Active Zonal Cluster</span>
      </div>
      <p className={`text-lg font-bold ${accent.text}`}>{community.name}</p>
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${accent.badge}`}>
          📍 {community.zone} Zone
        </span>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${accent.badge}`}>
          📅 {community.collection_day}s
        </span>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${accent.badge}`}>
          🏘️ {community.households} households
        </span>
      </div>
      <p className={`text-xs mt-2 opacity-70 ${accent.text}`}>
        ✅ Bulk collection — 25% less transit time vs. on-demand routing
      </p>
    </div>
  );
}

// ─── DashboardView ────────────────────────────────────────────────────────────
function DashboardView() {
  const [earnings, setEarnings]       = useState(FALLBACK_EARNINGS);
  const [weekData]                    = useState(FALLBACK_WEEK_DATA);
  const [completions, setCompletions] = useState(FALLBACK_COMPLETIONS);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: pickups, error } = await supabase
          .from('pickups').select('*').eq('collector_id', COLLECTOR_ID)
          .order('created_at', { ascending: false }).limit(10);
        if (error || !pickups) throw error;

        const isToday   = (d: string) => new Date(d).toDateString() === new Date().toDateString();
        const todayTotal = pickups.filter((p: Pickup) => isToday(p.created_at) && p.status === 'collected').reduce((s: number, p: Pickup) => s + (p.amount_paid ?? 0), 0);
        const collected  = pickups.filter((p: Pickup) => p.status === 'collected');

        setEarnings((prev) => ({ ...prev, today: todayTotal || prev.today, totalJobs: collected.length || prev.totalJobs }));
        setCompletions(collected.slice(0, 5).map((p: Pickup) => ({
          id: p.id, category: p.category,
          date: new Date(p.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
          weight_kg: p.actual_weight ?? p.est_weight, amount_paid: p.amount_paid ?? 0, emoji: catEmoji(p.category),
        })));
      } catch { /* use fallbacks */ } finally { setLoading(false); }
    }
    fetchData();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Today',      value: `₹${earnings.today.toLocaleString('en-IN')}`, emoji: '📅' },
          { label: 'This Week',  value: `₹${earnings.week.toLocaleString('en-IN')}`,  emoji: '📅' },
          { label: 'This Month', value: `₹${earnings.month.toLocaleString('en-IN')}`, emoji: '📅' },
          { label: 'Total Jobs', value: earnings.totalJobs,                             emoji: '📦' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-l-green-200">
            <div className="text-3xl mb-2">{item.emoji}</div>
            <p className="text-2xl font-bold text-gray-800">{item.value}</p>
            <p className="text-sm text-gray-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">This Week</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekData} barCategoryGap="20%">
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis hide />
            <Tooltip formatter={(v) => [typeof v === 'number' ? `₹${v}` : '₹0', 'Earnings']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
            <Bar dataKey="earnings" radius={[6, 6, 0, 0]}>
              {weekData.map((entry) => <Cell key={entry.day} fill={entry.day === 'Sat' ? '#15693b' : '#86efac'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Recent Completions</h3>
        <div className="space-y-3">
          {completions.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl">{item.emoji}</div>
                <div>
                  <p className="font-medium text-gray-800">{item.category}</p>
                  <p className="text-xs text-gray-400">{item.date} · {item.weight_kg} kg</p>
                </div>
              </div>
              <span className="text-[#15693b] font-bold text-base">+₹{item.amount_paid}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── RequestsView ─────────────────────────────────────────────────────────────
function RequestsView() {
  const [pickups, setPickups]     = useState<Pickup[]>([]);
  const [loading, setLoading]     = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);

  async function load() {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select('*, communities(id, name, zone, collection_day, households)')
        .eq('status', 'pending')
        .order('community_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPickups(data || []);
    } catch { setPickups([]); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function acceptJob(pickupId: number) {
    setAccepting(pickupId);
    try {
      const { error } = await supabase.from('pickups')
        .update({ status: 'assigned', collector_id: COLLECTOR_ID })
        .eq('id', pickupId);
      if (error) throw error;
      setPickups((prev) => prev.filter((p) => p.id !== pickupId));
    } catch {
      alert('Failed to accept job. Please try again.');
    } finally {
      setAccepting(null);
    }
  }

  if (loading) return <Spinner />;

  if (!pickups.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <span className="text-5xl">✅</span>
        <p className="font-semibold text-gray-700">No pending requests</p>
        <p className="text-sm text-gray-400">New pickup requests will appear here</p>
      </div>
    );
  }

  // Group by community
  const grouped = pickups.reduce<Record<string, Pickup[]>>((acc, p) => {
    const key = p.communities?.name ?? 'Unassigned Zone';
    acc[key] = acc[key] ? [...acc[key], p] : [p];
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <h3 className="font-bold text-lg text-gray-800">Available Requests</h3>
      {Object.entries(grouped).map(([communityName, jobs]) => {
        const community = jobs[0].communities;
        const accent    = community ? (DAY_ACCENT[community.collection_day] ?? DAY_ACCENT.Friday) : DAY_ACCENT.Friday;
        return (
          <div key={communityName}>
            {community && <ZonalBanner community={community} />}
            <div className="space-y-3">
              {jobs.map((p) => {
                const est = Math.round(p.est_weight * catPrice(p.category));
                return (
                  <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl">{catEmoji(p.category)}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{p.category}</p>
                        <p className="text-xs text-gray-400">~{p.est_weight} kg · Est. ₹{est}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-xs font-semibold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">Pending</span>
                    </div>
                    <button
                      onClick={() => acceptJob(p.id)}
                      disabled={accepting === p.id}
                      className="w-full bg-[#15693b] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#0f4d2c] transition-colors disabled:opacity-60"
                    >
                      {accepting === p.id ? 'Accepting...' : '✓ Accept Job'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── RouteView (REFACTORED — grouped by community cluster) ────────────────────
function RouteView() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('pickups')
          .select('*, communities(id, name, zone, collection_day, households)')
          .eq('status', 'assigned')
          .eq('collector_id', COLLECTOR_ID)
          .order('community_id');
        if (error) throw error;
        setPickups(data || []);
      } catch { setPickups([]); } finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  // Group pickups by community
  const grouped = pickups.reduce<Record<number, Pickup[]>>((acc, p) => {
    const key = p.community_id ?? 0;
    acc[key] = acc[key] ? [...acc[key], p] : [p];
    return acc;
  }, {});

  const communityGroups = Object.entries(grouped);

  return (
    <div>
      <h3 className="font-bold text-lg text-gray-800 mb-1">Today&apos;s Route</h3>
      <p className="text-xs text-gray-400 mb-4">
        {pickups.length} pickup{pickups.length !== 1 ? 's' : ''} across {communityGroups.length} cluster{communityGroups.length !== 1 ? 's' : ''}
      </p>

      {/* Map placeholder */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm mb-5">
        <div className="w-full h-40 bg-gradient-to-br from-green-100 to-emerald-50 flex flex-col items-center justify-center gap-2 relative">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg,#15693b 0,#15693b 1px,transparent 1px,transparent 36px),repeating-linear-gradient(90deg,#15693b 0,#15693b 1px,transparent 1px,transparent 36px)' }} />
          {communityGroups.map(([key, jobs], i) => {
            const community = jobs[0].communities;
            return community ? (
              <div key={key} className="flex items-center gap-2 z-10">
                <div className="w-6 h-6 rounded-full bg-[#15693b] text-white text-xs font-bold flex items-center justify-center">{i + 1}</div>
                <span className="text-xs font-semibold text-[#15693b]">{community.name} — {jobs.length} stop{jobs.length !== 1 ? 's' : ''}</span>
              </div>
            ) : null;
          })}
          {communityGroups.length === 0 && (
            <>
              <MapPin className="text-[#15693b]" size={28} />
              <p className="text-[#15693b] font-semibold text-sm">No clusters assigned yet</p>
            </>
          )}
        </div>
        <div className="p-2.5 bg-green-50 border-t border-green-100 text-center">
          <p className="text-xs text-[#15693b] font-semibold">
            🗺️ GPS route optimisation — {communityGroups.length} cluster{communityGroups.length !== 1 ? 's' : ''} today
          </p>
        </div>
      </div>

      {!pickups.length ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <span className="text-4xl">🗺️</span>
          <p className="font-semibold text-gray-700">No assigned pickups</p>
          <p className="text-sm text-gray-400">Accept jobs from the Requests tab</p>
        </div>
      ) : (
        <div className="space-y-5">
          {communityGroups.map(([communityKey, jobs], clusterIdx) => {
            const community = jobs[0].communities ?? null;
            const accent    = community ? (DAY_ACCENT[community.collection_day] ?? DAY_ACCENT.Friday) : DAY_ACCENT.Friday;
            const totalEst  = jobs.reduce((s, p) => s + Math.round(p.est_weight * catPrice(p.category)), 0);
            const totalKg   = jobs.reduce((s, p) => s + p.est_weight, 0);

            return (
              <div key={communityKey}>
                {/* Community Cluster Header */}
                {community ? (
                  <ZonalBanner community={community} />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 mb-3">
                    <p className="text-sm font-semibold text-gray-600">Cluster {clusterIdx + 1} · No community assigned</p>
                  </div>
                )}

                {/* Cluster stats */}
                <div className={`grid grid-cols-3 gap-2 mb-3`}>
                  {[
                    { label: 'Stops',     val: `${jobs.length}` },
                    { label: 'Total Est.', val: `${totalKg.toFixed(1)} kg` },
                    { label: 'Est. Earn', val: `₹${totalEst}` },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl p-2.5 text-center shadow-sm border border-gray-100">
                      <p className="text-base font-bold text-gray-800">{s.val}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Individual stops */}
                <div className="space-y-2">
                  {jobs.map((p, idx) => (
                    <div key={p.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#15693b] text-white font-bold flex items-center justify-center text-xs">{idx + 1}</div>
                      <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-lg">{catEmoji(p.category)}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">{p.category}</p>
                        <p className="text-xs text-gray-400">~{p.est_weight} kg · Est. ₹{Math.round(p.est_weight * catPrice(p.category))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CollectView (REFACTORED — grouped by community cluster) ──────────────────
function CollectView() {
  const [pickups, setPickups]         = useState<Pickup[]>([]);
  const [loading, setLoading]         = useState(true);
  const [weights, setWeights]         = useState<Record<number, string>>({});
  const [completing, setCompleting]   = useState<number | null>(null);
  const [doneIds, setDoneIds]         = useState<number[]>([]);

  async function load() {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select('*, communities(id, name, zone, collection_day, households)')
        .eq('status', 'assigned')
        .eq('collector_id', COLLECTOR_ID)
        .order('community_id');
      if (error) throw error;
      setPickups(data || []);
    } catch { setPickups([]); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function markComplete(p: Pickup) {
    const actualWeight = parseFloat(weights[p.id] || String(p.est_weight));
    if (isNaN(actualWeight) || actualWeight <= 0) { alert('Please enter a valid weight.'); return; }
    setCompleting(p.id);
    const amountPaid   = Math.round(actualWeight * catPrice(p.category));
    const pointsEarned = Math.round(amountPaid / 10);
    try {
      const { error: pickupErr } = await supabase.from('pickups')
        .update({ status: 'collected', actual_weight: actualWeight, amount_paid: amountPaid })
        .eq('id', p.id);
      if (pickupErr) throw pickupErr;
      const { data: userData } = await supabase.from('users').select('points, waste_saved_kg').eq('id', p.user_id).single();
      if (userData) {
        await supabase.from('users').update({
          points:         (userData.points || 0) + pointsEarned,
          waste_saved_kg: ((userData.waste_saved_kg || 0) + actualWeight),
        }).eq('id', p.user_id);
      }
      setDoneIds((prev) => [...prev, p.id]);
    } catch {
      alert('Failed to mark complete. Please try again.');
    } finally {
      setCompleting(null);
    }
  }

  if (loading) return <Spinner />;

  const active = pickups.filter((p) => !doneIds.includes(p.id));

  // Group active pickups by community
  const grouped = active.reduce<Record<number, Pickup[]>>((acc, p) => {
    const key = p.community_id ?? 0;
    acc[key] = acc[key] ? [...acc[key], p] : [p];
    return acc;
  }, {});

  return (
    <div>
      <h3 className="font-bold text-lg text-gray-800 mb-4">Collect Scrap</h3>

      {doneIds.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-3 mb-4 text-center">
          <p className="text-sm font-semibold text-[#15693b]">✓ {doneIds.length} job{doneIds.length > 1 ? 's' : ''} completed — great work!</p>
        </div>
      )}

      {!active.length ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="text-5xl">📦</span>
          <p className="font-semibold text-gray-700">No active jobs</p>
          <p className="text-sm text-gray-400">Accept requests to start collecting</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([communityKey, jobs]) => {
            const community = jobs[0].communities ?? null;
            return (
              <div key={communityKey}>
                {/* Zonal cluster banner */}
                {community ? (
                  <ZonalBanner community={community} />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 mb-3">
                    <p className="text-sm font-semibold text-gray-600">No community assigned</p>
                  </div>
                )}

                <div className="space-y-3">
                  {jobs.map((p) => {
                    const actualW   = parseFloat(weights[p.id] || '');
                    const actualAmt = !isNaN(actualW) ? Math.round(actualW * catPrice(p.category)) : null;
                    return (
                      <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-xl">{catEmoji(p.category)}</div>
                          <div>
                            <p className="font-semibold text-gray-800">{p.category}</p>
                            <p className="text-xs text-gray-400">Est. {p.est_weight} kg · ₹{catPrice(p.category)}/kg</p>
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Actual Weight (kg)</label>
                          <input
                            type="number" min="0.1" step="0.1"
                            placeholder={`Est. ${p.est_weight} kg`}
                            value={weights[p.id] || ''}
                            onChange={(e) => setWeights((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15693b] bg-gray-50"
                          />
                        </div>
                        {actualAmt !== null && (
                          <div className="bg-green-50 rounded-xl p-3 mb-3 flex justify-between">
                            <span className="text-xs text-gray-500">Amount to pay user</span>
                            <span className="font-bold text-[#15693b]">₹{actualAmt}</span>
                          </div>
                        )}
                        <button
                          onClick={() => markComplete(p)}
                          disabled={completing === p.id}
                          className="w-full bg-[#15693b] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#0f4d2c] transition-colors disabled:opacity-60"
                        >
                          {completing === p.id ? 'Saving...' : '✓ Mark Complete'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── EarningsView ─────────────────────────────────────────────────────────────
function EarningsView() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('pickups').select('*').eq('collector_id', COLLECTOR_ID)
          .eq('status', 'collected').order('created_at', { ascending: false });
        if (error) throw error;
        setPickups(data || []);
      } catch { setPickups([]); } finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  const total   = pickups.reduce((s, p) => s + (p.amount_paid ?? 0), 0);
  const totalKg = pickups.reduce((s, p) => s + (p.actual_weight ?? p.est_weight), 0);

  return (
    <div>
      <div className="bg-[#15693b] rounded-2xl p-4 text-white mb-5">
        <p className="text-green-200 text-sm">Total Lifetime Earnings</p>
        <p className="text-3xl font-bold mt-1">₹{total.toLocaleString('en-IN')}</p>
        <p className="text-green-300 text-xs mt-1">{pickups.length} jobs · {totalKg.toFixed(1)} kg collected</p>
      </div>
      <h3 className="font-bold text-gray-800 mb-3">Job History</h3>
      {!pickups.length ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <span className="text-4xl">💰</span>
          <p className="text-gray-500 text-sm">No completed jobs yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-4 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <span>Category</span><span>Weight</span><span>Date</span><span className="text-right">Earned</span>
          </div>
          {pickups.map((p, idx) => (
            <div key={p.id} className={`grid grid-cols-4 px-4 py-3 items-center text-sm ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
              <span className="flex items-center gap-1.5 font-medium text-gray-800"><span>{catEmoji(p.category)}</span>{p.category}</span>
              <span className="text-gray-500">{p.actual_weight ?? p.est_weight} kg</span>
              <span className="text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              <span className="text-right font-bold text-[#15693b]">₹{p.amount_paid ?? 0}</span>
            </div>
          ))}
          <div className="grid grid-cols-4 px-4 py-3 bg-green-50 border-t border-green-100">
            <span className="col-span-3 font-semibold text-gray-700 text-sm">Total</span>
            <span className="text-right font-bold text-[#15693b]">₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CollectorApp() {
  const [activeNav, setActiveNav] = useState('Dashboard');

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Requests',  icon: FileText },
    { label: 'Route',     icon: Map },
    { label: 'Collect',   icon: CheckSquare },
    { label: 'Earnings',  icon: IndianRupee },
  ];

  function renderView() {
    switch (activeNav) {
      case 'Dashboard': return <DashboardView />;
      case 'Requests':  return <RequestsView />;
      case 'Route':     return <RouteView />;
      case 'Collect':   return <CollectView />;
      case 'Earnings':  return <EarningsView />;
      default:          return null;
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f9f5]">
      <div className="max-w-md mx-auto pb-24 relative">
        <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚛</span>
            <span className="font-bold text-gray-800 text-lg">Collector App</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Online
            </span>
            <button className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600">Logout</button>
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
