import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listBookings, listMessages } from "@/lib/bookings-store";
import { listLeads } from "@/lib/leads-store";
import { configuredChannels } from "@/lib/notify";
import EnquiryInbox from "@/components/admin/EnquiryInbox";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Enquiries (CRM)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EnquiriesPage() {
  await requireAdmin();
  const [bookings, messages, leads] = await Promise.all([
    listBookings(),
    listMessages(),
    listLeads(),
  ]);
  const counts: Record<string, number> = {};
  for (const m of messages) counts[m.bookingId] = (counts[m.bookingId] ?? 0) + 1;
  const first = bookings[0];
  const initialDetail = first ? { booking: first, messages: messages.filter((m) => m.bookingId === first.id) } : null;
  
  // Lead counts by status
  const leadStatusCounts: Record<string, number> = {};
  for (const l of leads) {
    leadStatusCounts[l.status] = (leadStatusCounts[l.status] ?? 0) + 1;
  }

  return (
    <Container className="py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Enquiries</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every enquiry becomes a ticket here. Reply to guests, confirm or cancel, and send a deposit link.
        </p>
      </header>
      <EnquiryInbox initialBookings={bookings} messageCounts={counts} channels={configuredChannels()} initialDetail={initialDetail} />
      {/* Lead summary section */}
      {leadStatusCounts && Object.keys(leadStatusCounts).length > 0 && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h2 className="text-xl font-bold text-slate-900 mb-3">Leads</h2>
          <p className="text-sm text-slate-500">
            {Object.entries(leadStatusCounts).map(([status, count]) => (
              <span key={status} className="mr-2">
                {status}: {count}
              </span>
            ))}
          </p>
        </div>
      )}
    </Container>
  );
}
