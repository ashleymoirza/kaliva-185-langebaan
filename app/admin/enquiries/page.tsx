import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listBookings, listMessages } from "@/lib/bookings-store";
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
  const [bookings, messages] = await Promise.all([listBookings(), listMessages()]);
  const counts: Record<string, number> = {};
  for (const m of messages) counts[m.bookingId] = (counts[m.bookingId] ?? 0) + 1;
  const first = bookings[0];
  const initialDetail = first ? { booking: first, messages: messages.filter((m) => m.bookingId === first.id) } : null;

  return (
    <Container className="py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Enquiries</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every enquiry becomes a ticket here. Reply to guests, confirm or cancel, and send a deposit link.
        </p>
      </header>
      <EnquiryInbox initialBookings={bookings} messageCounts={counts} channels={configuredChannels()} initialDetail={initialDetail} />
    </Container>
  );
}
