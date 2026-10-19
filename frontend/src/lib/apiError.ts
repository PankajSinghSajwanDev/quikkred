export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    status = 400,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function fieldErrorsFrom(err: unknown): Record<string, string> | undefined {
  if (err instanceof ApiError && err.fieldErrors) return err.fieldErrors;
  return undefined;
}

export async function parseApiError(res: Response): Promise<ApiError> {
  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    errors?: Record<string, string>;
  };
  return new ApiError(
    data.message || 'Request failed',
    res.status,
    data.errors,
  );
}
