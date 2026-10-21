// Opens Razorpay's payment window. Only the PUBLIC key id is used here; the secret lives on the server.
function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the payment window. Check your internet connection.'));
    document.body.appendChild(s);
  });
}

export async function openRazorpay({ key, orderId, amountPaise, name, description, prefill }) {
  await loadScript();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key, order_id: orderId, amount: amountPaise, currency: 'INR', name, description, prefill,
      theme: { color: '#000000' },
      handler: (resp) => resolve(resp),
      modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
    });
    rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed.')));
    rzp.open();
  });
}
