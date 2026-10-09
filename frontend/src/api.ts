// ── API Client ────────────────────────────────────────────────────────────────

import type { AnalysisRequest, AnalysisResponse, ExtractResponse } from './types';
import { API_BASE } from './constants';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.errors?.join(', ') || `HTTP ${res.status}`);
  }
  return data as T;
}

export async function analyze(request: AnalysisRequest): Promise<AnalysisResponse> {
  return apiFetch<AnalysisResponse>('/analyze', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getPresignedUrl(filename: string, contentType: string) {
  return apiFetch<{ presignedPost: { url: string; fields: Record<string, string> }; s3Key: string }>(
    `/extract-logbook?action=presign&filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`
  );
}

export async function uploadToS3(
  presignedPost: { url: string; fields: Record<string, string> },
  file: File
): Promise<void> {
  const formData = new FormData();
  Object.entries(presignedPost.fields).forEach(([k, v]) => formData.append(k, v));
  formData.append('file', file);
  const res = await fetch(presignedPost.url, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
}

export async function extractLogbook(s3Key: string): Promise<ExtractResponse> {
  return apiFetch<ExtractResponse>('/extract-logbook', {
    method: 'POST',
    body: JSON.stringify({ s3Key }),
  });
}

export async function saveReport(results: AnalysisResponse, lang: string = 'en') {
  return apiFetch<{ id: string; reportUrl: string; summaryEn: string; summaryHi: string }>('/report', {
    method: 'POST',
    body: JSON.stringify({ results, lang }),
  });
}

export async function getReport(id: string): Promise<AnalysisResponse & { summaryEn: string; summaryHi: string }> {
  return apiFetch(`/report/${id}`);
}
