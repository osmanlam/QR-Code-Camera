import React, { useRef, useState } from 'react';
import { View, Text, Button, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import styles, { DEFAULT_FLASH } from '../styles/styles';

export default function CameraComponent({ onPhotoSelected }) {
  const cameraRef = useRef(null);
  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState(DEFAULT_FLASH);
  const [loading, setLoading] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  async function fetchLocationIfAllowed() {
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return null;
      const pos = await Location.getCurrentPositionAsync({});
      return pos.coords;
    } catch (e) {
      console.warn('Location fetch failed', e);
      return null;
    }
  }

  async function pickImageFromGallery() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const coords = await fetchLocationIfAllowed();
        onPhotoSelected({ uri: result.assets[0].uri, coords });
      }
    } catch (e) {
      console.warn('Gallery pick failed', e);
    }
  }

  async function takePicture() {
    if (!cameraRef.current) return;
    try {
      setLoading(true);
      const coords = await fetchLocationIfAllowed();
      const captured = await cameraRef.current.takePictureAsync({ flash });
      onPhotoSelected({ uri: captured.uri, coords });
    } catch (e) {
      console.warn('Take picture failed', e);
    } finally {
      setLoading(false);
    }
  }

  if (!permission) return <View />;
  if (!permission.granted)
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant camera permission" />
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.cameraPreviewWrapper}>
        <View style={styles.cameraPreview}>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} flash={flash} />
        </View>
      </View>
      {/* Flash toggle outside the preview (top-right of the container) */}
      <TouchableOpacity
        style={{ position: 'absolute', top: 12, right: 12, backgroundColor: '#2e8b57', padding: 8, borderRadius: 8, zIndex: 20 }}
        onPress={() => setFlash(f => (f === 'off' ? 'on' : 'off'))}
      >
        <Text style={styles.actionText}>{flash === 'on' ? 'Flash On' : 'Flash Off'}</Text>
      </TouchableOpacity>
      {/* Bottom action row (left/right) - shutter is centered separately */}
      <View style={[styles.buttonRow, { justifyContent: 'space-between', paddingHorizontal: 40 }]}> 
        <TouchableOpacity style={styles.actionBtn} onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
          <Text style={styles.actionText}>Flip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={pickImageFromGallery}>
          <Text style={styles.actionText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Centered shutter button */}
      <TouchableOpacity
        style={[styles.shutterButton, { position: 'absolute', bottom: 40, left: '50%', marginLeft: -30 }, loading && { backgroundColor: '#999' }]}
        onPress={takePicture}
        disabled={loading}
      />
    </View>
  );
}
