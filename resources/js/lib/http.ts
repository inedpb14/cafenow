/**
 * HTTP helper with automatic CSRF token injection.
 *
 * Laravel Sanctum / Laravel default CSRF: read XSRF-TOKEN cookie dan kirim
 * sebagai header X-XSRF-TOKEN. Fetch API tidak melakukan ini secara otomatis
 * berbeda dengan Axios. Helper ini mengurus itu.
 */

function getCsrfToken(): string {
    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='));
    return match ? decodeURIComponent(match.split('=')[1]) : '';
}

type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface FetchOptions {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
}

/**
 * POST/PUT/PATCH/DELETE request dengan CSRF token otomatis.
 */
export async function http(
    method: HttpMethod,
    url: string,
    options: FetchOptions = {}
): Promise<Response> {
    const { body, headers = {} } = options;

    return fetch(url, {
        method,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': getCsrfToken(),
            ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
}

export const api = {
    post: (url: string, body?: Record<string, unknown>) =>
        http('POST', url, { body }),
    put: (url: string, body?: Record<string, unknown>) =>
        http('PUT', url, { body }),
    patch: (url: string, body?: Record<string, unknown>) =>
        http('PATCH', url, { body }),
    delete: (url: string, body?: Record<string, unknown>) =>
        http('DELETE', url, { body }),
};
