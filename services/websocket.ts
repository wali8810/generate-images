import { io, Socket } from 'socket.io-client';
import { API_URL } from '../constants';

class WebSocketService {
    private socket: Socket | null = null;
    private token: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    connect(token?: string) {
        if (this.socket?.connected) {
            console.log('✅ WebSocket already connected');
            return;
        }

        this.token = token || null;

        console.log('🔌 Connecting to WebSocket server...');

        this.socket = io(API_URL, {
            auth: {
                token: this.token
            },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts
        });

        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            this.reconnectAttempts = 0;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ WebSocket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ WebSocket connection error:', error);
            this.reconnectAttempts++;
        });

        this.socket.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
        });
    }

    disconnect() {
        if (this.socket) {
            console.log('🔌 Disconnecting WebSocket...');
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Subscribe to events
    on(event: string, callback: (data: any) => void) {
        if (!this.socket) {
            console.warn('⚠️ WebSocket not connected. Call connect() first.');
            return;
        }
        this.socket.on(event, callback);
    }

    // Unsubscribe from events
    off(event: string, callback?: (data: any) => void) {
        if (!this.socket) return;
        if (callback) {
            this.socket.off(event, callback);
        } else {
            this.socket.off(event);
        }
    }

    // Emit events
    emit(event: string, data?: any) {
        if (!this.socket) {
            console.warn('⚠️ WebSocket not connected. Call connect() first.');
            return;
        }
        this.socket.emit(event, data);
    }

    // Check if connected
    isConnected(): boolean {
        return this.socket?.connected || false;
    }

    // Update authentication token
    updateAuth(token: string | null) {
        this.token = token;
        if (this.socket?.connected) {
            // Reconnect with new token
            this.disconnect();
            this.connect(token || undefined);
        }
    }
}

// Export singleton instance
export const websocketService = new WebSocketService();
