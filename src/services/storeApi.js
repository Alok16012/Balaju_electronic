const API_BASE = import.meta.env.VITE_API_BASE_URL;

async function request(path, options = {}) {
  if (!API_BASE) throw new Error('Live API is not configured');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {'Content-Type': 'application/json', ...options.headers},
  });
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.status === 204 ? null : response.json();
}

export const storeApi = {
  products: params => request(`/products?${new URLSearchParams(params)}`),
  requestOtp: phone => request('/auth/otp', {method:'POST', body:JSON.stringify({phone})}),
  verifyOtp: payload => request('/auth/verify', {method:'POST', body:JSON.stringify(payload)}),
  serviceability: pincode => request(`/delivery/serviceability?pincode=${encodeURIComponent(pincode)}`),
  validateCoupon: (code, cart) => request('/coupons/validate', {method:'POST', body:JSON.stringify({code,cart})}),
  createOrder: payload => request('/orders', {method:'POST', body:JSON.stringify(payload)}),
  createPayment: orderId => request('/payments', {method:'POST', body:JSON.stringify({orderId})}),
};
