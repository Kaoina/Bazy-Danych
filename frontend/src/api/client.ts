import axios, { AxiosError } from 'axios';

// Klucz w localStorage, pod którym trzymamy token JWT.
const TOKEN_KEY = 'jwt_token';

// Globalny klient API dla aplikacji frontendowej.
// Ustawia bazowy adres serwera, domyślny nagłówek i timeout.
export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10_000,
});

/* ---------- Request interceptor — attach JWT ---------- */
// Przed wysłaniem każdego żądania dodajemy Authorization Bearer,
// jeżeli użytkownik jest zalogowany i mamy token w localStorage.
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

/* ---------- Response interceptor — handle 401 globally ---------- */
// Jeśli otrzymamy 401 Unauthorized poza endpointami auth,
// usuwamy token i przekierowujemy na stronę logowania.
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        const url = error.config?.url ?? ''
        const isAuthEndpoint = url.includes('/api/auth/')

        if (error.response?.status === 401 && !isAuthEndpoint) {
            localStorage.removeItem(TOKEN_KEY)
            window.location.replace('/login')
        }
        return Promise.reject(error)
    },
)

/* ---------- Token helpers (used by useAuth hook) ---------- */
export const tokenStorage = {
    // Pobiera token JWT z localStorage.
    get: (): string | null => localStorage.getItem(TOKEN_KEY),
    // Zapisuje token JWT do localStorage.
    set: (token: string): void  => localStorage.setItem(TOKEN_KEY, token),
    // Usuwa token JWT z localStorage.
    clear: (): void              => localStorage.removeItem(TOKEN_KEY),
};