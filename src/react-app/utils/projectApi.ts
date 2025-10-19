import type { UpdateProjectRequest } from '@/shared/types';
import { apiFetch } from '@/react-app/utils/apiClient';

export async function persistProjectUpdate(
  projectId: string | number | undefined,
  payload: Partial<UpdateProjectRequest>,
): Promise<void> {
  if (projectId === undefined || projectId === null) {
    throw new Error('persistProjectUpdate called without a project id');
  }

  const response = await apiFetch(`/api/projects/${String(projectId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      errorText || `Failed to persist project update (status ${response.status})`
    );
  }
}

