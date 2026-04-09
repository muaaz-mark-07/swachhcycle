'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard, Users, Truck, Package, Recycle, BarChart2,
  LogOut, Plus, Pencil, Check, X, Building2, MapPin, Calendar,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Pickup = {
  id: number; user_id: number; collector_id: number | null; community_id: number | null;
  category: string; est_weight: number; actual_weight: number | null;
  status: 'pending' | 'assigned' | 'collected'; amount_paid: number | null; created_at: string;
};
type Collector  = { id: number; name: string; rating: number; sector: string; total_jobs: number };
type Category   = { id: number; name: string; price_per_kg: number };
type Community  = { id: number; name: string; zone: string; collection_day: string; households: number; address?: string };

// ─── Fallbacks ────────────────────────────────────────────────────────────────
const FALLBACK_ANALYTICS  = { total_collected: 8240, total_revenue: 87000, avg_pickup: 4.2, user_growth: 23 };
const FALLBACK_COLLECTORS: Collector[] = [
  { id: 1, name: 'Ravi Kumar',   rating: 4.8, sector: 'Sector 14',   total_jobs: 47 },
  { id: 2, name: 'Suresh M',     rating: 4.6, sector: 'Sector 9-22', total_jobs: 31 },
  { id: 3, name: 'Deepak Verma', rating: 4.3, sector: 'Sector 5',    total_jobs: 18 },
];
const FALLBACK_CATEGORIES: Category[] = [
  { id: 1, name: 'Plastic', price_per_kg: 20 },
  { id: 2, name: 'Metal',   price_per_kg: 30 },
  { id: 3, name: 'Paper',   price_per_kg: 12 },
  { id: 4, name: 'E-Waste', price_per_kg: 60 },
];
const FALLBACK_COMMUNITIES: Community[] = [
  { id: 1, name: 'Sunshine Enclave',        zone: 'Gachibowli',   collection_day: 'Friday',    households: 280 },
  { id: 2, name: 'Green Meadows Residency', zone: 'Gachibowli',   collection_day: 'Friday',    households: 195 },
  { id: 4, name: 'Royal Enclave',           zone: 'Jubilee Hills', collection_day: 'Wednesday', households: 210 },
  { id: 7, name: 'Tech City Residences',    zone: 'Madhapur',     collection_day: 'Tuesday',   households: 320 },
];

const MONTHLY_DATA = [
  { month: 'Jan', kg: 320 }, { month: 'Feb', kg: 480 }, { month: 'Mar', kg: 560 },
  { month: 'Apr', kg: 410 }, { month: 'May', kg: 690 }, { month: 'Jun', kg: 720 },
  { month: 'Jul', kg: 810 }, { month: 'Aug', kg: 640 }, { month: 'Sep', kg: 750 },
  { month: 'Oct', kg: 880 }, { month: 'Nov', kg: 960 }, { month: 'Dec', kg: 1020 },
];
const CATEGORIES_BREAKDOWN = [
  { label: 'Plastic', pct: 43, kg: 1240, color: '#2563eb' },
  { label: 'Metal',   pct: 29, kg: 830,  color: '#6b7280' },
  { label: 'Paper',   pct: 21, kg: 620,  color: '#f97316' },
  { label: 'E-Waste', pct: 7,  kg: 210,  color: '#7c3aed' },
];

const NAV_ITEMS = [
  { label: 'Dashboard',          icon: LayoutDashboard },
  { label: 'Community Requests', icon: Users },
  { label: 'Communities',        icon: Building2 },      // ← New
  { label: 'Collectors',         icon: Truck },
  { label: 'Scrap Management',   icon: Package },
  { label: 'Recyclers',          icon: Recycle },
  { label: 'Analytics',          icon: BarChart2 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Spinner() {
  return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#15693b] border-t-transparent rounded-full animate-spin"/></div>;
}
const catEmoji    = (c: string) => c === 'Plastic' ? '🧴' : c === 'Metal' ? '⚙️' : c === 'Paper' ? '📄' : '💻';
const statusBadge = (s: string) => ({ pending: 'bg-amber-50 text-amber-700', assigned: 'bg-blue-50 text-blue-700', collected: 'bg-green-50 text-green-700' }[s] || 'bg-gray-50 text-gray-600');

const ZONE_COLORS: Record<string, { border: string; header: string; badge: string; day: string }> = {
  Gachibowli:    { border: 'border-green-300',  header: 'bg-green-600',  badge: 'bg-green-100 text-green-800',  day: 'bg-green-50 text-green-700 border-green-200' },
  'Jubilee Hills':{ border: 'border-amber-300', header: 'bg-amber-600',  badge: 'bg-amber-100 text-amber-800',  day: 'bg-amber-50 text-amber-700 border-amber-200' },
  Madhapur:      { border: 'border-purple-300', header: 'bg-purple-600', badge: 'bg-purple-100 text-purple-800', day: 'bg-purple-50 text-purple-700 border-purple-200' },
  'Banjara Hills':{ border: 'border-blue-300',  header: 'bg-blue-600',   badge: 'bg-blue-100 text-blue-800',   day: 'bg-blue-50 text-blue-700 border-blue-200' },
};
const DEFAULT_ZONE_COLOR = { border: 'border-gray-300', header: 'bg-gray-600', badge: 'bg-gray-100 text-gray-700', day: 'bg-gray-50 text-gray-600 border-gray-200' };

// ─── AnalyticsView ────────────────────────────────────────────────────────────
function AnalyticsView({ period, setPeriod }: { period: string; setPeriod: (p: string) => void }) {
  const [analytics, setAnalytics]   = useState(FALLBACK_ANALYTICS);
  const [collectors, setCollectors] = useState<Collector[]>(FALLBACK_COLLECTORS);

  useEffect(() => {
    async function fetchData() {
      try { const { data: a } = await supabase.from('analytics').select('*').single(); if (a) setAnalytics(a); } catch {}
      try {
        const { data: c } = await supabase.from('collectors').select('*').order('total_jobs', { ascending: false }).limit(3);
        if (c?.length) setCollectors(c);
      } catch {}
    }
    fetchData();
  }, []);

  const maxJobs = Math.max(...collectors.map((c) => c.total_jobs));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Platform performance and waste collection insights</p>
        </div>
        <div className="flex gap-2">
          {['This Year', 'Last 6 Months', 'Last 3 Months'].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${period === p ? 'bg-[#15693b] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'TOTAL COLLECTED', value: `${analytics.total_collected.toLocaleString('en-IN')} kg`, icon: '⚖️', iconBg: '#fef3c7' },
          { label: 'TOTAL REVENUE',   value: `₹${analytics.total_revenue.toLocaleString('en-IN')}`,    icon: '💰', iconBg: '#fef3c7' },
          { label: 'AVG PER PICKUP',  value: `${analytics.avg_pickup} kg`,                              icon: '📦', iconBg: '#fed7aa' },
          { label: 'USER GROWTH',     value: `↑ ${analytics.user_growth}%`,                             icon: '👥', iconBg: '#e0e7ff' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 border-l-4 border-l-green-400 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-gray-400 font-semibold tracking-wider">{kpi.label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: kpi.iconBg }}>{kpi.icon}</div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Monthly Scrap Collected (kg)</h3>
          <span className="text-sm text-gray-400">Total: {analytics.total_collected.toLocaleString('en-IN')} kg</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={MONTHLY_DATA} barCategoryGap="15%">
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip formatter={(v) => v != null ? [`${v} kg`, 'Collected'] : ['—', 'Collected']} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
            <Bar dataKey="kg" radius={[6, 6, 0, 0]}>
              {MONTHLY_DATA.map((entry) => {
                const shade = Math.round(30 + ((entry.kg - 320) / (1020 - 320)) * 70);
                return <Cell key={entry.month} fill={entry.month === 'Dec' ? '#0d3d21' : `hsl(145, 60%, ${100 - shade}%)`} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Category Breakdown</h3>
          <div className="space-y-4">
            {CATEGORIES_BREAKDOWN.map((cat) => (
              <div key={cat.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: cat.color }} />{cat.label}
                  </div>
                  <span className="text-sm text-gray-500">{cat.pct}% · {cat.kg} kg</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${cat.pct}%`, background: cat.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Top Collectors</h3>
          <div className="space-y-4">
            {collectors.map((collector, idx) => (
              <div key={collector.id}>
                <div className="flex items-center gap-3 mb-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>{idx + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-800 text-sm">{collector.name}</p>
                      <span className="text-xs text-gray-500 font-semibold">{collector.total_jobs} jobs</span>
                    </div>
                  </div>
                </div>
                <div className="ml-10">
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                    <div className="bg-[#15693b] h-2 rounded-full" style={{ width: `${(collector.total_jobs / maxJobs) * 100}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">⭐ {collector.rating} rating · {collector.sector}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DashboardOverview ────────────────────────────────────────────────────────
function DashboardOverview() {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from('pickups').select('*').order('created_at', { ascending: false }).limit(10);
        if (error) throw error;
        setPickups(data || []);
      } catch { setPickups([]); } finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  const pending   = pickups.filter((p) => p.status === 'pending').length;
  const assigned  = pickups.filter((p) => p.status === 'assigned').length;
  const collected = pickups.filter((p) => p.status === 'collected').length;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Dashboard</h1><p className="text-sm text-gray-400 mt-0.5">Platform overview and live activity</p></div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending',   val: pending,   color: 'border-l-amber-400', icon: '⏳' },
          { label: 'Assigned',  val: assigned,  color: 'border-l-blue-400',  icon: '🚛' },
          { label: 'Collected', val: collected, color: 'border-l-green-400', icon: '✅' },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-2xl p-4 border-l-4 ${s.color} shadow-sm`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-3xl font-bold text-gray-900">{s.val}</p>
            <p className="text-sm text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Recent Activity</h3>
          <span className="text-xs text-gray-400">Last 10 events</span>
        </div>
        <div className="divide-y divide-gray-50">
          {!pickups.length ? (
            <p className="text-center py-10 text-gray-400 text-sm">No activity yet</p>
          ) : pickups.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-base">{catEmoji(p.category)}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{p.category} Pickup</p>
                <p className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(p.status)}`}>
                {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── CommunityRequests ────────────────────────────────────────────────────────
function CommunityRequests() {
  const [pickups, setPickups]   = useState<Pickup[]>([]);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from('pickups').select('*, communities(name, zone)').order('created_at', { ascending: false });
        if (error) throw error;
        setPickups(data || []);
      } catch { setPickups([]); } finally { setLoading(false); }
    }
    load();
  }, []);

  async function updateStatus(id: number, status: string) {
    setUpdating(id);
    try {
      const { error } = await supabase.from('pickups').update({ status }).eq('id', id);
      if (error) throw error;
      setPickups((prev) => prev.map((p) => p.id === id ? { ...p, status: status as Pickup['status'] } : p));
    } catch { alert('Update failed.'); } finally { setUpdating(null); }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Community Requests</h1><p className="text-sm text-gray-400 mt-0.5">All pickup requests across the platform</p></div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Community</th>
              <th className="px-5 py-3">Est. Weight</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Override</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!pickups.length ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No pickups found</td></tr>
            ) : pickups.map((p) => {
              const community = (p as any).communities;
              return (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-mono text-gray-400 text-xs">#{p.id}</td>
                  <td className="px-5 py-3"><span className="flex items-center gap-1.5 font-medium text-gray-800">{catEmoji(p.category)} {p.category}</span></td>
                  <td className="px-5 py-3">
                    {community ? (
                      <div>
                        <p className="text-xs font-medium text-gray-700">{community.name}</p>
                        <p className="text-xs text-gray-400">{community.zone}</p>
                      </div>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{p.est_weight} kg</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-5 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(p.status)}`}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span></td>
                  <td className="px-5 py-3">
                    <select
                      value={p.status} disabled={updating === p.id}
                      onChange={(e) => updateStatus(p.id, e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#15693b] disabled:opacity-50"
                    >
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="collected">Collected</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CommunitiesView (NEW — Zonal Cluster Admin View) ─────────────────────────
function CommunitiesView() {
  const [communities, setCommunities] = useState<Community[]>(FALLBACK_COMMUNITIES);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [form, setForm]               = useState({ name: '', zone: '', collection_day: 'Friday', households: '' });

  async function load() {
    try {
      const { data, error } = await supabase.from('communities').select('*').order('zone').order('name');
      if (error) throw error;
      if (data?.length) setCommunities(data);
    } catch { setCommunities(FALLBACK_COMMUNITIES); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function addCommunity(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.zone || !form.households) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('communities').insert({
        name: form.name, zone: form.zone,
        collection_day: form.collection_day,
        households: parseInt(form.households),
      });
      if (error) throw error;
      setForm({ name: '', zone: '', collection_day: 'Friday', households: '' });
      setShowForm(false);
      await load();
    } catch { alert('Failed to add community.'); } finally { setSaving(false); }
  }

  if (loading) return <Spinner />;

  // Group communities by zone
  const zones = Array.from(new Set(communities.map((c) => c.zone))).sort();
  const grouped = zones.reduce<Record<string, Community[]>>((acc, zone) => {
    acc[zone] = communities.filter((c) => c.zone === zone);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zonal Clusters</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {zones.length} zones · {communities.length} communities · {communities.reduce((s, c) => s + c.households, 0).toLocaleString('en-IN')} total households
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#15693b] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0f4d2c] transition-colors"
        >
          <Plus size={16} /> Add Community
        </button>
      </div>

      {/* Add Community Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
          <h3 className="font-semibold text-gray-800 mb-4">New Gated Community</h3>
          <form onSubmit={addCommunity} className="grid grid-cols-2 gap-3">
            <input placeholder="Community Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15693b]" />
            <input placeholder="Zone (e.g. Gachibowli) *" value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15693b]" />
            <select value={form.collection_day} onChange={(e) => setForm((f) => ({ ...f, collection_day: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15693b]">
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d) => <option key={d}>{d}</option>)}
            </select>
            <input type="number" placeholder="Households *" value={form.households} onChange={(e) => setForm((f) => ({ ...f, households: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15693b]" />
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="text-sm bg-[#15693b] text-white px-4 py-2 rounded-xl hover:bg-[#0f4d2c] disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Community'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Zones grouped display */}
      <div className="grid grid-cols-1 gap-6">
        {zones.map((zone) => {
          const zoneCommunities = grouped[zone];
          const colors          = ZONE_COLORS[zone] ?? DEFAULT_ZONE_COLOR;
          const totalHouseholds = zoneCommunities.reduce((s, c) => s + c.households, 0);
          // All communities in a zone share the same day (by design)
          const collectionDay   = zoneCommunities[0]?.collection_day ?? '—';

          return (
            <div key={zone} className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden ${colors.border}`}>
              {/* Zone Header */}
              <div className={`${colors.header} px-5 py-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <MapPin size={18} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-lg leading-tight">{zone}</h2>
                      <p className="text-white/70 text-xs">{zoneCommunities.length} communities in this cluster</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3 py-1.5 mb-1">
                      <Calendar size={13} className="text-white" />
                      <span className="text-white font-semibold text-sm">{collectionDay}s</span>
                    </div>
                    <p className="text-white/70 text-xs">{totalHouseholds.toLocaleString('en-IN')} households</p>
                  </div>
                </div>

                {/* Zone efficiency stats */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: 'Communities', val: zoneCommunities.length },
                    { label: 'Households',  val: totalHouseholds.toLocaleString('en-IN') },
                    { label: 'Transit Save', val: '~25%' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/15 rounded-xl p-2.5 text-center">
                      <p className="text-white font-bold text-base">{s.val}</p>
                      <p className="text-white/70 text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Communities in this zone */}
              <div className="divide-y divide-gray-50">
                {zoneCommunities.map((community, idx) => (
                  <div key={community.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-xs flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{community.name}</p>
                          {community.address && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <MapPin size={10} /> {community.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colors.day}`}>
                          📅 {community.collection_day}
                        </span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
                          🏘️ {community.households.toLocaleString('en-IN')} HH
                        </span>
                      </div>
                    </div>

                    {/* Mini density bar */}
                    <div className="mt-2.5 ml-10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Routing density</span>
                        <span className="text-xs font-semibold text-gray-600">{community.households} households</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-[#15693b] transition-all duration-700"
                          style={{ width: `${Math.min((community.households / 400) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Zone footer */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">
                  🚛 Bulk collection every <strong>{collectionDay}</strong> — optimised route
                </span>
                <span className="text-xs text-[#15693b] font-semibold">
                  {totalHouseholds} HH / collection
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CollectorsView ───────────────────────────────────────────────────────────
function CollectorsView() {
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ name: '', sector: '', rating: '4.5' });
  const [saving, setSaving]         = useState(false);

  async function load() {
    try {
      const { data, error } = await supabase.from('collectors').select('*').order('total_jobs', { ascending: false });
      if (error) throw error;
      setCollectors(data || []);
    } catch { setCollectors(FALLBACK_COLLECTORS); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function addCollector(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.sector) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('collectors').insert({ name: form.name, sector: form.sector, rating: parseFloat(form.rating), total_jobs: 0 });
      if (error) throw error;
      setForm({ name: '', sector: '', rating: '4.5' });
      setShowForm(false);
      await load();
    } catch { alert('Failed to add collector.'); } finally { setSaving(false); }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Collectors</h1><p className="text-sm text-gray-400 mt-0.5">{collectors.length} registered collectors</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-[#15693b] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0f4d2c]">
          <Plus size={16} /> Add Collector
        </button>
      </div>
      {showForm && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-100">
          <h3 className="font-semibold text-gray-800 mb-4">New Collector</h3>
          <form onSubmit={addCollector} className="grid grid-cols-3 gap-3">
            <input placeholder="Full Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15693b]" />
            <input placeholder="Sector *" value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15693b]" />
            <input type="number" min="1" max="5" step="0.1" placeholder="Rating" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#15693b]" />
            <div className="col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="text-sm bg-[#15693b] text-white px-4 py-2 rounded-xl hover:bg-[#0f4d2c] disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"><th className="px-5 py-3">Name</th><th className="px-5 py-3">Sector</th><th className="px-5 py-3">Rating</th><th className="px-5 py-3">Total Jobs</th></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {collectors.map((c, idx) => (
              <tr key={c.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-gray-400' : 'bg-[#15693b]'}`}>{c.name[0]}</div>
                    <span className="font-medium text-gray-800">{c.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-500">{c.sector}</td>
                <td className="px-5 py-3"><span className="text-amber-500">⭐</span> <span className="font-medium text-gray-800">{c.rating}</span></td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-100 rounded-full h-1.5"><div className="bg-[#15693b] h-1.5 rounded-full" style={{ width: `${Math.min((c.total_jobs / 50) * 100, 100)}%` }} /></div>
                    <span className="text-gray-700 font-semibold text-xs">{c.total_jobs}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ScrapManagement ──────────────────────────────────────────────────────────
function ScrapManagement() {
  const [cats, setCats]           = useState<Category[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editId, setEditId]       = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [saving, setSaving]       = useState(false);
  const catEmojis: Record<string, string> = { Plastic: '🧴', Metal: '⚙️', Paper: '📄', 'E-Waste': '💻' };

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from('categories').select('*').order('id');
        if (error) throw error;
        setCats(data?.length ? data : FALLBACK_CATEGORIES);
      } catch { setCats(FALLBACK_CATEGORIES); } finally { setLoading(false); }
    }
    load();
  }, []);

  async function savePrice(cat: Category) {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('categories').update({ price_per_kg: price }).eq('id', cat.id);
      if (error) throw error;
      setCats((prev) => prev.map((c) => c.id === cat.id ? { ...c, price_per_kg: price } : c));
      setEditId(null);
    } catch { alert('Update failed.'); } finally { setSaving(false); }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Scrap Management</h1><p className="text-sm text-gray-400 mt-0.5">Edit category prices — changes apply immediately to new pickups</p></div>
      <div className="grid grid-cols-2 gap-4">
        {cats.map((cat) => {
          const isEditing = editId === cat.id;
          return (
            <div key={cat.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl">{catEmojis[cat.name] || '♻️'}</div>
                <div><p className="font-semibold text-gray-800">{cat.name}</p><p className="text-xs text-gray-400">Price per kg</p></div>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">₹</span>
                  <input type="number" min="1" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} autoFocus
                    className="flex-1 border border-[#15693b] rounded-lg px-3 py-2 text-sm font-bold focus:outline-none" />
                  <button onClick={() => savePrice(cat)} disabled={saving} className="w-8 h-8 bg-[#15693b] text-white rounded-lg flex items-center justify-center"><Check size={14} /></button>
                  <button onClick={() => setEditId(null)} className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><X size={14} className="text-gray-500" /></button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-[#15693b]">₹{cat.price_per_kg}<span className="text-sm font-normal text-gray-400">/kg</span></p>
                  <button onClick={() => { setEditId(cat.id); setEditPrice(String(cat.price_per_kg)); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">
                    <Pencil size={12} /> Edit
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RecyclersView ────────────────────────────────────────────────────────────
function RecyclersView() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Recyclers</h1><p className="text-sm text-gray-400 mt-0.5">B2B Recycler Marketplace</p></div>
      <div className="bg-white rounded-2xl p-16 shadow-sm flex flex-col items-center justify-center text-center gap-4">
        <div className="text-6xl">♻️</div>
        <h2 className="text-xl font-bold text-gray-800">B2B Recycler Marketplace Integration</h2>
        <p className="text-gray-400 text-sm max-w-md">Connect directly with certified industrial recyclers. Trade verified, high-purity dry waste at premium rates with full blockchain-backed EPR certificate generation.</p>
        <div className="flex gap-2 mt-2">
          {['Coming Soon', 'Phase 3', 'EPR Integration'].map((tag) => (
            <span key={tag} className="bg-green-50 text-[#15693b] text-xs font-semibold px-3 py-1 rounded-full border border-green-100">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeNav, setActiveNav] = useState('Analytics');
  const [period, setPeriod]       = useState('This Year');

  function renderView() {
    switch (activeNav) {
      case 'Analytics':          return <AnalyticsView period={period} setPeriod={setPeriod} />;
      case 'Dashboard':          return <DashboardOverview />;
      case 'Community Requests': return <CommunityRequests />;
      case 'Communities':        return <CommunitiesView />;
      case 'Collectors':         return <CollectorsView />;
      case 'Scrap Management':   return <ScrapManagement />;
      case 'Recyclers':          return <RecyclersView />;
      default:                   return null;
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f4f9f5]">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col min-h-screen fixed left-0 top-0 bottom-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">♻️</span>
            <div><p className="font-bold text-gray-800 text-sm leading-tight">SwachhCycle</p><p className="text-xs text-gray-400">Admin Dashboard</p></div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ label, icon: Icon }) => {
            const isActive = activeNav === label;
            return (
              <button key={label} onClick={() => setActiveNav(label)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${isActive ? 'bg-green-50 text-[#15693b] font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
                <Icon size={17} /> {label}
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#15693b] flex items-center justify-center text-white text-xs font-bold">AD</div>
            <div><p className="text-sm font-medium text-gray-800">Admin</p><p className="text-xs text-gray-400">Super Admin</p></div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 border border-gray-200 rounded-xl py-2 hover:bg-gray-50">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>
      <main className="ml-56 flex-1 p-6">{renderView()}</main>
    </div>
  );
}
