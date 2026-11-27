import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Admin sign-in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <Container className="py-20">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">Admin sign-in</h1>
        <p className="mt-2 text-sm text-slate-500">Authorised staff only.</p>
        <LoginForm next={next} />
      </div>
    </Container>
  );
}
