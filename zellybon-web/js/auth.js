// Giriş / kayıt formu.

import { Api, setToken, clearToken } from './api.js';

const USERNAME_RE = /^[a-z0-9_]{3,16}$/;

export function initAuth({ onLoggedIn }) {
  const form = document.getElementById('auth-form');
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const errorEl = document.getElementById('auth-error');
  const buttons = form.querySelectorAll('button');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  async function submit(mode) {
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    if (!USERNAME_RE.test(username)) {
      showError('Kullanıcı adı 3-16 karakter olmalı ve sadece harf (a-z), rakam ve _ içermeli.');
      usernameInput.focus();
      return;
    }
    if (password.length < 6) {
      showError('Şifre en az 6 karakter olmalı.');
      passwordInput.focus();
      return;
    }

    showError('');
    buttons.forEach((b) => (b.disabled = true));
    try {
      const { token, user } = mode === 'register'
        ? await Api.register(username, password)
        : await Api.login(username, password);
      setToken(token);
      passwordInput.value = '';
      onLoggedIn(user);
    } catch (err) {
      showError(err.message);
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit(e.submitter?.dataset.mode === 'register' ? 'register' : 'login');
  });

  return {
    reset(message = '') {
      passwordInput.value = '';
      showError(message);
    },
  };
}

export function logout() {
  clearToken();
}
