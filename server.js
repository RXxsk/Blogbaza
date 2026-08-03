require('dotenv').config(); // Carga de variables de entorno para desarrollo local
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Octokit } = require('@octokit/rest'); // SDK de GitHub

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Octokit para comunicarse con la API de GitHub
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;

// Variables de seguridad obtenidas desde Render / .env
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_super_segura_tio_baza_2026';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'baza2026';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// CATÁLOGO OFICIAL DE AUTORES Y AVATARES
// ==========================================
const AUTHORS_AND_AVATARS = {
  authors: [
    { id: 'tio_baza', name: 'El Tio Baza', defaultAvatar: 'Avatar Baza' },
    { id: 'rxx8', name: 'RXx8', defaultAvatar: 'Avatar RXx8' },
    { id: 'mannuee', name: 'Mannuee', defaultAvatar: 'Avatar Mannuee' }
  ],
  avatars: [
    { 
      id: 'baza', 
      name: 'Avatar Baza', 
      url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSR5QBZS-JdOQ6BiXC_usrCPWQ04zwUEPCHS0oxcqKHcg&s=10' 
    },
    { 
      id: 'rxx8', 
      name: 'Avatar RXx8', 
      url: 'https://avatars.githubusercontent.com/u/60585034?v=4' 
    },
    { 
      id: 'mannuee', 
      name: 'Avatar Mannuee', 
      url: 'https://yt3.googleusercontent.com/7LBoB1HAKUQRANtVR5btTczpra-1vNCbgeHnfl4b6PUviP4LWqxD9Ez6kLyL1GvoRSk0vB1Vdg=s160-c-k-c0x00ffffff-no-rj' 
    }
  ]
};

const AVATAR_URL_MAP = {
  'Avatar Baza': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSR5QBZS-JdOQ6BiXC_usrCPWQ04zwUEPCHS0oxcqKHcg&s=10',
  'Avatar RXx8': 'https://avatars.githubusercontent.com/u/60585034?v=4',
  'Avatar Roxi': 'https://avatars.githubusercontent.com/u/60585034?v=4',
  'Avatar Mannuee': 'https://yt3.googleusercontent.com/7LBoB1HAKUQRANtVR5btTczpra-1vNCbgeHnfl4b6PUviP4LWqxD9Ez6kLyL1GvoRSk0vB1Vdg=s160-c-k-c0x00ffffff-no-rj'
};

const AUTHOR_DEFAULT_AVATAR = {
  'El Tio Baza': 'Avatar Baza',
  'El Tío Baza': 'Avatar Baza',
  'Baza': 'Avatar Baza',
  'RXx8': 'Avatar RXx8',
  'Mannuee': 'Avatar Mannuee'
};

const processAuthorAndAvatar = (payload) => {
  const author = payload.author || payload.autor || 'El Tio Baza';
  let avatar = payload.authorAvatar || payload.avatar || AUTHOR_DEFAULT_AVATAR[author] || 'Avatar Baza';

  if (avatar === 'roxi' || avatar === 'rxx8') avatar = 'Avatar RXx8';
  if (avatar === 'baza' || avatar === 'tio_baza') avatar = 'Avatar Baza';
  if (avatar === 'mannuee') avatar = 'Avatar Mannuee';

  const avatarUrl = AVATAR_URL_MAP[avatar] || payload.avatarUrl || AVATAR_URL_MAP['Avatar Baza'];

  return {
    ...payload,
    author: author,
    autor: author,
    authorAvatar: avatarUrl,
    avatar: avatarUrl,
    avatarUrl: avatarUrl
  };
};

// ==========================================
// HELPERS ASÍNCRONOS CON LA API DE GITHUB
// ==========================================

// Leer archivo desde el repositorio de GitHub
const readJsonFile = async (filename) => {
  try {
    const response = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: `data/${filename}`,
    });

    // Decodificar el contenido recibido en Base64 desde GitHub
    const rawData = Buffer.from(response.data.content, 'base64').toString('utf-8');
    return JSON.parse(rawData);
  } catch (err) {
    console.error(`Error leyendo data/${filename} desde GitHub:`, err.message);
    return [];
  }
};

// Escribir y hacer Commit directo en el repositorio de GitHub
const writeJsonFile = async (filename, data, commitMessage = "Actualización desde panel admin") => {
  try {
    const filePath = `data/${filename}`;

    // 1. Obtener el archivo actual para conocer su SHA (obligatorio para actualizar en GitHub)
    let sha = undefined;
    try {
      const currentFile = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: filePath,
      });
      sha = currentFile.data.sha;
    } catch (e) {
      // Si el archivo no existe aún en GitHub, se creará uno nuevo
    }

    // 2. Convertir los datos a JSON string y codificar en Base64
    const contentEncoded = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

    // 3. Crear o actualizar el archivo mediante Commit de la API
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePath,
      message: commitMessage,
      content: contentEncoded,
      sha: sha,
    });

    return true;
  } catch (err) {
    console.error(`Error escribiendo en data/${filename} en GitHub:`, err.message);
    return false;
  }
};

// Ordenador de elementos por fecha/timestamp (Más recientes primero)
const sortByNewest = (items) => {
  return items.slice().sort((a, b) => {
    const timeA = new Date(a.createdAt || a.timestamp || Number(a.id) || 0).getTime();
    const timeB = new Date(b.createdAt || b.timestamp || Number(b.id) || 0).getTime();
    return timeB - timeA;
  });
};

// ==========================================
// MIDDLEWARE DE AUTENTICACIÓN ADMIN (JWT)
// ==========================================
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token faltante' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

// ==========================================
// RUTAS DE AUTENTICACIÓN (LOGIN ADMIN)
// ==========================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ success: true, token });
  }

  return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos' });
});

// ==========================================
// RUTAS PÚBLICAS (API REST GET)
// ==========================================

app.get('/api/config/authors-avatars', (req, res) => {
  res.json(AUTHORS_AND_AVATARS);
});

// 1. NOTICIAS
app.get('/api/noticias', async (req, res) => {
  const noticias = await readJsonFile('noticias.json');
  res.json(sortByNewest(noticias));
});

// 2. POSTS (Lista completa o individual)
app.get('/api/posts', async (req, res) => {
  const posts = await readJsonFile('posts.json');
  res.json(sortByNewest(posts));
});

app.get('/api/posts/:id', async (req, res) => {
  const posts = await readJsonFile('posts.json');
  const post = posts.find(p => String(p.id).trim() === String(req.params.id).trim());

  if (!post) {
    return res.status(404).json({ error: 'Artículo no encontrado' });
  }

  // Incrementar contador de vistas al leer un post y guardar en GitHub
  post.vistas = (post.vistas || 0) + 1;
  await writeJsonFile('posts.json', posts, `Incrementar vistas en post ID ${post.id}`);

  res.json(post);
});

// 3. VIDEOS
app.get('/api/videos', async (req, res) => {
  const videos = await readJsonFile('videos.json');
  res.json(sortByNewest(videos));
});

// 4. FORO
app.get('/api/foro', async (req, res) => {
  const foro = await readJsonFile('foro.json');
  res.json(sortByNewest(foro));
});

// 5. CONTENIDO DESTACADO PARA INDEX (PORTADA)
app.get('/api/destacado', async (req, res) => {
  const posts = await readJsonFile('posts.json');
  const videos = await readJsonFile('videos.json');
  const noticias = await readJsonFile('noticias.json');

  const sortedPosts = sortByNewest(posts);
  const sortedVideos = sortByNewest(videos);
  const sortedNoticias = sortByNewest(noticias);

  const postDestacado = sortedPosts.find(p => p.destacado === true) || sortedPosts[0] || null;
  const videoDestacado = sortedVideos[0] || null;
  const noticiasRecientes = sortedNoticias.slice(0, 3);

  res.json({
    heroPost: postDestacado,
    heroVideo: videoDestacado,
    noticias: noticiasRecientes
  });
});

// 6. REPOSITORIOS / HERRAMIENTAS
app.get('/api/repos', async (req, res) => {
  const repos = await readJsonFile('repos.json');
  res.json(sortByNewest(repos));
});

// ==========================================
// RUTAS PROTEGIDAS (ADMIN CONTROLLER API)
// ==========================================

// CREAR CONTENIDO
app.post('/api/admin/create', authMiddleware, async (req, res) => {
  const { type, payload } = req.body;
  const filename = `${type}.json`;

  const items = await readJsonFile(filename);

  const normalizedPayload = processAuthorAndAvatar(payload || req.body || {});

  const now = new Date();
  const isoDate = normalizedPayload.createdAt || normalizedPayload.timestamp || now.toISOString();

  const newItem = {
    id: Date.now().toString(),
    ...normalizedPayload,
    createdAt: isoDate,
    timestamp: isoDate,
    fecha: normalizedPayload.fecha || now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  };

  items.unshift(newItem);

  if (await writeJsonFile(filename, items, `Crear nuevo contenido en ${type}`)) {
    return res.json({ success: true, item: newItem });
  }
  res.status(500).json({ error: 'Error guardando en el servidor GitHub' });
});

// EDITAR CONTENIDO
const handleEdit = async (req, res) => {
  const { type, id } = req.params;
  const updatedPayload = req.body.payload || req.body;
  const filename = `${type}.json`;

  let items = await readJsonFile(filename);
  
  const index = items.findIndex(item => String(item.id).trim() === String(id).trim());

  if (index === -1) {
    return res.status(404).json({ error: 'Elemento no encontrado para actualizar' });
  }

  const normalizedPayload = processAuthorAndAvatar(updatedPayload || {});

  items[index] = {
    ...items[index],
    ...normalizedPayload,
    id: items[index].id,
    createdAt: items[index].createdAt || items[index].timestamp || new Date().toISOString(),
    timestamp: items[index].timestamp || items[index].createdAt || new Date().toISOString()
  };

  if (await writeJsonFile(filename, items, `Editar ${type} con ID ${id}`)) {
    console.log(`[ADMIN] ${type} con ID ${id} actualizado correctamente.`);
    return res.json({ success: true, item: items[index] });
  }
  
  res.status(500).json({ error: 'Error actualizando el archivo en GitHub' });
};

app.put('/api/admin/edit/:type/:id', authMiddleware, handleEdit);
app.put('/api/admin/update/:type/:id', authMiddleware, handleEdit);
app.put('/api/admin/:type/:id', authMiddleware, handleEdit);

// ELIMINAR CONTENIDO
const handleDelete = async (req, res) => {
  const { type, id } = req.params;
  const filename = `${type}.json`;

  let items = await readJsonFile(filename);
  const filtered = items.filter(item => String(item.id).trim() !== String(id).trim());

  if (await writeJsonFile(filename, filtered, `Eliminar ${type} con ID ${id}`)) {
    console.log(`[ADMIN] ${type} con ID ${id} eliminado correctamente.`);
    return res.json({ success: true, id });
  }
  res.status(500).json({ error: 'Error eliminando el elemento en GitHub' });
};

app.delete('/api/admin/delete/:type/:id', authMiddleware, handleDelete);
app.delete('/api/admin/:type/:id', authMiddleware, handleDelete);

// ESTABLECER UN POST COMO DESTACADO EN EL INICIO
app.put('/api/admin/set-featured/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  let posts = await readJsonFile('posts.json');

  posts = posts.map(post => ({
    ...post,
    destacado: String(post.id).trim() === String(id).trim()
  }));

  if (await writeJsonFile('posts.json', posts, `Marcar post ${id} como destacado`)) {
    return res.json({ success: true, featuredId: id });
  }
  res.status(500).json({ error: 'Error al marcar como destacado en GitHub' });
});

// ==========================================
// ARRANCAR EL SERVIDOR
// ==========================================
app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`  🎮 El Tío Baza Blog Server en ejecución`);
  console.log(`  🌐 URL local: http://localhost:${PORT}`);
  console.log(`  🔒 GitHub Sync: Activo (${GITHUB_OWNER}/${GITHUB_REPO})`);
  console.log(`================================================`);
});

