import { supabase } from "./supabase";

// The private bucket's existing owner/admin SELECT policy authorizes this request.
export async function paymentReceiptUrl(path: string): Promise<string> {
  if (!path.trim()) throw new Error("No payment slip was uploaded for this payment.");
  const { data, error } = await supabase.storage.from("payment-receipts").createSignedUrl(path, 600);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Could not load this payment slip. Please try again.");
  return data.signedUrl;
}

export function paymentReceiptError(error: unknown): string {
  const detail = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  return detail ? `Could not load the payment slip: ${detail}` : "Could not load the payment slip. Check your connection and try again.";
}
