/**
 * EL TÍO BAZA BLOG — Cliente Frontend Dinámico
 * Conexión e integración con API REST (Express + Node.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Inicialización de la UI base
  initThemeToggle();
  initKebabMenu();

  // Detectar la página actual y cargar sus datos dinámicos
  const currentPath = window.location.pathname;

  if (currentPath.endsWith('index.html') || currentPath === '/' || currentPath === '') {
    loadHomeData();
  } else if (currentPath.endsWith('noticias.html')) {
    loadNoticiasPage();
  } else if (currentPath.endsWith('posts.html')) {
    loadPostsPage();
  } else if (currentPath.endsWith('videos.html')) {
    loadVideosPage();
  }
});

/* ==========================================================================
   UTILIDADES: FORMATEADOR DE FECHA Y TIEMPO RELATIVO ("HACE X TIEMPO")
   ========================================================================== */

/**
 * Convierte un timestamp ISO o cadena de fecha a un formato relativo ("Hace 5 min", "Hace 2 horas")
 * @param {string|Date} dateInput 
 * @returns {string} Texto formateado
 */
function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Reciente';

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    // Si ya viene como texto estilizado (ej: "Ayer" o "Reciente"), se conserva
    return dateInput;
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  // Si la fecha está en el futuro o la diferencia es insignificante
  if (diffInSeconds < 30) {
    return 'Hace un momento';
  }

  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) {
    return `Hace ${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  // Para fechas mayores a un año, devolver formato fecha local DD/MM/YYYY
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ==========================================================================
   1. CONTROLADORES Y FUNCIONES DE VISTA (HOME, POSTS, NOTICIAS, VIDEOS)
   ========================================================================== */

// 🏠 INDEX / PORTADA (Hero Destacado + Noticias, Posts Destacados y Videos Destacados)
async function loadHomeData() {
  try {
    const response = await fetch('/api/destacado');
    if (!response.ok) throw new Error('No se pudo obtener el contenido destacado');
    
    const data = await response.json();

    // 1. Renderizar Post Hero Destacado
    if (data.heroPost) {
      const hero = data.heroPost;
      const heroTitle = document.getElementById('heroPostTitle');
      const heroDesc = document.getElementById('heroPostExcerpt');
      const heroCategory = document.getElementById('heroPostCategory');
      const heroLink = document.getElementById('heroPostLink');
      const heroImg = document.getElementById('heroPostBanner');

      const pId = hero.id || hero._id || '1';
      const pTitle = hero.titulo || hero.title || 'Artículo Destacado';
      const pDesc = hero.subtitulo || hero.subtitle || hero.resumen || hero.summary || '';
      const pCat = hero.categoria || hero.category || 'General';
      const pCover = hero.coverUrl || hero.image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80';

      if (heroTitle) heroTitle.textContent = pTitle;
      if (heroDesc) heroDesc.textContent = pDesc;
      if (heroCategory) heroCategory.textContent = pCat;
      if (heroLink) heroLink.href = `post.html?id=${pId}`;
      if (heroImg) heroImg.src = pCover;
    }

    // 2. Renderizar Noticias Rápidas en la portada
    const noticiasContainer = document.getElementById('homeNoticiasContainer');
    if (noticiasContainer && data.noticias && data.noticias.length > 0) {
      noticiasContainer.innerHTML = data.noticias.map(noticia => {
        const cat = noticia.categoria || noticia.category || 'AVISO';
        let badgeColorClass = noticia.badgeColor || 'green';
        
        if (cat.toLowerCase().includes('mantenimiento') || cat.toLowerCase().includes('aviso')) badgeColorClass = 'warning';
        if (cat.toLowerCase().includes('actualización') || cat.toLowerCase().includes('info')) badgeColorClass = 'info';

        const rawDate = noticia.createdAt || noticia.timestamp || noticia.fecha;
        const formattedDate = formatRelativeTime(rawDate);

        return `
          <article class="news-card" style="padding: 12px 0; border-bottom: 1px solid var(--border-color);">
            <div class="news-meta" style="margin-bottom: 5px; display: flex; align-items: center; justify-content: space-between;">
              <span class="badge ${badgeColorClass}">${cat.toUpperCase()}</span>
              <span class="date" style="font-size:0.8rem; color:var(--text-secondary);"><i data-lucide="clock" style="width:12px; height:12px; vertical-align:middle;"></i> ${formattedDate}</span>
            </div>
            <h4 class="news-title" style="margin:0; font-size:1.05rem; color:var(--text-primary);">${noticia.titulo || noticia.title}</h4>
            <p class="news-excerpt" style="margin:4px 0 0 0; font-size:0.9rem; color:var(--text-secondary);">${noticia.subtitulo || noticia.subtitle || ''}</p>
          </article>
        `;
      }).join('');
    } else if (noticiasContainer) {
      noticiasContainer.innerHTML = '<p style="color: var(--text-secondary);">No hay noticias recientes.</p>';
    }

    // 3. Renderizar Posts Destacados en la portada (Grid)
    const postsContainer = document.getElementById('homePostsContainer');
    if (postsContainer && data.postsDestacados && data.postsDestacados.length > 0) {
      postsContainer.innerHTML = data.postsDestacados.map(post => {
        const postId = post.id || post._id;
        const title = post.titulo || post.title || 'Sin título';
        const subtitle = post.subtitulo || post.subtitle || post.resumen || post.summary || '';
        const category = post.categoria || post.category || 'General';
        const cover = post.coverUrl || post.image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80';
        const rawDate = post.createdAt || post.timestamp || post.fecha;
        const dateText = formatRelativeTime(rawDate);

        return `
          <article class="post-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
            <div class="card-banner" style="position:relative; height:160px; overflow:hidden; background:var(--bg-surface);">
              <img src="${cover}" alt="${title}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">
              <span class="badge-tag" style="position:absolute; top:10px; left:10px; background:var(--primary-green); color:#fff; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">${category}</span>
            </div>
            <div class="card-content" style="padding: 1.2rem; display:flex; flex-direction:column; flex:1;">
              <div class="card-meta" style="display:flex; gap:12px; font-size:0.8rem; color:var(--text-secondary); margin-bottom:8px;">
                <span><i data-lucide="clock" style="width:14px; height:14px; vertical-align:middle;"></i> ${dateText}</span>
              </div>
              <h3 class="card-title" style="font-size:1.1rem; margin-bottom:0.5rem; color:var(--text-primary);">${title}</h3>
              <p class="card-excerpt" style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:1rem; flex:1;">${subtitle.substring(0, 90)}...</p>
              <a href="post.html?id=${postId}" class="btn-read-more" style="color:var(--primary-green); text-decoration:none; font-weight:700; font-size:0.9rem; display:inline-flex; align-items:center; gap:5px;">
                Leer Artículo <i data-lucide="arrow-right" style="width:16px; height:16px;"></i>
              </a>
            </div>
          </article>
        `;
      }).join('');
    } else if (postsContainer) {
      postsContainer.innerHTML = '<p style="color: var(--text-secondary);">No hay artículos destacados.</p>';
    }

    // 4. Renderizar Videos Destacados en la portada (Grid con Modal)
    const videosContainer = document.getElementById('homeVideosContainer');
    if (videosContainer && data.videosDestacados && data.videosDestacados.length > 0) {
      videosContainer.innerHTML = data.videosDestacados.map(v => {
        const rawUrl = v.youtubeId || v.videoId || v.url || v.enlace || '';
        let vId = 'dQw4w9WgXcQ';
        
        if (rawUrl.includes('youtube.com/embed/')) {
          vId = rawUrl.split('/embed/')[1].split('?')[0];
        } else if (rawUrl.includes('watch?v=')) {
          vId = rawUrl.split('watch?v=')[1].split('&')[0];
        } else if (rawUrl.length === 11) {
          vId = rawUrl;
        }

        const title = v.titulo || v.title || 'Video sin título';
        const desc = v.descripcion || v.description || '';
        const badgeText = v.badgeText || 'VIDEO';
        const duration = v.duration || '10:00';
        const thumb = v.thumbnail || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`;

        return `
          <div class="card" onclick="openVideoModal('${vId}')" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; cursor: pointer;">
            <div class="card-media" style="position:relative; height:160px; background:#000; overflow:hidden;">
              <img src="${thumb}" alt="${title}" style="width:100%; height:100%; object-fit:cover;">
              <span class="badge-green" style="position:absolute; top:10px; left:10px; background:var(--primary-green); color:#fff; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">${badgeText}</span>
              <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.3);">
                <div style="width:48px; height:48px; background:var(--primary-green); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff;">
                  <i data-lucide="play" style="width:20px; height:20px; fill:#fff;"></i>
                </div>
              </div>
            </div>
            <div class="card-body" style="padding: 1.2rem;">
              <span class="card-date" style="font-size:0.8rem; color:var(--text-secondary); display:block; margin-bottom:5px;"><i data-lucide="clock" style="width:12px; height:12px; vertical-align:middle;"></i> ${duration}</span>
              <h3 class="card-title" style="font-size:1.1rem; margin-bottom:0.5rem; color:var(--text-primary);">${title}</h3>
              <p class="card-text" style="color:var(--text-secondary); font-size:0.9rem; margin:0;">${desc}</p>
            </div>
          </div>
        `;
      }).join('');
    } else if (videosContainer) {
      videosContainer.innerHTML = '<p style="color: var(--text-secondary);">No hay videos destacados.</p>';
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

  } catch (error) {
    console.warn('Fallback o error al conectar con /api/destacado:', error);
  }
}

// 📝 PÁGINA DE POSTS / GUÍAS COMPLETAS
async function loadPostsPage() {
  const container = document.getElementById('postsGridContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/posts');
    const posts = await res.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      container.innerHTML = '<p class="empty-msg" style="padding: 20px; text-align:center; color:var(--text-secondary);">No hay publicaciones disponibles en este momento.</p>';
      return;
    }

    container.innerHTML = posts.map(post => {
      const postId = post.id || post._id;
      const title = post.titulo || post.title || 'Sin título';
      const subtitle = post.subtitulo || post.subtitle || post.resumen || post.summary || '';
      const category = post.categoria || post.category || 'General';
      const cover = post.coverUrl || post.image || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80';
      
      const rawDate = post.createdAt || post.timestamp || post.fecha;
      const dateText = formatRelativeTime(rawDate);

      return `
        <article class="post-card">
          <div class="card-banner" style="position:relative; height:180px; overflow:hidden; border-radius:8px 8px 0 0; background:var(--bg-card);">
            <img src="${cover}" alt="${title}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">
            <span class="badge-tag" style="position:absolute; top:10px; left:10px; background:var(--primary-green); color:#fff; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">${category}</span>
          </div>
          <div class="card-content" style="padding: 1.2rem; display:flex; flex-direction:column; flex:1;">
            <div class="card-meta" style="display:flex; gap:12px; font-size:0.8rem; color:var(--text-secondary); margin-bottom:8px;">
              <span><i data-lucide="calendar" style="width:14px; height:14px; vertical-align:middle;"></i> ${dateText}</span>
            </div>
            <h2 class="card-title" style="font-size:1.15rem; margin-bottom:0.5rem; color:var(--text-primary);">${title}</h2>
            <p class="card-excerpt" style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:1rem; flex:1;">${subtitle}</p>
            <a href="post.html?id=${postId}" class="btn-read-more" style="color:var(--primary-green); text-decoration:none; font-weight:700; font-size:0.9rem; display:inline-flex; align-items:center; gap:5px;">
              Leer Artículo <i data-lucide="arrow-right" style="width:16px; height:16px;"></i>
            </a>
          </div>
        </article>
      `;
    }).join('');

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

  } catch (err) {
    console.error('Error cargando posts:', err);
    container.innerHTML = '<p class="error-msg" style="padding: 20px; color:#ef4444; text-align:center;">Error al conectar con la API de posts.</p>';
  }
}

// 📰 PÁGINA DE NOTICIAS (Soporta filtro por categoría y Lucide Icons)
async function loadNoticiasPage(categoryFilter = 'all') {
  const container = document.getElementById('noticiasGridContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/noticias');
    let noticias = await res.json();

    if (!Array.isArray(noticias) || noticias.length === 0) {
      container.innerHTML = '<p class="empty-msg" style="text-align:center; padding:20px; color:var(--text-secondary);">No hay noticias registradas.</p>';
      return;
    }

    if (categoryFilter !== 'all') {
      noticias = noticias.filter(n => (n.categoria || n.category || '').toLowerCase() === categoryFilter.toLowerCase());
    }

    if (noticias.length === 0) {
      container.innerHTML = '<p class="empty-msg" style="text-align:center; padding:20px; color:var(--text-secondary);">No hay noticias encontradas en esta categoría.</p>';
      return;
    }

    container.innerHTML = noticias.map(item => {
      const cat = item.categoria || item.category || 'AVISO';
      let badgeClass = 'news-badge';

      if (cat.toLowerCase().includes('mantenimiento') || cat.toLowerCase().includes('aviso')) {
        badgeClass += ' warning';
      } else if (cat.toLowerCase().includes('actualización') || cat.toLowerCase().includes('info')) {
        badgeClass += ' info';
      } else {
        badgeClass += ' green';
      }

      const rawDate = item.createdAt || item.timestamp || item.fecha;
      const formattedDate = formatRelativeTime(rawDate);

      return `
        <article class="news-item">
          <span class="${badgeClass}">${cat.toUpperCase()}</span>
          <div class="news-content">
            <h4>${item.titulo || item.title}</h4>
            <p>${item.subtitulo || item.subtitle || item.contenido || ''}</p>
            <span class="news-date"><i data-lucide="clock" style="width:14px; height:14px; vertical-align:middle;"></i> ${formattedDate}</span>
          </div>
        </article>
      `;
    }).join('');

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

  } catch (err) {
    console.error('Error cargando noticias:', err);
    container.innerHTML = '<p class="error-msg" style="text-align:center; padding:20px; color:#ef4444;">Error al cargar las noticias desde el servidor.</p>';
  }
}

// 🎬 PÁGINA DE VIDEOS (Soporta vistas dinámicas: Cuadrícula, Compacto e Inmersivo + Modal de Reproducción)
async function loadVideosPage() {
  const container = document.getElementById('videosGridContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/videos');
    const videos = await res.json();

    if (!Array.isArray(videos) || videos.length === 0) {
      container.innerHTML = '<p class="empty-msg" style="text-align:center; color:var(--text-secondary); padding:30px;">No hay videos publicados en este momento.</p>';
      return;
    }

    window.allLoadedVideos = videos;
    renderVideosByLayout(videos, getCurrentLayoutMode());
    setupViewModeToggles();

  } catch (err) {
    console.error('Error cargando videos:', err);
    container.innerHTML = '<p class="error-msg" style="text-align:center; color:#ef4444; padding:30px;">Error al conectar con la API de videos.</p>';
  }
}

function getCurrentLayoutMode() {
  const activeBtn = document.querySelector('.view-mode-btn.active');
  return activeBtn ? activeBtn.getAttribute('data-view') : 'grid';
}

function setupViewModeToggles() {
  const viewButtons = document.querySelectorAll('.view-mode-btn');
  const container = document.getElementById('videosGridContainer');

  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      viewButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.getAttribute('data-view');
      container.className = '';
      
      if (mode === 'grid') {
        container.classList.add('videos-layout-grid');
      } else if (mode === 'compact') {
        container.classList.add('videos-layout-compact');
      } else if (mode === 'immersive') {
        container.classList.add('videos-layout-immersive');
      }

      if (window.allLoadedVideos) {
        renderVideosByLayout(window.allLoadedVideos, mode);
      }
    });
  });
}

function renderVideosByLayout(videos, mode) {
  const container = document.getElementById('videosGridContainer');
  if (!container) return;

  container.innerHTML = videos.map((v) => {
    const vId = v.youtubeId || v.videoId || 'dQw4w9WgXcQ';
    const title = v.titulo || v.title || 'Video sin título';
    const desc = v.descripcion || v.description || '';
    const badgeText = v.badgeText || 'VIDEO';
    const duration = v.duration || '10:00';
    const thumb = v.thumbnail || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`;
    const channelName = v.channelName || 'El Tio Baza';
    const avatar = v.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';

    if (mode === 'compact') {
      return `
        <div class="video-yt-card" onclick="openVideoModal('${vId}')">
          <div class="video-yt-thumb-wrapper">
            <img src="${thumb}" alt="${title}" loading="lazy">
            <span class="video-yt-duration">${duration}</span>
          </div>
          <div class="video-yt-details">
            <span class="news-badge" style="display:inline-block; width:fit-content; margin-bottom:2px;">${badgeText}</span>
            <h3 class="video-yt-title">${title}</h3>
            <div class="video-yt-channel-info">
              <img src="${avatar}" alt="${channelName}" class="video-yt-avatar">
              <span class="video-yt-channel-name">${channelName}</span>
            </div>
            <p class="video-yt-desc">${desc}</p>
          </div>
        </div>
      `;
    } else if (mode === 'immersive') {
      return `
        <div class="video-immersive-card" onclick="openVideoModal('${vId}')" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:16px; overflow:hidden; margin-bottom:2rem; cursor:pointer; transition:border-color 0.2s;">
          <div style="position:relative; width:100%; height:340px; background:#000;">
            <img src="${thumb}" alt="${title}" style="width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;">
              <div style="width:64px; height:64px; background:var(--primary-green); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 0 20px rgba(16,124,16,0.6);">
                <i data-lucide="play" style="width:28px; height:28px; fill:#fff;"></i>
              </div>
            </div>
            <span style="position:absolute; top:12px; left:12px; background:var(--primary-green); color:#fff; font-size:0.75rem; font-weight:700; padding:4px 10px; border-radius:6px;">${badgeText}</span>
          </div>
          <div style="padding:1.5rem;">
            <h2 style="font-size:1.4rem; font-weight:700; margin-bottom:0.5rem; color:var(--text-primary);">${title}</h2>
            <p style="color:var(--text-secondary); font-size:0.95rem; margin-bottom:1rem;">${desc}</p>
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${avatar}" alt="${channelName}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
              <span style="font-weight:600; color:var(--text-primary);">${channelName}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      // Grid Moderno por defecto
      return `
        <div class="card" onclick="openVideoModal('${vId}')">
          <div class="card-media">
            <img src="${thumb}" alt="${title}" style="width:100%; height:100%; object-fit:cover;">
            <span class="badge-green">${badgeText}</span>
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.3);">
              <div style="width:48px; height:48px; background:var(--primary-green); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff;">
                <i data-lucide="play" style="width:20px; height:20px; fill:#fff;"></i>
              </div>
            </div>
          </div>
          <div class="card-body">
            <span class="card-date"><i data-lucide="clock" style="width:12px; height:12px; vertical-align:middle;"></i> ${duration}</span>
            <h3 class="card-title">${title}</h3>
            <p class="card-text">${desc}</p>
          </div>
        </div>
      `;
    }
  }).join('');

  ensureVideoLayoutStyles();

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

function ensureVideoLayoutStyles() {
  if (document.getElementById('dynamicVideoLayoutStyles')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'dynamicVideoLayoutStyles';
  styleEl.textContent = `
    .videos-layout-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    .videos-layout-compact {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 860px;
      margin: 0 auto;
    }
    .videos-layout-immersive {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 900px;
      margin: 0 auto;
    }
    .view-mode-selector {
      display: flex;
      gap: 6px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      padding: 4px;
      border-radius: 12px;
    }
    .view-mode-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      padding: 6px 12px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }
    .view-mode-btn svg {
      width: 16px;
      height: 16px;
    }
    .view-mode-btn.active, .view-mode-btn:hover {
      background: var(--primary-green);
      color: #ffffff;
    }
  `;
  document.head.appendChild(styleEl);
}

// 🎦 MODAL DE REPRODUCCIÓN DE VIDEOS
function openVideoModal(youtubeId) {
  const modal = document.getElementById('videoModal');
  const iframe = document.getElementById('youtubeIframe');
  const backdrop = document.getElementById('modalBackdrop');
  const closeBtn = document.getElementById('modalCloseBtn');

  if (!modal || !iframe) return;

  iframe.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  const closeModal = () => {
    iframe.src = '';
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  };

  if (backdrop) backdrop.onclick = closeModal;
  if (closeBtn) closeBtn.onclick = closeModal;

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/* ==========================================================================
   2. COMPONENTES GLOBALES (TEMA Y MENÚ KEBAB)
   ========================================================================== */

function initThemeToggle() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) return;

  const currentTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);

  themeToggleBtn.addEventListener('click', () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

function initKebabMenu() {
  const kebabBtn = document.getElementById('kebabBtn');
  const kebabDropdown = document.getElementById('kebabDropdown');

  if (!kebabBtn || !kebabDropdown) return;

  kebabBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    kebabDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    if (!kebabDropdown.classList.contains('hidden')) {
      kebabDropdown.classList.add('hidden');
    }
  });
}

