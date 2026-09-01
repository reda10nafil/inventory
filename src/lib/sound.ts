// Fase 4: expo-av -> react-native-sound
let RNSound: any = null;
try { RNSound = require('react-native-sound'); } catch {}

let ExpoAudio: any = null;
try { ExpoAudio = require('expo-av').Audio; } catch {}

// Wrapper che mantiene interfaccia createAsync / replayAsync ma usa RNSound se disponibile
export class SoundWrapper {
  private sound: any = null;
  private isRNSound = false;

  async createAsync(source: any, opts?: any) {
    if (RNSound) {
      const uri = source?.uri || source;
      this.sound = new RNSound(uri, undefined, (e: any) => { if(e) console.log('RNSound load error',e); });
      this.isRNSound = true;
      return { sound: this };
    }
    if (ExpoAudio) {
      const res = await ExpoAudio.Sound.createAsync(source, opts);
      this.sound = res.sound;
      return res;
    }
    return { sound: this };
  }

  async replayAsync() {
    if (this.isRNSound && this.sound) {
      this.sound.stop(() => this.sound.play());
    } else if (this.sound && this.sound.replayAsync) {
      await this.sound.replayAsync();
    }
  }
}
