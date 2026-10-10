import { Client } from '@stomp/stompjs';

let client: Client | null = null;

export const getStompClient = () => {
    if (client && client.active) return client;
    
    const isStaff = window.location.pathname.startsWith('/staff');
    const token = localStorage.getItem(isStaff ? 'staff_token' : 'guest_token');
    if (!token) return null;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    client = new Client({
        brokerURL: `${protocol}//${window.location.host}/ws/orders`,
        connectHeaders: {
            Authorization: `Bearer ${token}`
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
    });
    client.activate();
    return client;
};

export const disconnectWs = () => {
    if (client) {
        client.deactivate();
        client = null;
    }
};
