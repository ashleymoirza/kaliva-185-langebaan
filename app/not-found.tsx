import Container from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-slate-600">The page you were looking for may have moved or no longer exists.</p>
      <div className="mt-8 flex justify-center gap-3">
        <LinkButton href="/">Back home</LinkButton>
        <LinkButton href="/units" variant="secondary">Browse apartments</LinkButton>
      </div>
    </Container>
  );
}
