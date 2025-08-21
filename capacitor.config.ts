import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mithat.biblionary',
  appName: 'Biblionary',
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
    scheme: 'biblionary',
    limitsNavigationsToAppBoundDomains: false,
    webContentsDebuggingEnabled: true
  }
};

export default config;
