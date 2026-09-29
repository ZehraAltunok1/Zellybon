export function renderMenu(user) {
  document.getElementById('menu-username').textContent = user.username;
  document.getElementById('menu-best').textContent = (user.bestScore ?? 0).toLocaleString('tr-TR');
}
