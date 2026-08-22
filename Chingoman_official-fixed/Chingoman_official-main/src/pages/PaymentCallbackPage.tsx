import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { supabase } from '@/lib/supabase';

type Status = 'verifying' | 'paid' | 'failed' | 'error';

export function PaymentCallbackPage() {
  const { navigate } = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Paystack appends the reference as either `reference` or `trxref`
    // depending on the integration path.
    const reference = params.get('reference') ?? params.get('trxref');

    if (!reference) {
      setStatus('error');
      setMessage('No payment reference was found in the URL.');
      return;
    }

    supabase.functions.invoke('paystack-verify', { body: { reference } }).then(({ data, error }) => {
      if (error || !data?.ok) {
        setStatus('error');
        setMessage(data?.error ?? error?.message ?? 'Could not verify your payment.');
        return;
      }
      if (data.status === 'paid') {
        setStatus('paid');
      } else {
        setStatus('failed');
        setMessage("Paystack reported this payment didn't complete. No charge should have been made.");
      }
    });
  }, []);

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      {status === 'verifying' && (
        <>
          <Loader2 className="w-10 h-10 mx-auto mb-4 text-slate-400 animate-spin" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Confirming your payment...</h1>
          <p className="text-slate-500">This only takes a moment.</p>
        </>
      )}

      {status === 'paid' && (
        <>
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Confirmed</h1>
          <p className="text-slate-500 mb-6">
            Your listing fee has been paid and your vehicle has been sent to our team for review.
            You'll be notified once it's approved and live.
          </p>
          <button onClick={() => navigate({ name: 'dashboard' })} className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            Go to My Dashboard
          </button>
        </>
      )}

      {(status === 'failed' || status === 'error') && (
        <>
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Not Completed</h1>
          <p className="text-slate-500 mb-6">{message}</p>
          <button onClick={() => navigate({ name: 'dashboard' })} className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
            Go to My Dashboard to Retry
          </button>
        </>
      )}
    </div>
  );
}
