import { query, run } from '../db/database';

export interface QueueJob {
  id: number;
  job_type: string;
  payload: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export function enqueueJob(jobType: string, payload: Record<string, any>): number {
  const result = run(
    `INSERT INTO queue_jobs (job_type, payload, status, attempts)
     VALUES (?, ?, 'pending', 0)`,
    [jobType, JSON.stringify(payload)]
  );
  return result.lastInsertRowid;
}

export async function processNextJob(): Promise<QueueJob | null> {
  const pending = query<QueueJob>(
    `SELECT * FROM queue_jobs WHERE status = 'pending' ORDER BY id ASC LIMIT 1`
  );

  if (pending.length === 0) return null;
  const job = pending[0];

  run(`UPDATE queue_jobs SET status = 'processing', attempts = attempts + 1 WHERE id = ?`, [job.id]);

  try {
    const data = JSON.parse(job.payload);

    // Simulate real background operation latency
    switch (job.job_type) {
      case 'PROVISION_HOSTING_ACCOUNT':
        console.log(`[Queue Worker] Provisioning virtual host for domain: ${data.domain}...`);
        break;
      case 'GENERATE_AUTO_SSL':
        console.log(`[Queue Worker] Requesting Let's Encrypt SSL certificate for ${data.domain}...`);
        run(`UPDATE hosting_accounts SET ssl_status = 'active', ssl_expires_at = datetime('now', '+90 days') WHERE id = ?`, [data.account_id]);
        break;
      case 'CREATE_SCHEDULED_BACKUP':
        console.log(`[Queue Worker] Packing files and exporting MySQL databases for account ${data.account_id}...`);
        run(`INSERT INTO backups (hosting_account_id, type, file_name, file_size_mb, storage_type, status)
             VALUES (?, ?, ?, ?, 'local', 'completed')`,
          [data.account_id, data.type || 'full', `backup_snap_${Date.now()}.tar.gz`, Math.floor(Math.random() * 200 + 50)]
        );
        break;
      case 'HEALTH_CHECK_SERVICES':
        console.log(`[Queue Worker] Checking cluster node services...`);
        break;
      default:
        console.log(`[Queue Worker] Executed custom job: ${job.job_type}`);
    }

    run(`UPDATE queue_jobs SET status = 'completed', completed_at = datetime('now') WHERE id = ?`, [job.id]);
    return { ...job, status: 'completed' };
  } catch (err: any) {
    run(`UPDATE queue_jobs SET status = 'failed', error_message = ? WHERE id = ?`, [err.message || 'Worker failure', job.id]);
    return { ...job, status: 'failed', error_message: err.message };
  }
}
