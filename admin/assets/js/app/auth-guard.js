async function ensureAuthenticated() {
  try {
    const me = await apiRequest('/auth/me');
    localStorage.setItem('currentUser', JSON.stringify(me));
    return me;
  } catch (err) {
    // 401 vs.
    window.location.href = '/html/vertical-menu-template/auth-login.html';
    throw err;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Bu dosyayı tüm korumalı sayfalara ekleyeceğiz
  ensureAuthenticated();
});
