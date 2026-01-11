import { AlertCircle, Home, Search } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="market-card p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-white/40" />
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-2">
          404
        </h1>
        
        <h2 className="text-xl font-semibold text-white/80 mb-4">
          Page Not Found
        </h2>
        
        <p className="text-white/60 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          
          <Link
            href="/?category=all"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 font-semibold transition"
          >
            <Search className="w-5 h-5" />
            Browse Markets
          </Link>
        </div>
      </div>
    </div>
  );
}
