// ── CONFIG ───────────────────────────────────────────────────
const API   = 'http://localhost:5000/api';
const GQL   = 'http://localhost:5000/graphql';

// ── TOKEN HELPERS ────────────────────────────────────────────
const Auth = {
  save:    (token, user) => {
    localStorage.setItem('sc_token', token);
    localStorage.setItem('sc_user',  JSON.stringify(user));
  },
  token:   ()  => localStorage.getItem('sc_token'),
  user:    ()  => JSON.parse(localStorage.getItem('sc_user') || 'null'),
  clear:   ()  => { localStorage.removeItem('sc_token'); localStorage.removeItem('sc_user'); },
  isLoggedIn: () => !!localStorage.getItem('sc_token'),
};

// ── REST API HELPER ──────────────────────────────────────────
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (Auth.token()) opts.headers['Authorization'] = `Bearer ${Auth.token()}`;
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── GRAPHQL HELPER ───────────────────────────────────────────
async function gql(query, variables = {}) {
  const res = await fetch(GQL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      ...(Auth.token() && { 'Authorization': `Bearer ${Auth.token()}` }),
    },
    body: JSON.stringify({ query, variables }),
  });
  const { data, errors } = await res.json();
  if (errors) throw new Error(errors[0].message);
  return data;
}

// ── UI HELPERS ───────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function formatPrice(p) { return '₹' + Number(p).toLocaleString('en-IN'); }
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}