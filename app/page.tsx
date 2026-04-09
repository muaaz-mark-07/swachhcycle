import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f4f9f5] flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center mb-4">
        <div className="text-5xl mb-3">♻️</div>
        <h1 className="text-3xl font-bold text-gray-900">SwachhCycle</h1>
        <p className="text-gray-500 mt-1">AI-Powered Dry Waste Intelligence Platform</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/user"
          className="bg-[#15693b] text-white px-8 py-4 rounded-2xl font-semibold text-center hover:bg-[#0f4d2c] transition-colors shadow-sm">
          👤 User App
        </Link>
        <Link href="/collector"
          className="bg-[#15693b] text-white px-8 py-4 rounded-2xl font-semibold text-center hover:bg-[#0f4d2c] transition-colors shadow-sm">
          🚛 Collector App
        </Link>
        <Link href="/admin"
          className="bg-[#15693b] text-white px-8 py-4 rounded-2xl font-semibold text-center hover:bg-[#0f4d2c] transition-colors shadow-sm">
          📊 Admin Dashboard
        </Link>
      </div>
    </div>
  );
}
