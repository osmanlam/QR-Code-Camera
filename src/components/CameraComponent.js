// CameraComponent: Handles camera preview, taking photos, picking from gallery,
// and optionally attaching current location to the selected image.
// Uses Expo modules (expo-camera, expo-image-picker, expo-location).
import React, { useRef, useState } from 'react';
import { View, Text, Button, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import styles, { DEFAULT_FLASH } from '../styles/styles';

// Props
// - onPhotoSelected: function({ uri: string, coords: { latitude, longitude } | null })
//   Called whenever the user picks an image from gallery or takes a photo.

export default function CameraComponent({ onPhotoSelected }) {
  // Ref to interact with the CameraView instance (imperative methods like takePictureAsync)
  const cameraRef = useRef(null);
  // Which camera to use: 'back' or 'front'
  const [facing, setFacing] = useState('back');
  // Flash mode: 'on' or 'off' (DEFAULT_FLASH comes from styles)
  const [flash, setFlash] = useState(DEFAULT_FLASH);
  // Loading state while a photo capture is in progress
  const [loading, setLoading] = useState(false);

  // Camera permission state and a function to request permission
  const [permission, requestPermission] = useCameraPermissions();

  // Attempt to fetch device location if the user grants Location permission.
  // Returns position coords or null if denied or if an error occurs.
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

  // Open the image picker to select a photo from the gallery.
  // If a photo is selected, optionally include current coords when available.
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

  // Capture a photo from the camera preview.
  // Uses the current flash setting and attaches coords when available.
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

  // Render placeholders or permission request UI while camera permission state is loading or not granted.
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
          {/* Live camera preview. "facing" controls front/back camera; "flash" sets capture flash mode. */}
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} flash={flash} />
        </View>
      </View>
      {/* Flash toggle outside the preview (top-right of the container). */}
      <TouchableOpacity
        style={{ position: 'absolute', top: 12, right: 12, backgroundColor: '#2e8b57', padding: 8, borderRadius: 8, zIndex: 20 }}
        onPress={() => setFlash(f => (f === 'off' ? 'on' : 'off'))}
      >
        <Text style={styles.actionText}>{flash === 'on' ? 'Flash On' : 'Flash Off'}</Text>
      </TouchableOpacity>
      {/* Bottom action row (left/right). Shutter button is centered separately. */}
      <View style={[styles.buttonRow, { justifyContent: 'space-between', paddingHorizontal: 40 }]}> 
        {/* Flip between front and back cameras */}
        <TouchableOpacity style={styles.actionBtn} onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
          <Text style={styles.actionText}>Flip</Text>
        </TouchableOpacity>
        {/* Pick an image from the device gallery */}
        <TouchableOpacity style={styles.actionBtn} onPress={pickImageFromGallery}>
          <Text style={styles.actionText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Centered shutter button. Disabled and greyed while loading to prevent duplicate captures. */}
      <TouchableOpacity
        style={[styles.shutterButton, { position: 'absolute', bottom: 40, left: '50%', marginLeft: -30 }, loading && { backgroundColor: '#999' }]}
        onPress={takePicture}
        disabled={loading}
      />
    </View>
  );
}
