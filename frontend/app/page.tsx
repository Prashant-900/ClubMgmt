import { MemberGrid } from "@/components/members/MemberGrid";

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-8 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
            Members
          </h1>
        </div>
        <p className="text-sm text-gray-500 ml-5">
          Manage all club members, coordinators, and admins
        </p>
      </div>

      {/* Member Grid */}
      <MemberGrid />
    </div>
  );
}
