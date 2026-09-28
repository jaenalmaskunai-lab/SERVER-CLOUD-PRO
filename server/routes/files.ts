import { Router } from 'express';
import { queryOne } from '../db/database';
import { listDirectory, readFile, writeFile, createDirectory, deleteFileOrDir, changePermissions } from '../services/fileManager';
import { recordAuditLog } from '../middleware/audit';

const router = Router();

// List directory
router.get('/', (req: any, res) => {
  const accountId = Number(req.query.account_id);
  const path = (req.query.path as string) || '/public_html';

  if (!accountId) return res.status(400).json({ error: 'Account ID wajib diisi' });

  const account = queryOne<{ domain: string }>('SELECT domain FROM hosting_accounts WHERE id = ?', [accountId]);
  const domain = account?.domain || 'example.com';

  try {
    const items = listDirectory(accountId, path, domain);
    res.json({ path, items });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Read file
router.get('/read', (req: any, res) => {
  const accountId = Number(req.query.account_id);
  const path = req.query.path as string;

  if (!accountId || !path) return res.status(400).json({ error: 'Account ID dan path file wajib diisi' });

  try {
    const file = readFile(accountId, path);
    res.json(file);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// Write / Save file
router.post('/write', (req: any, res) => {
  const user = req.user;
  const { account_id, path, content } = req.body;

  if (!account_id || !path) return res.status(400).json({ error: 'Account ID dan path wajib diisi' });

  try {
    const saved = writeFile(Number(account_id), path, content || '');
    recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'SAVE_FILE', 'file', `${account_id}:${path}`, `Saved file: ${path}`);
    res.json({ success: true, file: saved });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Create File
router.post('/create-file', (req: any, res) => {
  const user = req.user;
  const { account_id, dir_path, filename } = req.body;

  if (!account_id || !dir_path || !filename) return res.status(400).json({ error: 'Account ID, folder path, dan nama file wajib diisi' });

  const cleanFilename = filename.trim().replace(/^\/+/, '');
  const filePath = `${dir_path.replace(/\/+$/, '')}/${cleanFilename}`;

  try {
    const file = writeFile(Number(account_id), filePath, '');
    recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'CREATE_FILE', 'file', `${account_id}:${filePath}`, `Created file: ${filePath}`);
    res.status(201).json({ success: true, file });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Create Folder
router.post('/create-folder', (req: any, res) => {
  const user = req.user;
  const { account_id, dir_path, folder_name } = req.body;

  if (!account_id || !dir_path || !folder_name) return res.status(400).json({ error: 'Data tidak lengkap' });

  const cleanFolderName = folder_name.trim().replace(/^\/+/, '');
  const targetPath = `${dir_path.replace(/\/+$/, '')}/${cleanFolderName}`;

  try {
    const folder = createDirectory(Number(account_id), targetPath);
    recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'CREATE_FOLDER', 'folder', `${account_id}:${targetPath}`, `Created folder: ${targetPath}`);
    res.status(201).json({ success: true, folder });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete file or folder
router.delete('/', (req: any, res) => {
  const user = req.user;
  const accountId = Number(req.query.account_id);
  const path = req.query.path as string;

  if (!accountId || !path) return res.status(400).json({ error: 'Account ID dan path wajib diisi' });

  try {
    deleteFileOrDir(accountId, path);
    recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'DELETE_FILE', 'file', `${accountId}:${path}`, `Deleted file/folder: ${path}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Change permissions (chmod)
router.post('/chmod', (req: any, res) => {
  const user = req.user;
  const { account_id, path, permissions } = req.body;

  if (!account_id || !path || !permissions) return res.status(400).json({ error: 'Parameter tidak lengkap' });

  try {
    const updated = changePermissions(Number(account_id), path, permissions);
    recordAuditLog(user.id, user.role, req.ip || '127.0.0.1', 'CHMOD_FILE', 'file', `${account_id}:${path}`, `Chmod ${permissions}`);
    res.json({ success: true, item: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
