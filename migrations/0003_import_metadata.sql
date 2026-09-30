-- The source exports did not capture per-image timestamps. Do not infer them from trace submission.
UPDATE artifacts SET captured_at = 'Not captured' WHERE run_id IN (
 'd8a40ada-4438-4de7-9c7c-4c0f5712aecc', '865a6e25-cf03-4ed2-84a3-219b70622d43',
 '083d42cd-c18a-4964-8649-b258b459203a', 'ee71c2ca-c202-4fab-9beb-4a7b5d5291bc');
