import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.risaleinurai.app',
  appName: 'Risale-i Nur - AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3B82F6',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    Haptics: {
      // iOS haptic feedback ayarları
    }
  },
  ios: {
    // iOS özel ayarları
    scheme: 'risaleinurai',
    limitsNavigationsToAppBoundDomains: false,
    webContentsDebuggingEnabled: true
  }
};

export default config;
