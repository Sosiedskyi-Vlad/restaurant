import axios from 'axios';

export const api = axios.create({
    baseURL: '/api/v1',
});

api.interceptors.request.use((config) => {
    const isStaff = window.location.pathname.startsWith('/staff');
    const token = localStorage.getItem(isStaff ? 'staff_token' : 'guest_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isStaff = window.location.pathname.startsWith('/staff');
            if (isStaff) {
                localStorage.removeItem('staff_token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            } else {
                localStorage.removeItem('guest_token');
            }
        }
        return Promise.reject(error);
    }
);
