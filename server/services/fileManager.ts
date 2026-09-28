export interface FileItem {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  permissions: string;
  modifiedAt: string;
  content?: string;
}

// In-memory virtual file tree indexed by account ID
const virtualFileSystems: Record<number, Record<string, FileItem>> = {};

function initAccountFilesystem(accountId: number, domain: string = 'example.com') {
  if (virtualFileSystems[accountId]) return;

  virtualFileSystems[accountId] = {
    '/public_html': {
      id: 'root',
      name: 'public_html',
      path: '/public_html',
      isDir: true,
      size: 4096,
      permissions: '0755',
      modifiedAt: new Date().toISOString()
    },
    '/public_html/index.html': {
      id: 'f1',
      name: 'index.html',
      path: '/public_html/index.html',
      isDir: false,
      size: 1420,
      permissions: '0644',
      modifiedAt: new Date().toISOString(),
      content: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Selamat Datang di ${domain}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; border: 1px solid #334155; text-align: center; max-width: 500px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    h1 { color: #38bdf8; font-size: 1.75rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; line-height: 1.6; }
    .badge { display: inline-block; background: #0369a1; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 Website Siap Digunakan!</h1>
    <p>Domain <strong>${domain}</strong> telah berhasil diprovisi pada server Cloud PRO berkinerja tinggi.</p>
    <p>Unggah file website Anda ke direktori <code>/public_html</code> menggunakan File Manager atau SFTP.</p>
    <div class="badge">Powered by Cloud PRO Reseller Engine</div>
  </div>
</body>
</html>`
    },
    '/public_html/.htaccess': {
      id: 'f2',
      name: '.htaccess',
      path: '/public_html/.htaccess',
      isDir: false,
      size: 450,
      permissions: '0644',
      modifiedAt: new Date().toISOString(),
      content: `# Cloud PRO Web Server Directives
RewriteEngine On
RewriteBase /

# Force HTTPS SSL
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Protect sensitive files
<FilesMatch "^\\.(htaccess|htpasswd|ini|phps|fla|psd|log|sh)$">
  Order Allow,Deny
  Deny from all
</FilesMatch>`
    },
    '/public_html/info.php': {
      id: 'f3',
      name: 'info.php',
      path: '/public_html/info.php',
      isDir: false,
      size: 28,
      permissions: '0644',
      modifiedAt: new Date().toISOString(),
      content: `<?php\nphpinfo();\n?>`
    },
    '/public_html/assets': {
      id: 'f4',
      name: 'assets',
      path: '/public_html/assets',
      isDir: true,
      size: 4096,
      permissions: '0755',
      modifiedAt: new Date().toISOString()
    },
    '/public_html/assets/style.css': {
      id: 'f5',
      name: 'style.css',
      path: '/public_html/assets/style.css',
      isDir: false,
      size: 320,
      permissions: '0644',
      modifiedAt: new Date().toISOString(),
      content: `/* Custom Website Styling */\n:root {\n  --primary: #0284c7;\n  --bg: #ffffff;\n}\n\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n}`
    }
  };
}

export function listDirectory(accountId: number, dirPath: string = '/public_html', domain: string = 'example.com'): FileItem[] {
  initAccountFilesystem(accountId, domain);
  const fs = virtualFileSystems[accountId];
  const normalizedDir = dirPath.replace(/\/+$/, '') || '/public_html';

  const items: FileItem[] = [];
  for (const p in fs) {
    if (p === normalizedDir) continue;
    const parentDir = p.substring(0, p.lastIndexOf('')) || '/';
    const lastSlash = p.lastIndexOf('/');
    const dir = p.substring(0, lastSlash) || '/';

    if (dir === normalizedDir) {
      items.push({
        id: fs[p].id,
        name: fs[p].name,
        path: fs[p].path,
        isDir: fs[p].isDir,
        size: fs[p].size,
        permissions: fs[p].permissions,
        modifiedAt: fs[p].modifiedAt
      });
    }
  }

  // Sort directories first, then alphabetical
  return items.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function readFile(accountId: number, filePath: string): FileItem {
  initAccountFilesystem(accountId);
  const file = virtualFileSystems[accountId]?.[filePath];
  if (!file) throw new Error(`File '${filePath}' tidak ditemukan.`);
  if (file.isDir) throw new Error(`'${filePath}' adalah direktori, bukan file.`);
  return file;
}

export function writeFile(accountId: number, filePath: string, content: string): FileItem {
  initAccountFilesystem(accountId);
  const name = filePath.split('/').pop() || 'file';
  const item: FileItem = {
    id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    path: filePath,
    isDir: false,
    size: Buffer.byteLength(content, 'utf-8'),
    permissions: '0644',
    modifiedAt: new Date().toISOString(),
    content
  };
  virtualFileSystems[accountId][filePath] = item;
  return item;
}

export function createDirectory(accountId: number, dirPath: string): FileItem {
  initAccountFilesystem(accountId);
  const name = dirPath.split('/').pop() || 'folder';
  const item: FileItem = {
    id: `d_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    path: dirPath,
    isDir: true,
    size: 4096,
    permissions: '0755',
    modifiedAt: new Date().toISOString()
  };
  virtualFileSystems[accountId][dirPath] = item;
  return item;
}

export function deleteFileOrDir(accountId: number, itemPath: string): boolean {
  initAccountFilesystem(accountId);
  const fs = virtualFileSystems[accountId];
  if (!fs[itemPath]) throw new Error(`File atau folder '${itemPath}' tidak ditemukan.`);

  // If directory, delete all children too
  for (const p in fs) {
    if (p === itemPath || p.startsWith(`${itemPath}/`)) {
      delete fs[p];
    }
  }
  return true;
}

export function changePermissions(accountId: number, itemPath: string, permissions: string): FileItem {
  initAccountFilesystem(accountId);
  const item = virtualFileSystems[accountId]?.[itemPath];
  if (!item) throw new Error(`Item '${itemPath}' tidak ditemukan.`);
  item.permissions = permissions;
  return item;
}
