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
    <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="mt-2 text-sm text-muted">
        Featured payment transactions across the marketplace.
      </p>

      <div className="mt-5 overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="min-w-full divide-y divide-black/10 text-sm">
          <thead className="bg-black/[0.03] text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Listing</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Paid At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {payments.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted" colSpan={7}>
                  No featured payment transactions yet.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-3 py-2">{new Date(payment.createdAt).toLocaleString("en-NG")}</td>
                  <td className="px-3 py-2 font-mono text-xs">{payment.reference}</td>
                  <td className="px-3 py-2">{payment.ownerEmail}</td>
                  <td className="px-3 py-2">
                    {payment.property.title}
                    <div className="text-xs text-muted">{payment.property.city}</div>
                  </td>
                  <td className="px-3 py-2">{formatNgnFromKobo(payment.amount)}</td>
                  <td className="px-3 py-2 font-semibold">{payment.status}</td>
                  <td className="px-3 py-2">
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
