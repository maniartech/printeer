async function fetchCatalog() {
  const res = await fetch('/__catalog.json');
  if (!res.ok) throw new Error('Failed to load catalog');
  return res.json();
}

function normalize(str) {
  return (str || '').toLowerCase();
}

function routeMatches(q, route, groupTitle) {
  if (!q) return true;
  const s = normalize(q);
  return (
    normalize(route.title).includes(s) ||
    normalize(route.path).includes(s) ||
    normalize(groupTitle).includes(s)
  );
}

function createRouteItem(baseUrl, route) {
  const li = document.createElement('li');
  li.className = 'route';
  const link = document.createElement('a');
  link.href = `${baseUrl}${route.path}`;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = route.title || route.path;
  const pathEl = document.createElement('span');
  pathEl.className = 'path';
  pathEl.textContent = route.path;
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = (route.method || 'GET').toUpperCase();
  li.appendChild(link);
  const right = document.createElement('div');
  right.style.display = 'flex';
  right.style.gap = '8px';
  right.appendChild(pathEl);
  right.appendChild(badge);
  li.appendChild(right);
  return li;
}

function render(catalog) {
  const meta = document.getElementById('meta');
  const port = document.getElementById('port');
  const groupsEl = document.getElementById('groups');
  port.textContent = String(catalog.port);
  meta.textContent = `${catalog.name || 'Printeer Mock Server'} • ${catalog.baseUrl}`;

  function refresh(filter) {
    groupsEl.innerHTML = '';
    for (const group of catalog.groups || []) {
      const filtered = (group.routes || []).filter(r => routeMatches(filter, r, group.title));
      if (!filtered.length) continue;
      const card = document.createElement('section');
      card.className = 'group';
      const header = document.createElement('header');
      const h2 = document.createElement('h2');
      h2.textContent = group.title || group.id;
      header.appendChild(h2);
      card.appendChild(header);

      const ul = document.createElement('ul');
      ul.className = 'routes';
      for (const route of filtered) {
        ul.appendChild(createRouteItem(catalog.baseUrl, route));
      }
      card.appendChild(ul);
      groupsEl.appendChild(card);
    }
  }

  const search = document.getElementById('search');
  search.addEventListener('input', () => refresh(search.value));
  refresh('');
}

(async function init() {
  try {
    const catalog = await fetchCatalog();
    render(catalog);
  } catch (e) {
    console.error(e);
    document.getElementById('groups').innerHTML = '<div class="meta">Failed to load catalog.</div>';
  }
})();
