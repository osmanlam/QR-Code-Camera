import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CameraComponent from './src/components/CameraComponent';
import PreviewComponent from './src/components/PreviewComponent';

export default function App() {
  const [photo, setPhoto] = useState(null);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ flex: 1 }}>
            {!photo ? (
              <CameraComponent onPhotoSelected={p => setPhoto(p)} />
            ) : (
              <PreviewComponent photo={photo} onClose={() => setPhoto(null)} />
            )}
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
