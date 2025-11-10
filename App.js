import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import CameraComponent from './src/components/CameraComponent';
import PreviewComponent from './src/components/PreviewComponent';

export default function App() {
  const [photo, setPhoto] = useState(null);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {!photo ? (
          <CameraComponent onPhotoSelected={p => setPhoto(p)} />
        ) : (
          <PreviewComponent photo={photo} onClose={() => setPhoto(null)} />
        )}
      </View>
    </GestureHandlerRootView>
  );
}
