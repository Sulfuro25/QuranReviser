const list = document.getElementById('list');
function render() {
  const frag = document.createDocumentFragment();
  for (let i = 1; i <= 30; i++) {
    const a = document.createElement('a');
    a.href = `reader.html?juz=${i}`;
    a.className = 'block';
    a.setAttribute('role', 'listitem');
    a.innerHTML = `<h2>Juz ${i}</h2><p>Click to open (range view coming soon)</p>`;
    frag.appendChild(a);
  }
  list.replaceChildren(frag);
}
document.addEventListener('DOMContentLoaded', () => {
  render();
});

