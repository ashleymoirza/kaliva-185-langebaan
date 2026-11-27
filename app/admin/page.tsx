import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listBookings } from "@/lib/bookings-store";
import AdminDashboard from "@/components/admin/AdminDashboard";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();
  const bookings = await listBookings();

  return (
    <Container className="py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Admin dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Signed in as {session.email}</p>
      </header>
      <AdminDashboard initialBookings={bookings} />
    </Container>
  );
}
