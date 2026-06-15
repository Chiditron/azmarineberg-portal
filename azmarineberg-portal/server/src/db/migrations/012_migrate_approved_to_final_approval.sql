-- Replace legacy approved status with final_approval.

UPDATE services
SET status = 'final_approval'
WHERE status = 'approved';

UPDATE service_status_history
SET status = 'final_approval'
WHERE status = 'approved';

