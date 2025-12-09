// Device Fingerprinting Utility
// Gera um ID único baseado em características do dispositivo

export const getDeviceFingerprint = async (): Promise<string> => {
    const components = [
        navigator.userAgent,
        navigator.language,
        navigator.platform,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 0,
        (navigator as any).deviceMemory || 0,
    ];

    // Canvas fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Estampa Mágica', 2, 2);
        components.push(canvas.toDataURL());
    }

    // Combinar todos os componentes
    const fingerprint = components.join('|');

    // Gerar hash simples
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36);
};

export const getStoredDeviceId = (): string | null => {
    return localStorage.getItem('device_id');
};

export const storeDeviceId = (deviceId: string): void => {
    localStorage.setItem('device_id', deviceId);
};

export const getOrCreateDeviceId = async (): Promise<string> => {
    let deviceId = getStoredDeviceId();

    if (!deviceId) {
        deviceId = await getDeviceFingerprint();
        storeDeviceId(deviceId);
    }

    return deviceId;
};
