import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.ebookreader',
  appName: 'Elektronik Kitap Okuyucu',
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
    }
  }
};

export default config;
