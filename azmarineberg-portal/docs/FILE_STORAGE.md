# File Storage Documentation

## Overview

The portal stores document files (e.g. permits, certificates, uploads) in one of two backends:

1. **Local** – `STORAGE_TYPE=local`: files on disk under `server/uploads/`.
2. **S3-compatible** – Any other `STORAGE_TYPE`: MinIO (dev) or AWS S3 / Cloudflare R2 (production) using the same API.

All access to files goes through the backend; there are no direct or presigned URLs exposed to the client. The client gets a download URL that points to the backend’s “serve” endpoint.

## Configuration

| Variable | Description |
|----------|-------------|
| `STORAGE_TYPE` | Set to `local` for disk storage; any other value uses S3-compatible. |
| `S3_ENDPOINT` | S3 endpoint URL (e.g. MinIO `http://localhost:9000`, R2 endpoint). |
| `S3_ACCESS_KEY` | Access key. |
| `S3_SECRET_KEY` | Secret key. |
| `S3_BUCKET` | Bucket name (default `azmarineberg-documents`). |
| `S3_REGION` | Region (e.g. `us-east-1`). |
| `S3_USE_SSL` | Optional; used if the client is configured to use SSL. |
| `RENDER_EXTERNAL_URL` / `API_URL` | Backend’s public URL; used to build the document “serve” URL returned to the client. |

Implementation lives in `server/src/services/storage.service.ts`.

## Key Layout (Tenant Isolation in Storage)

Object keys follow a predictable path so that:

- Files are grouped by company and service.
- Different companies’ files never share the same prefix.

Format:

```
{companyId}/{serviceId}/{documentId}_v{version}{ext}
```

Example: `a1b2c3.../f4e5.../d6e7..._v1.pdf`

- **companyId** – UUID of the company (from `companies.id`).
- **serviceId** – UUID of the service (from `services.id`).
- **documentId** – UUID of the document row (from `documents.id`).
- **version** – Document version number (from `documents.version`).
- **ext** – File extension (e.g. `.pdf`).

Generated in code by `getStoragePath(companyId, serviceId, documentId, version, ext)`.

## Upload Flow

1. **Route:** `POST /api/documents/service/:serviceId/upload`
2. **Middleware:** `authenticate`, then `multer.single('file')` (max 20MB).
3. **Controller:** Ensures the service exists and, if the user is a client, that `service.company_id === req.user.companyId`. Inserts a row into `documents`, then builds the storage key using the service’s `company_id`, `serviceId`, new document id, version 1, and file extension. Calls `storage.uploadFile(key, buffer, mimetype)`. On storage failure, the document row is removed.

So uploads are always tied to a service and thus to a company; clients can only upload to their own company’s services.

## Download and Serve

- **Download URL:** The client calls `GET /api/documents/:id/download-url`. The backend looks up the document, checks access (user must be allowed to see that document – e.g. client: document’s service must belong to user’s company), then returns JSON: `{ url: "<backend>/api/documents/serve?key=<s3_key>" }`. So the “download URL” is the backend’s own serve endpoint with the object key.
- **Serve:** `GET /api/documents/serve?key=...` – Requires `authenticate`. Backend finds the document by `s3_key`, joins to `services` to get `company_id`, and allows access only if the user is not a client or the document’s company matches `req.user.companyId`. Then:
  - **Local:** Streams from disk via `createReadStream(localPath)`.
  - **S3:** Uses `storage.getObjectStream(s3Key)` and streams the S3 body to the response with appropriate `Content-Type`.

No presigned S3 URLs are used; all streaming is through the backend so that auth and company checks are enforced on every request.

## Adding a New Storage Backend or Changing Key Structure

- **New backend:** In `storage.service.ts`, add a new branch (e.g. check another env var or `STORAGE_TYPE`). Implement `uploadFile` and, for streaming download, either extend the serve logic to call a new “get stream” function or keep using the existing S3/local split (e.g. “local” and “s3” only). The serve endpoint in the documents controller must use this logic to get a stream and pipe it to the response.
- **Key structure:** Change `getStoragePath` and any code that builds keys. Ensure existing objects are either migrated or still reachable (e.g. keep storing `s3_key` in `documents` so old links still work). New uploads will use the new pattern.
