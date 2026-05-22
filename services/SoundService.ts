import { Audio } from 'expo-av';
import { Vibration } from 'react-native';

class SoundService {
    private shortBeep: Audio.Sound | null = null;
    private longBeep: Audio.Sound | null = null;

    constructor() {
        this.loadSounds();
    }

    async loadSounds() {
        try {
            // Load local 3000 Hz beep files
            const { sound: shortSound } = await Audio.Sound.createAsync(
                require('../../assets/audio/beep_short.wav'),
                { shouldPlay: false }
            );
            this.shortBeep = shortSound;

            const { sound: longSound } = await Audio.Sound.createAsync(
                require('../../assets/audio/beep_long.wav'),
                { shouldPlay: false }
            );
            this.longBeep = longSound;
        } catch (error) {
            console.log('Error loading local 3kHz beeps:', error);
        }
    }

    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async playPattern(type: 'short' | 'long', count: number, intervalMs: number) {
        const sound = type === 'short' ? this.shortBeep : this.longBeep;
        if (!sound) return;

        for (let i = 0; i < count; i++) {
            await sound.replayAsync();
            if (i < count - 1) {
                await this.sleep(intervalMs);
            }
        }
    }

    async playSuccess() {
        try {
            if (this.shortBeep) {
                await this.playPattern('short', 1, 0);
            } else {
                Vibration.vibrate(50);
            }
        } catch (error) {
            Vibration.vibrate(50);
        }
    }

    async playAnomaly() {
        try {
            if (this.shortBeep) {
                await this.playPattern('short', 3, 400);
            } else {
                Vibration.vibrate([0, 100, 50, 100, 50, 100]); 
            }
        } catch (error) {
            Vibration.vibrate([0, 100, 50, 100, 50, 100]);
        }
    }

    async playBlockingError() {
        try {
            if (this.longBeep) {
                await this.playPattern('long', 1, 0);
            } else {
                Vibration.vibrate([0, 1000]); 
            }
        } catch (error) {
            Vibration.vibrate([0, 1000]);
        }
    }

    async playError() {
        return this.playBlockingError();
    }

    // Altre logiche trasformate in pure combinazioni di 3000 Hz

    async playFragileAlert() {
        try {
            if (this.shortBeep) {
                await this.playPattern('short', 2, 600); // Due bip distanziati
            } else {
                Vibration.vibrate([0, 50, 100, 50]); 
            }
        } catch (error) {
            Vibration.vibrate([0, 50, 100, 50]);
        }
    }

    async playOrderComplete() {
        try {
            if (this.shortBeep) {
                await this.playPattern('short', 4, 150); // Quattro bip molto rapidi
            } else {
                Vibration.vibrate([0, 100, 50, 200, 50, 300]); 
            }
        } catch (error) {
            Vibration.vibrate([0, 100, 50, 200, 50, 300]);
        }
    }

    async playBatteryLow() {
        try {
            if (this.longBeep) {
                await this.playPattern('long', 2, 1200); // Due bip lunghi
            } else {
                Vibration.vibrate([0, 300, 100, 300]); 
            }
        } catch (error) {
            Vibration.vibrate([0, 300, 100, 300]);
        }
    }

    async playUrgentOrder() {
        try {
            if (this.shortBeep) {
                await this.playPattern('short', 5, 100); // Cinque bip estremamente rapidi
            } else {
                Vibration.vibrate([0, 100, 50, 100, 50, 100, 50, 100]); 
            }
        } catch (error) {
            Vibration.vibrate([0, 100, 50, 100, 50, 100, 50, 100]);
        }
    }

    async playWarning() {
        return this.playAnomaly();
    }
}

export const soundService = new SoundService();
