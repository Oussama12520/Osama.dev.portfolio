// ── GLOBAL ERROR HANDLING ──
window.onerror = function(msg, url, line) {
  console.error("System Error:", msg, "at", url, ":", line);
  const status = document.getElementById('last-activity');
  if (status) {
    status.textContent = "Error: " + msg.substring(0, 20);
    status.style.color = "var(--red)";
  }
};

// ── STATE ──
let captchaValue = 0;
let lastSubmitTime = 0;

function checkRateLimit() {
  const LIMIT = 15; // Max 15 loads
  const WINDOW = 60000; // 1 minute
  let loads = JSON.parse(localStorage.getItem('osama_loads') || '[]');
  const now = Date.now();
  loads = loads.filter(t => now - t < WINDOW);
  loads.push(now);
  localStorage.setItem('osama_loads', JSON.stringify(loads));

  if (loads.length > LIMIT) {
    document.body.innerHTML = `
      <div style="height:100vh; background:#0a0a0c; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:var(--font-sans); text-align:center; padding:20px">
        <div style="font-size:60px; color:var(--accent); margin-bottom:20px">⚠️</div>
        <h1 style="font-size:24px; margin-bottom:10px">Rate Limit Exceeded</h1>
        <p style="color:var(--text2); max-width:400px; line-height:1.6">Too many requests detected. To protect our infrastructure, access has been temporarily restricted. Please wait a moment and try again.</p>
        <div id="rate-timer" style="margin-top:30px; font-family:var(--font-mono); color:var(--accent); font-size:20px"></div>
      </div>`;
    
    let seconds = 30;
    const timer = setInterval(() => {
      seconds--;
      const el = document.getElementById('rate-timer');
      if (el) el.textContent = `Unblocking in ${seconds}s...`;
      if (seconds <= 0) { clearInterval(timer); location.reload(); }
    }, 1000);
    return true;
  }
  return false;
}

if (checkRateLimit()) {
  throw new Error("Rate limit exceeded");
}

const DEFAULT_STATE = {
  projects: [
    { id: 1, title: "Microservices Auth Platform", desc: "Distributed authentication system with JWT, OAuth2, and role-based access control serving 500k+ daily requests. Built with async Python and Redis caching.", techs: ["Python", "FastAPI", "Redis", "PostgreSQL", "Docker"], demo: "", github: "", images: [], cat: "API" },
    { id: 2, title: "Real-time Analytics Pipeline", desc: "Event-driven data pipeline processing 10M+ events/day using Kafka streams, with a GraphQL API layer and automated alerting system.", techs: ["Node.js", "Kafka", "GraphQL", "ClickHouse", "K8s"], demo: "", github: "", images: [], cat: "Microservice" },
    { id: 3, title: "E-Commerce Backend API", desc: "Full-featured e-commerce API with inventory management, payment gateway integration, order tracking, and admin dashboard built in C# .NET.", techs: ["C#", ".NET 8", "SQL Server", "Stripe", "Azure"], demo: "", github: "", images: [], cat: "API" }
  ],
  certs: [
    { id: 1, title: "AWS Certified Solutions Architect", issuer: "Amazon Web Services", date: "2024-03", img: "", emoji: "☁️" },
    { id: 2, title: "MongoDB Certified Developer", issuer: "MongoDB University", date: "2023-11", img: "", emoji: "🗄️" }
  ],
  messages: [],
  settings: {
    github: "https://github.com/Oussama12520",
    linkedin: "https://www.linkedin.com/in/oussemamasmoudi-a18151362/",
    email: "oussemamasmoudi7@gmail.com",
    discord: "https://discord.gg/RhpHd3Uyge",
    telegram: "t.me/iOsama_0x1",
    instagram: "https://www.instagram.com/ous7x_/",
    skills: "Python,FastAPI,C#,.NET,Node.js,Express,PostgreSQL,MongoDB,Redis,Docker,Kubernetes,REST APIs,GraphQL,gRPC,JWT,OAuth2,System Design,Microservices,CI/CD,AWS,Linux",
    bio: "I architect scalable backend systems and build APIs that power modern applications.",
    photoAnimation: true,
    statusWidget: true,
    heroPrimaryText: "View Projects →",
    heroPrimaryUrl: "#projects",
    heroOutlineText: "Contact Me",
    heroOutlineUrl: "#contact",
    ghRepo: "Oussama12520/Osama.dev.portfolio",
    ghBranch: "main",
    adminHotkey: "L",
    showAdminLink: true
  },
  nextId: 10
};

let state = DEFAULT_STATE;

async function initPortfolio() {
  // 1. Try to load remote state
  try {
    const res = await fetch('./state.json?t=' + Date.now());
    if (res.ok) {
      const remoteState = await res.json();
      state = { ...DEFAULT_STATE, ...remoteState };
      // Ensure settings from remote are preserved unless overridden by local
      console.log("Remote state loaded.");
    }
  } catch (e) {
    console.warn("Could not load remote state, using defaults.", e);
  }

  // 2. Merge local storage (highest priority for the admin)
  const local = localStorage.getItem('osama_portfolio');
  if (local) {
    state = { ...state, ...JSON.parse(local) };
  }

  // 3. EXPLICIT CLEANUP (Important: prevents Secret Scanning blocks)
  if (state.settings) {
    delete state.settings.ghToken;
    delete state.settings.ghp;
    save();
  }

  renderPortfolio();
  if (isAdmin) updateDashboard();
}

// Call init on load
initPortfolio();
let isAdmin = false;
let currentPanel = 'dashboard';
let currentFilter = 'All';
let startTime = Date.now();
let isTerminalOpen = false;

function save() { localStorage.setItem('osama_portfolio', JSON.stringify(state)) }

// ── RENDER PORTFOLIO ──
function renderPortfolio() {
  renderSkills();
  renderProjects();
  renderCerts();
  renderSocials();
  updateStats();

  const adminLink = document.getElementById('admin-login-link');
  const adminNavBtn = document.getElementById('nav-admin-btn');
  const show = state.settings.showAdminLink !== false;
  if (adminLink) adminLink.style.display = show ? 'inline' : 'none';
  if (adminNavBtn) adminNavBtn.style.display = show ? 'inline-flex' : 'none';

  const photo = document.querySelector('.hero-photo');
  if (photo) {
    photo.style.animation = state.settings.photoAnimation === false ? 'none' : 'photoBeat 6s ease-in-out infinite';
  }

  const widget = document.getElementById('status-widget');
  if (widget) {
    widget.style.display = (state.settings.statusWidget === false || isAdmin) ? 'none' : 'flex';
  }
}

function renderSkills() {
  const s = state.settings.skills.split(',').map(x => x.trim()).filter(Boolean);
  const el = document.getElementById('skills-list');
  if (el) el.innerHTML = s.map(sk => `<span class="skill-tag">${sk}</span>`).join('');
}

function setFilter(f) {
  currentFilter = f;
  const btns = document.querySelectorAll('.filter-btn');
  btns.forEach(b => b.classList.toggle('active', b.textContent === f || (f === 'API' && b.textContent === 'APIs')));
  renderProjects();
}

function renderProjects() {
  const g = document.getElementById('projects-grid');
  if (!g) return;
  const icons = ['🚀', '⚡', '🔧', '🗄️', '🔐', '☁️', '📡', '🛠'];
  
  let filtered = state.projects;
  if (currentFilter !== 'All') {
    filtered = state.projects.filter(p => {
      if (currentFilter === 'API') return p.cat === 'API';
      return p.techs.some(t => t.toLowerCase().includes(currentFilter.toLowerCase()));
    });
  }

  if (!filtered.length) {
    g.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">◈</div><h3>No ${currentFilter} projects found</h3><p>Try another filter or check the admin panel</p></div>`; return;
  }
  g.innerHTML = filtered.map((p, i) => `
<div class="project-card" onclick="openProjectDetail(${p.id})">
  <div class="project-img">
    ${(p.images && p.images.length) ? `<img src="${p.images[p.thumbnailIndex || 0]}" alt="${p.title}" onerror="this.parentNode.innerHTML='<div class=project-img-placeholder>${icons[i % icons.length]}</div>'">`
      : (p.img ? `<img src="${p.img}" alt="${p.title}" onerror="this.parentNode.innerHTML='<div class=project-img-placeholder>${icons[i % icons.length]}</div>'">` : `<div class="project-img-placeholder">${icons[i % icons.length]}</div>`)}
    <div class="project-overlay">
      ${p.images && p.images.length > 1 ? `<div class="badge" style="position:absolute;top:10px;right:10px;background:var(--accent);color:#000;font-size:10px">${p.images.length} Photos</div>` : ''}
      <div class="project-view-btn" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:8px 16px;background:var(--accent);color:#000;border-radius:20px;font-weight:600;font-size:12px;opacity:0;transition:opacity .3s">View Gallery</div>
    </div>
  </div>
  <div class="project-body">
    <div class="project-techs">${p.techs.map(t => `<span class="tech-tag">${t}</span>`).join('')}</div>
    <h3 class="project-title">${p.title}</h3>
    <p class="project-desc">${p.desc.substring(0, 100)}...</p>
    <div class="project-links">
      <span class="btn btn-ghost btn-sm">Explore Project →</span>
    </div>
  </div>
</div>`).join('');
}

function renderCerts() {
  const g = document.getElementById('certs-grid');
  if (!g) return;
  const emojis = ['🏆', '📜', '✅', '🎓', '⭐', '🔰'];
  if (!state.certs.length) {
    g.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">◇</div><h3>No certificates yet</h3><p>Add your first certificate from the admin panel</p></div>`; return;
  }
  g.innerHTML = state.certs.map((c, i) => `
<div class="cert-card" onclick="openCertModal(${i})">
  <div class="cert-img">
    ${c.img ? `<img src="${c.img}" alt="${c.title}" onerror="this.parentNode.innerHTML='<div class=cert-placeholder>${emojis[i % emojis.length]}</div>'">`
      : `<div class="cert-placeholder">${c.emoji || emojis[i % emojis.length]}</div>`}
  </div>
  <div class="cert-body">
    <div class="cert-title">${c.title}</div>
    <div class="cert-issuer">${c.issuer}</div>
    ${c.date ? `<div class="cert-date">${formatDate(c.date)}</div>` : ''}
  </div>
</div>`).join('');
}

function renderSocials() {
  const s = state.settings;
  const githubEl = document.getElementById('social-github');
  const linkedinEl = document.getElementById('social-linkedin');
  const emailEl = document.getElementById('social-email');
  const githubLink = document.getElementById('link-github');
  const linkedinLink = document.getElementById('link-linkedin');
  const emailLink = document.getElementById('link-email');
  const discordEl = document.getElementById('social-discord');
  const discordLink = document.getElementById('link-discord');
  const telegramEl = document.getElementById('social-telegram');
  const telegramLink = document.getElementById('link-telegram');
  const instagramEl = document.getElementById('social-instagram');
  const instagramLink = document.getElementById('link-instagram');

  if (githubEl) {
    let disp = s.github;
    if (disp.includes('github.com/')) disp = '@' + disp.split('github.com/')[1].split('/')[0];
    githubEl.textContent = disp;
    const url = s.github.startsWith('http') ? s.github : `https://github.com/${s.github.replace('@', '')}`;
    if (githubLink) githubLink.href = url;
    const h = document.getElementById('hero-github'); if (h) h.href = url;
    const f = document.getElementById('footer-github'); if (f) f.href = url;
  }
  if (linkedinEl) {
    let disp = s.linkedin;
    if (disp.includes('linkedin.com/in/')) {
      const parts = disp.split('linkedin.com/in/')[1].split('/');
      disp = '/in/' + parts[0].split('?')[0];
    }
    linkedinEl.textContent = disp;
    const url = s.linkedin.startsWith('http') ? s.linkedin : `https://linkedin.com${s.linkedin.startsWith('/') ? '' : '/'}${s.linkedin}`;
    if (linkedinLink) linkedinLink.href = url;
    const h = document.getElementById('hero-linkedin'); if (h) h.href = url;
    const f = document.getElementById('footer-linkedin'); if (f) f.href = url;
  }
  if (emailEl) {
    emailEl.textContent = s.email;
    const url = `mailto:${s.email}`;
    if (emailLink) emailLink.href = url;
    const f = document.getElementById('footer-email'); if (f) f.href = url;
  }
  if (discordEl) {
    let disp = s.discord;
    if (disp.includes('discord.gg/')) disp = 'Join Discord';
    discordEl.textContent = disp;
    const url = s.discord.startsWith('http') ? s.discord : `https://discord.com/users/${s.discord}`;
    if (discordLink) discordLink.href = url;
    const h = document.getElementById('hero-discord'); if (h) h.href = url;
    const f = document.getElementById('footer-discord'); if (f) f.href = url;
  }
  if (telegramEl) {
    let disp = s.telegram;
    if (disp.includes('t.me/')) disp = '@' + disp.split('t.me/')[1].split('?')[0];
    telegramEl.textContent = disp;
    const url = s.telegram.startsWith('http') ? s.telegram : `https://t.me/${s.telegram.replace('@', '')}`;
    if (telegramLink) telegramLink.href = url;
    const h = document.getElementById('hero-telegram'); if (h) h.href = url;
    const f = document.getElementById('footer-telegram'); if (f) f.href = url;
  }
  if (instagramEl) {
    let disp = s.instagram;
    if (disp.includes('instagram.com/')) disp = '@' + disp.split('instagram.com/')[1].split('/')[0].split('?')[0];
    instagramEl.textContent = disp;
    const url = s.instagram.startsWith('http') ? s.instagram : `https://instagram.com/${s.instagram.replace('@', '')}`;
    if (instagramLink) instagramLink.href = url;
    const h = document.getElementById('hero-instagram'); if (h) h.href = url;
    const f = document.getElementById('footer-instagram'); if (f) f.href = url;
  }
}

function updateStats() {
  const s = state.settings;
  const unread = state.messages.filter(m => !m.read).length;
  const sp = document.getElementById('stat-projects');
  const certsCount = document.getElementById('stat-certs');
  if (sp) sp.textContent = state.projects.length;
  if (certsCount) certsCount.textContent = state.certs.length;

  // Hero Buttons
  const hpBtn = document.querySelector('.hero-btns .btn-primary');
  const hoBtn = document.querySelector('.hero-btns .btn-outline');
  if (hpBtn) {
    hpBtn.textContent = s.heroPrimaryText || 'View Projects →';
    hpBtn.href = s.heroPrimaryUrl || '#projects';
  }
  if (hoBtn) {
    hoBtn.textContent = s.heroOutlineText || 'Contact Me';
    hoBtn.href = s.heroOutlineUrl || '#contact';
  }

  if (isAdmin) {
    const dp = document.getElementById('dash-projects');
    const dc = document.getElementById('dash-certs');
    const dm = document.getElementById('dash-msgs');
    if (dp) dp.textContent = state.projects.length;
    if (dc) dc.textContent = state.certs.length;
    if (dm) dm.textContent = state.messages.length;

    const ut = document.getElementById('dash-unread-trend');
    if (ut) {
      ut.textContent = unread ? `${unread} unread` : '— all read';
      ut.style.color = unread ? 'var(--amber)' : 'var(--green)';
    }
    const ub = document.getElementById('unread-badge');
    if (ub) {
      if (unread) { ub.style.display = 'inline'; ub.textContent = unread } else { ub.style.display = 'none' }
    }
  }
}

function formatDate(d) {
  if (!d) return '';
  const [y, m] = d.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[+m - 1]} ${y}`;
}

// ── CERT MODAL ──
function openCertModal(i) {
  const c = state.certs[i];
  const emojis = ['🏆', '📜', '✅', '🎓', '⭐', '🔰'];
  const mi = document.getElementById('cert-modal-img');
  const mp = document.getElementById('cert-modal-placeholder');
  if (c.img) { mi.src = c.img; mi.style.display = 'block'; mp.style.display = 'none' }
  else { mp.textContent = c.emoji || emojis[i % emojis.length]; mp.style.display = 'flex'; mi.style.display = 'none' }
  document.getElementById('cert-modal-title').textContent = c.title;
  document.getElementById('cert-modal-issuer').textContent = c.issuer;
  document.getElementById('cert-modal-date').textContent = c.date ? formatDate(c.date) : '';
  document.getElementById('cert-modal').style.display = 'flex';
}
function closeCertModal() { document.getElementById('cert-modal').style.display = 'none' }

// ── CONTACT FORM ──
function sendMessage(e) {
  e.preventDefault();
  
  // Anti-spam checks
  const honeypot = document.getElementById('msg-honeypot').value;
  if (honeypot) { console.log('Spam detected'); return; }

  const answer = parseInt(document.getElementById('captcha-answer').value);
  if (answer !== captchaValue) {
    toast('Incorrect security answer!', 'error');
    generateCaptcha();
    return;
  }

  const now = Date.now();
  if (now - lastSubmitTime < 30000) {
    toast('Please wait 30s before sending another message.', 'error');
    return;
  }

  const name = document.getElementById('msg-name').value.trim();
  const email = document.getElementById('msg-email').value.trim();
  const body = document.getElementById('msg-body').value.trim();

  if (!name || !email || !body) return;

  const msg = {
    id: Date.now(),
    name, email, body,
    date: new Date().toISOString(),
    read: false
  };

  state.messages.push(msg);
  save();
  lastSubmitTime = now;

  document.getElementById('msg-name').value = '';
  document.getElementById('msg-email').value = '';
  document.getElementById('msg-body').value = '';
  generateCaptcha();

  const success = document.getElementById('form-success');
  success.style.display = 'flex';
  setTimeout(() => success.style.display = 'none', 5000);
  toast('Message sent!', 'success');
}

// ── AUTH ──
function openLogin() { document.getElementById('login-screen').classList.add('visible'); document.getElementById('login-user').focus() }
function closeLogin() { document.getElementById('login-screen').classList.remove('visible') }
function doLogin() {
  const u = document.getElementById('login-user').value;
  const p = document.getElementById('login-pass').value;
  if (u === '101' && p === '15989') {
    isAdmin = true;
    closeLogin();
    document.body.classList.add('admin-active');
    loadAdminSettings();
    updateStats();
    renderAdminProjects();
    renderAdminCerts();
    renderAdminMessages();
    renderDashboardMsgs();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}
function logout() {
  isAdmin = false;
  document.body.classList.remove('admin-active');
  renderPortfolio();
}
function exitAdmin() {
  document.body.classList.remove('admin-active');
  isAdmin = false;
  renderPortfolio();
}
function closeLogin2() { document.getElementById('login-screen').classList.remove('visible') }

// ── ADMIN PANELS ──
function showPanel(p) {
  ['dashboard', 'projects', 'certs', 'messages', 'settings'].forEach(n => {
    const panel = document.getElementById('panel-' + n);
    const nav = document.getElementById('nav-' + n);
    if (panel) panel.style.display = n === p ? 'block' : 'none';
    if (nav) nav.classList.toggle('active', n === p);
  });
  currentPanel = p;
  if (p === 'messages') renderAdminMessages();
  if (p === 'projects') renderAdminProjects();
  if (p === 'certs') renderAdminCerts();
}

// ── ADMIN PROJECTS ──
function renderAdminProjects() {
  const tb = document.getElementById('projects-table');
  if (!tb) return;
  if (!state.projects.length) {
    tb.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:32px">No projects yet — add your first one!</td></tr>`; return;
  }
  tb.innerHTML = state.projects.map(p => `
<tr>
  <td><strong>${p.title}</strong><div style="font-size:11px;color:var(--text3);margin-top:2px">${p.cat}</div></td>
  <td><div style="display:flex;flex-wrap:wrap;gap:4px">${p.techs.slice(0, 4).map(t => `<span class="badge-tech badge">${t}</span>`).join('')}</div></td>
  <td style="font-size:12px;color:var(--text3)">${[p.demo ? 'Demo' : '', p.github ? 'GitHub' : ''].filter(Boolean).join(' · ') || '—'}</td>
  <td><div class="actions">
    <button class="btn btn-icon btn-sm" onclick="editProject(${p.id})">✏️</button>
    <button class="btn btn-danger btn-sm" onclick="deleteProject(${p.id})">🗑</button>
  </div></td>
</tr>`).join('');
}

function openProjectForm(id) {
  document.getElementById('project-form-title').textContent = id ? 'Edit Project' : 'Add Project';
  document.getElementById('project-edit-id').value = id || '';
  const grid = document.getElementById('pf-previews-grid');
  const fileInput = document.getElementById('pf-files');
  if (grid) grid.innerHTML = '';
  if (fileInput) fileInput.value = '';

  if (id) {
    const p = state.projects.find(x => x.id === id);
    document.getElementById('pf-title').value = p.title || '';
    document.getElementById('pf-desc').value = p.desc || '';
    document.getElementById('pf-techs').value = p.techs ? p.techs.join(', ') : '';
    document.getElementById('pf-demo').value = p.demo || '';
    document.getElementById('pf-github').value = p.github || '';
    document.getElementById('pf-cat').value = p.cat || 'API';
    document.getElementById('pf-img').value = ''; // We use multi-upload now
    
    if (p.images && p.images.length) {
      p.images.forEach((img, idx) => addPreviewToGrid(img, 'pf-previews-grid', idx === (p.thumbnailIndex || 0)));
    }
  } else {
    ['pf-title', 'pf-desc', 'pf-techs', 'pf-demo', 'pf-github', 'pf-img'].forEach(fid => {
      const el = document.getElementById(fid);
      if (el) el.value = '';
    });
    const cat = document.getElementById('pf-cat');
    if (cat) cat.value = 'API';
  }
  document.getElementById('project-form-overlay').style.display = 'flex';
}

function addPreviewToGrid(src, gridId, isCover = false) {
  const grid = document.getElementById(gridId);
  const div = document.createElement('div');
  div.className = 'preview-item' + (isCover ? ' is-cover' : '');
  div.style.position = 'relative';
  div.innerHTML = `
    <img src="${src}" style="width:100%; height:80px; object-fit:cover; border-radius:4px; border:2px solid ${isCover ? 'var(--accent)' : 'transparent'}" onclick="setProjectCover(this)" />
    <button onclick="this.parentElement.remove()" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:12px; cursor:pointer; z-index:2">✕</button>
    ${isCover ? '<div class="cover-badge" style="position:absolute; bottom:2px; left:2px; background:var(--accent); color:#000; font-size:9px; padding:1px 4px; border-radius:2px; font-weight:bold">COVER</div>' : ''}
  `;
  grid.appendChild(div);
}

function setProjectCover(imgEl) {
  const grid = imgEl.closest('.previews-grid');
  grid.querySelectorAll('.preview-item').forEach(item => {
    item.classList.remove('is-cover');
    item.querySelector('img').style.borderColor = 'transparent';
    const badge = item.querySelector('.cover-badge');
    if (badge) badge.remove();
  });
  
  const parent = imgEl.parentElement;
  parent.classList.add('is-cover');
  imgEl.style.borderColor = 'var(--accent)';
  const badge = document.createElement('div');
  badge.className = 'cover-badge';
  badge.style.cssText = 'position:absolute; bottom:2px; left:2px; background:var(--accent); color:#000; font-size:9px; padding:1px 4px; border-radius:2px; font-weight:bold';
  badge.textContent = 'COVER';
  parent.appendChild(badge);
}

function handleMultipleUpload(input, gridId) {
  if (input.files) {
    const grid = document.getElementById(gridId);
    const wasEmpty = grid.children.length === 0;
    Array.from(input.files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = e => addPreviewToGrid(e.target.result, gridId, wasEmpty && idx === 0);
      reader.readAsDataURL(file);
    });
  }
}

function saveProject() {
  const id = document.getElementById('project-edit-id').value;
  const title = document.getElementById('pf-title').value.trim();
  if (!title) { toast('Title is required', 'error'); return }

  const previewItems = Array.from(document.querySelectorAll('#pf-previews-grid .preview-item'));
  const images = previewItems.map(item => item.querySelector('img').src);
  const thumbnailIndex = previewItems.findIndex(item => item.classList.contains('is-cover'));

  const urlImg = document.getElementById('pf-img').value.trim();
  if (urlImg) images.push(urlImg);

  const p = {
    id: id ? +id : state.nextId++,
    title,
    desc: document.getElementById('pf-desc').value.trim(),
    techs: document.getElementById('pf-techs').value.split(',').map(x => x.trim()).filter(Boolean),
    demo: document.getElementById('pf-demo').value.trim(),
    github: document.getElementById('pf-github').value.trim(),
    images: images,
    thumbnailIndex: thumbnailIndex >= 0 ? thumbnailIndex : 0,
    cat: document.getElementById('pf-cat').value
  };
  if (id) { const i = state.projects.findIndex(x => x.id === +id); state.projects[i] = p }
  else { state.projects.push(p) }
  save(); renderPortfolio(); renderAdminProjects(); closeProjectForm();
  toast(id ? 'Project updated!' : 'Project added!', 'success');
}
function editProject(id) { openProjectForm(id) }
function closeProjectForm() { document.getElementById('project-form-overlay').style.display = 'none' }

function deleteProject(id) {
  if (!confirm('Delete this project?')) return;
  state.projects = state.projects.filter(x => x.id !== id);
  save(); renderAdminProjects(); renderProjects(); updateStats();
  toast('Project deleted', 'success');
}


// ── ADMIN CERTS ──
function renderAdminCerts() {
  const tb = document.getElementById('certs-table');
  if (!tb) return;
  if (!state.certs.length) {
    tb.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:32px">No certificates yet</td></tr>`; return;
  }
  tb.innerHTML = state.certs.map(c => `
<tr>
  <td><strong>${c.title}</strong></td>
  <td style="color:var(--purple)">${c.issuer}</td>
  <td style="font-family:var(--font-mono);font-size:12px;color:var(--text3)">${c.date ? formatDate(c.date) : '—'}</td>
  <td><div class="actions">
    <button class="btn btn-icon btn-sm" onclick="editCert(${c.id})">✏️</button>
    <button class="btn btn-danger btn-sm" onclick="deleteCert(${c.id})">🗑</button>
  </div></td>
</tr>`).join('');
}
function openCertForm(id) {
  document.getElementById('cert-form-title').textContent = id ? 'Edit Certificate' : 'Add Certificate';
  document.getElementById('cert-edit-id').value = id || '';
  const preview = document.getElementById('cf-preview');
  const fileInput = document.getElementById('cf-file');
  if (preview) preview.style.display = 'none';
  if (fileInput) fileInput.value = '';

  if (id) {
    const c = state.certs.find(x => x.id === id);
    document.getElementById('cf-title').value = c.title;
    document.getElementById('cf-issuer').value = c.issuer;
    document.getElementById('cf-date').value = c.date || '';
    document.getElementById('cf-img').value = (c.img && c.img.startsWith('data:')) ? '' : (c.img || '');
    if (c.img && c.img.startsWith('data:') && preview) {
      preview.style.display = 'block';
      preview.querySelector('img').src = c.img;
    }
  } else {
    ['cf-title', 'cf-issuer', 'cf-date', 'cf-img'].forEach(fid => {
      const el = document.getElementById(fid);
      if (el) el.value = '';
    });
  }
  document.getElementById('cert-form-overlay').style.display = 'flex';
}
function editCert(id) { openCertForm(id) }
function closeCertForm() { document.getElementById('cert-form-overlay').style.display = 'none' }
function saveCert() {
  const id = document.getElementById('cert-edit-id').value;
  const title = document.getElementById('cf-title').value.trim();
  if (!title) { toast('Title is required', 'error'); return }

  let img = document.getElementById('cf-img').value.trim();
  const preview = document.getElementById('cf-preview');
  if (preview && preview.style.display !== 'none') {
    img = preview.querySelector('img').src;
  }

  const c = {
    id: id ? +id : state.nextId++,
    title,
    issuer: document.getElementById('cf-issuer').value.trim(),
    date: document.getElementById('cf-date').value,
    img: img || '',
    emoji: '🏆'
  };
  if (id) { const i = state.certs.findIndex(x => x.id === +id); state.certs[i] = c }
  else { state.certs.push(c) }
  save(); closeCertForm(); renderAdminCerts(); renderCerts(); updateStats();
  toast(id ? 'Certificate updated!' : 'Certificate added!', 'success');
}
function deleteCert(id) {
  if (!confirm('Delete this certificate?')) return;
  state.certs = state.certs.filter(x => x.id !== id);
  save(); renderAdminCerts(); renderCerts(); updateStats();
  toast('Certificate deleted', 'success');
}

async function syncToGitHub() {
  const s = state.settings;
  const ghToken = localStorage.getItem('osama_portfolio_token');
  
  if (!ghToken || !s.ghRepo) {
    toast('GitHub Token or Repo missing in Settings!', 'error');
    showPanel('settings');
    return;
  }

  const btn = document.getElementById('btn-sync');
  const status = document.getElementById('sync-status');
  const originalText = btn.textContent;

  try {
    btn.disabled = true;
    btn.textContent = '🔄 Syncing...';
    status.style.display = 'block';
    status.style.color = 'var(--accent)';
    status.textContent = '> Fetching repository info...';

    const branch = s.ghBranch || 'main';
    const baseUrl = `https://api.github.com/repos/${s.ghRepo}/contents/state.json`;
    
    // 1. Get current file SHA (with cache buster to avoid 409)
    const getRes = await fetch(`${baseUrl}?ref=${branch}&t=${Date.now()}`, {
      headers: { 'Authorization': `token ${ghToken}` }
    });

    let sha = '';
    if (getRes.status === 200) {
      const data = await getRes.json();
      sha = data.sha;
    } else if (getRes.status !== 404) {
      const errData = await getRes.json().catch(() => ({}));
      throw new Error(`Fetch SHA failed: ${getRes.status} ${errData.message || getRes.statusText}`);
    }

    status.textContent = '> Preparing data package...';
    
    // 1.5 STRIP SECRETS (Fail-safe for Secret Scanning)
    // We create a deep copy and purge EVERY possible key that might hold a secret
    const stateToPush = JSON.parse(JSON.stringify(state));
    const purge = (obj) => {
      for (let key in obj) {
        if (key.toLowerCase().includes('token') || key.toLowerCase().includes('pass') || key.toLowerCase().includes('ghp')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          purge(obj[key]);
        }
      }
    };
    purge(stateToPush);

    // Robust UTF-8 to Base64
    const utf8Json = encodeURIComponent(JSON.stringify(stateToPush, null, 2)).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1));
    const base64Content = btoa(utf8Json);

    // 2. Push update (Clean URL, branch in body)
    const putRes = await fetch(baseUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${ghToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: '🚀 Portfolio Update via Admin Panel',
        content: base64Content,
        sha: sha || undefined,
        branch: branch
      })
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      throw new Error(`Push failed: ${putRes.status} ${errData.message || putRes.statusText}`);
    }

    status.style.color = 'var(--green)';
    status.textContent = '> ✅ SUCCESS: Deploying to production...';
    toast('Sync Successful! GitHub Actions triggered.', 'success');
    
    setTimeout(() => {
      status.style.display = 'none';
      btn.disabled = false;
      btn.textContent = originalText;
    }, 5000);

  } catch (err) {
    console.error(err);
    status.style.color = 'var(--red)';
    status.textContent = `> ❌ ERROR: ${err.message}`;
    btn.disabled = false;
    btn.textContent = 'Retry Sync';
    
    if (err.message.includes('401')) toast('Invalid GitHub Token! Check Settings.', 'error');
    else if (err.message.includes('404')) toast('Repository not found! Check Settings.', 'error');
    else toast('Sync failed: ' + err.message, 'error');
  }
}

// ── ADMIN MESSAGES ──
function renderAdminMessages() {
  const el = document.getElementById('messages-list');
  if (!el) return;
  if (!state.messages.length) {
    el.innerHTML = `<div class="admin-card"><div style="text-align:center;padding:60px;color:var(--text3)">No messages received yet</div></div>`; return;
  }
  el.innerHTML = state.messages.slice().reverse().map(m => `
<div class="admin-card" style="margin-bottom:16px">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
    <div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
        <strong style="font-size:15px">${m.name}</strong>
        <span class="badge ${m.read ? 'badge-read' : 'badge-unread'}">${m.read ? 'read' : 'unread'}</span>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-bottom:12px;font-family:var(--font-mono)">${m.email} · ${new Date(m.date).toLocaleDateString()}</div>
      <div style="color:var(--text2);font-size:14px;line-height:1.7;background:var(--bg3);padding:14px;border-radius:var(--r);border-left:2px solid var(--border2)">${m.body}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0">
      ${!m.read ? `<button class="btn btn-outline btn-sm" onclick="markRead(${m.id})">Mark read</button>` : ''}
      <button class="btn btn-danger btn-sm" onclick="deleteMsg(${m.id})">Delete</button>
    </div>
  </div>
</div>`).join('');
}

function renderDashboardMsgs() {
  const tb = document.getElementById('dash-recent-msgs');
  if (!tb) return;
  const recent = state.messages.slice(-5).reverse();
  if (!recent.length) { tb.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:32px">No messages yet</td></tr>`; return }
  tb.innerHTML = recent.map(m => `
<tr>
  <td><strong>${m.name}</strong></td>
  <td style="color:var(--text3);font-size:12px;font-family:var(--font-mono)">${m.email}</td>
  <td style="color:var(--text2);font-size:13px">${m.body.substring(0, 50)}${m.body.length > 50 ? '…' : ''}</td>
  <td><span class="badge ${m.read ? 'badge-read' : 'badge-unread'}">${m.read ? 'read' : 'unread'}</span></td>
</tr>`).join('');
}

function markRead(id) {
  const m = state.messages.find(x => x.id === id);
  if (m) m.read = true;
  save(); renderAdminMessages(); renderDashboardMsgs(); updateStats();
}
function deleteMsg(id) {
  if (!confirm('Delete this message?')) return;
  state.messages = state.messages.filter(x => x.id !== id);
  save(); renderAdminMessages(); renderDashboardMsgs(); updateStats();
  toast('Message deleted', 'success');
}

// ── SETTINGS ──
function loadAdminSettings() {
  const s = state.settings;
  const token = localStorage.getItem('osama_portfolio_token') || '';
  const setToken = document.getElementById('set-gh-token');
  if (setToken) setToken.value = token;
  
  const setRepo = document.getElementById('set-gh-repo');
  if (setRepo) setRepo.value = s.ghRepo || '';

  const github = document.getElementById('set-github');
  const linkedin = document.getElementById('set-linkedin');
  const email = document.getElementById('set-email');
  const skills = document.getElementById('set-skills');
  const bio = document.getElementById('set-bio');
  const photoAnim = document.getElementById('set-photo-anim');
  const statusWidget = document.getElementById('set-status-widget');
  const discord = document.getElementById('set-discord');
  const telegram = document.getElementById('set-telegram');
  const instagram = document.getElementById('set-instagram');

  if (github) github.value = s.github;
  if (linkedin) linkedin.value = s.linkedin;
  if (email) email.value = s.email;
  if (discord) discord.value = s.discord || '';
  if (telegram) telegram.value = s.telegram || '';
  if (instagram) instagram.value = s.instagram || '';
  if (skills) skills.value = s.skills;
  if (bio) bio.value = s.bio;
  if (photoAnim) photoAnim.checked = s.photoAnimation !== false;
  if (statusWidget) statusWidget.checked = s.statusWidget !== false;

  const hpText = document.getElementById('set-hero-primary-text');
  const hpUrl = document.getElementById('set-hero-primary-url');
  const hoText = document.getElementById('set-hero-outline-text');
  const hoUrl = document.getElementById('set-hero-outline-url');

  if (hoText) hoText.value = s.heroOutlineText || '';
  if (hoUrl) hoUrl.value = s.heroOutlineUrl || '';

  const ghToken = document.getElementById('set-gh-token');
  const ghRepo = document.getElementById('set-gh-repo');
  const ghBranch = document.getElementById('set-gh-branch');
  if (ghToken) ghToken.value = s.ghToken || '';
  if (ghRepo) ghRepo.value = s.ghRepo || '';
  if (ghBranch) ghBranch.value = s.ghBranch || '';

  const hotkey = document.getElementById('set-hotkey-val');
  if (hotkey) hotkey.textContent = s.adminHotkey || 'L';

  const showLink = document.getElementById('set-show-admin-link');
  if (showLink) showLink.checked = s.showAdminLink !== false;
}

function saveSettings() {
  const s = state.settings;
  const github = document.getElementById('set-github');
  const linkedin = document.getElementById('set-linkedin');
  const email = document.getElementById('set-email');
  const skills = document.getElementById('set-skills');
  const bio = document.getElementById('set-bio');
  const photoAnim = document.getElementById('set-photo-anim');
  const statusWidget = document.getElementById('set-status-widget');
  const discord = document.getElementById('set-discord');
  const telegram = document.getElementById('set-telegram');
  const instagram = document.getElementById('set-instagram');

  if (github) s.github = github.value;
  if (linkedin) s.linkedin = linkedin.value;
  if (email) s.email = email.value;
  if (discord) s.discord = discord.value;
  if (telegram) s.telegram = telegram.value;
  if (instagram) s.instagram = instagram.value;
  if (skills) s.skills = skills.value;
  if (bio) s.bio = bio.value;
  if (photoAnim) s.photoAnimation = photoAnim.checked;
  if (statusWidget) s.statusWidget = statusWidget.checked;

  const hpText = document.getElementById('set-hero-primary-text');
  const hpUrl = document.getElementById('set-hero-primary-url');
  const hoText = document.getElementById('set-hero-outline-text');
  const hoUrl = document.getElementById('set-hero-outline-url');

  if (hpText) s.heroPrimaryText = hpText.value;
  if (hpUrl) s.heroPrimaryUrl = hpUrl.value;
  if (hoText) s.heroOutlineText = hoText.value;
  if (hoUrl) s.heroOutlineUrl = hoUrl.value;

  const ghToken = document.getElementById('set-gh-token');
  const ghRepoInput = document.getElementById('set-gh-repo');
  const ghBranch = document.getElementById('set-gh-branch');
  
  if (ghToken) localStorage.setItem('osama_portfolio_token', ghToken.value);
  if (ghBranch) s.ghBranch = ghBranch.value;

  // Cleanup: ensure token never stays in main state
  delete s.ghToken; 

  if (ghRepoInput) {
    let val = ghRepoInput.value.trim();
    if (val.includes('github.com/')) {
      val = val.split('github.com/')[1].split('?')[0].split('#')[0];
      if (val.endsWith('.git')) val = val.slice(0, -4);
    }
    s.ghRepo = val;
  }

  const hotkey = document.getElementById('set-hotkey-val');
  if (hotkey) s.adminHotkey = hotkey.textContent;

  const showLink = document.getElementById('set-show-admin-link');
  if (showLink) s.showAdminLink = showLink.checked;

  save(); renderPortfolio();
  toast('Settings saved!', 'success');
}

function captureHotkey() {
  const btn = document.getElementById('btn-capture-hotkey');
  const display = document.getElementById('set-hotkey-val');
  btn.textContent = '... Press any key ...';
  
  const handler = (e) => {
    e.preventDefault();
    const key = e.key.toUpperCase();
    display.textContent = key;
    btn.textContent = 'Change Hotkey';
    window.removeEventListener('keydown', handler);
  };
  window.addEventListener('keydown', handler);
}

window.addEventListener('keydown', (e) => {
  const s = state.settings;
  const targetKey = (s.adminHotkey || 'L').toUpperCase();
  if (e.altKey && e.key.toUpperCase() === targetKey) {
    e.preventDefault();
    document.getElementById('login-screen').classList.add('visible');
    document.getElementById('login-user').focus();
  }
});

// ── TOAST ──
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.className = 'toast ' + type; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── IMAGE UPLOAD ──
function handleImageUpload(input, previewId) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const preview = document.getElementById(previewId);
      if (preview) {
        preview.style.display = 'block';
        preview.querySelector('img').src = e.target.result;
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// ── PROJECT DETAIL ──
function openProjectDetail(id) {
  const p = state.projects.find(x => x.id === id);
  if (!p) return;

  document.getElementById('pd-title').textContent = p.title;
  document.getElementById('pd-desc').textContent = p.desc;
  document.getElementById('pd-cat').textContent = p.cat;
  document.getElementById('pd-techs').innerHTML = p.techs.map(t => `<span class="tech-tag">${t}</span>`).join('');
  
  const demo = document.getElementById('pd-demo');
  const github = document.getElementById('pd-github');
  if (p.demo) { demo.style.display = 'inline-flex'; demo.href = p.demo; } else { demo.style.display = 'none'; }
  if (p.github) { github.style.display = 'inline-flex'; github.href = p.github; } else { github.style.display = 'none'; }

  const gallery = document.getElementById('pd-gallery');
  if (p.images && p.images.length) {
    gallery.innerHTML = p.images.map(img => `<img src="${img}" alt="Gallery Image" />`).join('');
    gallery.style.display = 'grid';
  } else {
    gallery.innerHTML = `<div style="padding:100px; text-align:center; color:var(--text3); background:var(--bg3); border-radius:var(--r2)">No screenshots available for this project.</div>`;
  }

  document.getElementById('project-detail-modal').style.display = 'flex';
}

function closeProjectDetail() {
  document.getElementById('project-detail-modal').style.display = 'none';
}
function updateUptime() {
  const diff = Math.floor((Date.now() - startTime) / 1000);
  const h = String(Math.floor(diff / 3600)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
  const s = String(diff % 60).padStart(2, '0');
  const el = document.getElementById('uptime-val');
  if (el) el.textContent = `${h}:${m}:${s}`;
  
  if (diff % 15 === 0) {
    const activities = ['Cache Cleaned', 'API Heartbeat OK', 'Node 02 Balanced', 'Log Rotation Active'];
    const actEl = document.getElementById('last-activity');
    if (actEl) actEl.textContent = activities[Math.floor(Math.random() * activities.length)];
  }
}

// ── TERMINAL ──
function toggleTerminal() {
  const t = document.getElementById('terminal-container');
  isTerminalOpen = !isTerminalOpen;
  t.style.display = isTerminalOpen ? 'flex' : 'none';
  if (isTerminalOpen) document.getElementById('terminal-input').focus();
}

function handleCommand(cmd) {
  const out = document.getElementById('terminal-output');
  const val = cmd.toLowerCase().trim();
  let response = '';

  const addLine = (txt, cls = '') => {
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = txt;
    out.appendChild(d);
    out.parentNode.scrollTop = out.parentNode.scrollHeight;
  };

  addLine(`$ ${cmd}`, 'terminal-prompt');

  switch(val) {
    case 'help':
      response = 'Available commands: help, ls, whoami, contact, clear, exit';
      break;
    case 'ls':
      response = 'Sections: about, projects, certifications, contact';
      break;
    case 'whoami':
      response = state.settings.bio;
      break;
    case 'contact':
      response = `Email: ${state.settings.email}<br>GitHub: ${state.settings.github}`;
      break;
    case 'clear':
      out.innerHTML = '';
      return;
    case 'exit':
      toggleTerminal();
      return;
    default:
      response = `Command not found: ${val}. Type 'help' for assistance.`;
  }
  addLine(response);
}

// ── INIT ──
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

const loginPass = document.getElementById('login-pass');
if (loginPass) {
  loginPass.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin() });
}

const termInput = document.getElementById('terminal-input');
if (termInput) {
  termInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      handleCommand(termInput.value);
      termInput.value = '';
    }
  });
}

// renderPortfolio(); // Removed, handled by initPortfolio()
setInterval(updateUptime, 1000);

// Animate stat numbers
function animateNum(el, target) {
  if (!el) return;
  let cur = 0; const dur = 1200; const step = dur / 60; const inc = target / 60;
  const t = setInterval(() => { cur = Math.min(cur + inc, target); el.textContent = Math.round(cur); if (cur >= target) clearInterval(t) }, step);
}

document.addEventListener('DOMContentLoaded', () => {
  // if (isAdmin) updateDashboard(); // Removed, handled by initPortfolio()
  generateCaptcha();
});

function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  captchaValue = a + b;
  const qEl = document.getElementById('captcha-question');
  if (qEl) qEl.textContent = `${a} + ${b} = ?`;
  const aEl = document.getElementById('captcha-answer');
  if (aEl) aEl.value = '';
}

setTimeout(() => {
  animateNum(document.getElementById('stat-projects'), state.projects.length);
  animateNum(document.getElementById('stat-certs'), state.certs.length);
}, 600);
