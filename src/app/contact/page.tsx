export const metadata = {
  title: "Contact | NaijaProperty Hub",
};

export default function ContactPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10 md:px-10">
      <h1 className="text-3xl font-semibold md:text-4xl">Contact</h1>
      <p className="mt-4 text-muted">
        Reach out for listing support, payment issues, or account verification help.
      </p>
      <div className="mt-8 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-black/5">
        <p className="text-sm text-muted">Email</p>
        <p className="text-lg font-semibold">mbanefodaniel01@gmail.com</p>
        <p className="mt-4 text-sm text-muted">Business Hours</p>
        <p className="text-base font-semibold">Mon - Fri, 9:00 AM - 6:00 PM WAT</p>
      </div>
    </main>
  );
}
