const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let loadingPromise = null;

/** Loads Razorpay's checkout.js script once, when the first payment starts. */
export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (!loadingPromise) {
    loadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loadingPromise = null;
        reject(new Error('Could not load Razorpay. Check your internet connection.'));
      };
      document.body.appendChild(script);
    });
  }
  return loadingPromise;
}
