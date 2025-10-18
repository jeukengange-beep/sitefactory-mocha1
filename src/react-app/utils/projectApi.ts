import type { UpdateProjectRequest } from '@/shared/types';
import { apiFetch } from '@/react-app/utils/apiClient';

type PersistOptions = {
  errorMessage?: string;
};

export async function persistProjectUpdate(
  projectId: string | number | undefined,
  payload: Partial<UpdateProjectRequest>,
  options?: PersistOptions
): Promise<boolean> {
  if (projectId === undefined || projectId === null) {
    console.warn('persistProjectUpdate called without a project id');
    return false;
  }

  const idAsString = String(projectId);

  try {
    const response = await apiFetch(`/api/projects/${idAsString}`, {
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

    return true;
  } catch (error) {
    console.error('Error persisting project update:', error);

    if (typeof window !== 'undefined') {
      alert(
        options?.errorMessage ??
          'Une erreur est survenue lors de la sauvegarde du projet. Vos données locales sont conservées.'
      );
    }

    return false;
  }
}

