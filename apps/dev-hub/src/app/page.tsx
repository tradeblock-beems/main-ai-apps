
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <div className="space-y-8">
        <h1 className="text-5xl font-bold text-center">
          Tradeblock Dev Hub
        </h1>
        <div className="flex justify-center space-x-4">
          <Link href="/email-hub" className="px-6 py-3 bg-blue-600 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
            Email Hub
          </Link>
          <Link href="/push-blaster" className="px-6 py-3 bg-green-600 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors">
            Push Blaster
          </Link>
        </div>
      </div>
    </main>
  );
}
