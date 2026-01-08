import PayWithPlasmaButton from "@/components/PayWithPlasmaButton";

export default function CheckoutPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Checkout (Demo)</h1>
      <p style={{ marginBottom: 16 }}>Enter an amount and click the button to test the full flow.</p>
      <PayWithPlasmaButton defaultAmount="0.10" />
    </main>
  );
}


