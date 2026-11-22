import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <nav className="no-print flex flex-wrap gap-2 text-sm">
        <Link href="/admin" className="btn-ghost">Overview</Link>
        <Link href="/admin/rounds" className="btn-ghost">Rounds &amp; lottery</Link>
        <Link href="/admin/chores" className="btn-ghost">Chores</Link>
        <Link href="/admin/users" className="btn-ghost">Residents</Link>
      </nav>
      {children}
    </div>
  );
}
