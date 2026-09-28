import { Router } from 'express';
import { query, run } from '../db/database';
import { processNextJob, enqueueJob } from '../services/queue';
import { requireRole } from '../middleware/auth';

const router = Router();

// List Queue Jobs
router.get('/jobs', (req, res) => {
  const jobs = query('SELECT * FROM queue_jobs ORDER BY id DESC LIMIT 50');
  res.json(jobs);
});

// Run Next Pending Job (manual trigger from panel)
router.post('/process-next', async (req, res) => {
  try {
    const job = await processNextJob();
    if (!job) {
      return res.json({ processed: false, message: 'Tidak ada pekerjaan yang antre saat ini.' });
    }
    res.json({ processed: true, job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Enqueue Test Job
router.post('/enqueue-test', (req: any, res) => {
  const { job_type, payload } = req.body;
  const jobId = enqueueJob(job_type || 'HEALTH_CHECK_SERVICES', payload || { source: 'dashboard_manual_trigger' });
  res.json({ success: true, jobId });
});

export default router;
