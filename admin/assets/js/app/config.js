// assets/js/app/config.js
const APP_CONFIG = {
  API_BASE_URL: '/api', // Aynı origin'den çalışıyoruz
};

async function apiRequest(path, options = {}) {
  const url = APP_CONFIG.API_BASE_URL + path;

  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include' // cookie tabanlı oturum için
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };

  const response = await fetch(url, finalOptions);

  if (!response.ok) {
    throw response;
  }

  if (response.status === 204) return null;

  return response.json();
}
