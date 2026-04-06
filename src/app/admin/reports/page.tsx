import { prisma } from "@/lib/prisma";

function formatNgnFromKobo(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Math.round(kobo / 100));
}

export default async function AdminReportsPage() {
  const payments = await prisma.featuredPayment.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      property: {
        select: {
          title: true,
          city: true,
        },
      },
    },
  });

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/[0.06] sm:p-8">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-accent/10 p-2">
          <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-muted">
            Featured payment transactions across the marketplace.
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-black/[0.06] bg-white">
        <table className="min-w-full divide-y divide-black/[0.06] text-sm">
          <thead className="bg-black/[0.02] text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2.5">Created</th>
              <th className="px-3 py-2.5">Reference</th>
              <th className="px-3 py-2.5">Owner</th>
              <th className="px-3 py-2.5">Listing</th>
              <th className="px-3 py-2.5">Amount</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Paid At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {payments.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-muted" colSpan={7}>
                  <svg className="mx-auto h-8 w-8 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                  <p className="mt-2 text-sm">No featured payment transactions yet.</p>
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="transition hover:bg-black/[0.01]">
                  <td className="px-3 py-2.5">{new Date(payment.createdAt).toLocaleString("en-NG")}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{payment.reference}</td>
                  <td className="px-3 py-2.5">{payment.ownerEmail}</td>
                  <td className="px-3 py-2.5">
                    {payment.property.title}
                    <div className="text-xs text-muted">{payment.property.city}</div>
                  </td>
                  <td className="px-3 py-2.5 font-semibold">{formatNgnFromKobo(payment.amount)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      payment.status === "PAID" ? "bg-emerald-50 text-emerald-700"
                      : payment.status === "PENDING" ? "bg-amber-50 text-amber-700"
                      : "bg-gray-50 text-gray-600"
                    }`}>{payment.status}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {payment.paidAt ? new Date(payment.paidAt).toLocaleString("en-NG") : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
