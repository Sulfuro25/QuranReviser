const list = document.getElementById('list');
function render() {
  const frag = document.createDocumentFragment();
  for (let i = 1; i <= 60; i++) {
    const a = document.createElement('a');
    a.href = `reader.html?hizb=${i}`;
    a.className = 'block';
    a.setAttribute('role', 'listitem');
    a.innerHTML = `<h2>Hizb ${i}</h2><p>Click to open (range view coming soon)</p>`;
    frag.appendChild(a);
  }
  list.replaceChildren(frag);
}
document.addEventListener('DOMContentLoaded', () => {
  render();
});

