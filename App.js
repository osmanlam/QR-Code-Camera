// App: Root component wiring the camera and preview screens.
// Shows CameraComponent first; after a photo is taken or selected,
// switches to PreviewComponent to place/size a QR and save.
import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CameraComponent from './src/components/CameraComponent';
import PreviewComponent from './src/components/PreviewComponent';

export default function App() {
  // Holds the last captured/selected photo with optional coords
  const [photo, setPhoto] = useState(null);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ flex: 1 }}>
            {/* Simple two-screen flow:
                - No photo: show camera and wait for user action
                - Has photo: show preview, allow editing + save, and close returns to camera */}
            {!photo ? (
              // Pass a handler to receive { uri, coords } from the camera/gallery
              <CameraComponent onPhotoSelected={p => setPhoto(p)} />
            ) : (
              // Provide the photo to preview; closing clears it to return to camera
              <PreviewComponent photo={photo} onClose={() => setPhoto(null)} />
            )}
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
