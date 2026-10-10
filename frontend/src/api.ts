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
