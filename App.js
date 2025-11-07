import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Button, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';

export default function App() {
  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  const [photo, setPhoto] = useState(null); // {uri, coords}
  const [location, setLocation] = useState(null);
  const [stampedURI, setStampedURI] = useState(null);
  const [loading, setLoading] = useState(false);

  const viewShotRef = useRef();

  // Toggle between front/back camera
  function toggleCameraFacing() {
    setFacing(cur => (cur === 'back' ? 'front' : 'back'));
  }

  // Toggle flash state
  function toggleFlash() {
    setFlash(cur => (cur === 'off' ? 'on' : 'off'));
  }

  // Pick an image from gallery
  async function pickImageFromGallery() {
    if (!mediaPermission?.granted) await requestMediaPermission();
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (!result.canceled && result.assets.length > 0) {
      // On gallery pick, fetch location for QR
      let coords = await fetchLocation();
      setPhoto({ uri: result.assets[0].uri, coords });
      setStampedURI(null);
    }
  }

  // Capture image from camera and fetch location
  async function takePicture() {
    if (cameraRef.current) {
      try {
        setLoading(true);
        let coords = await fetchLocation();
        const capturedPhoto = await cameraRef.current.takePictureAsync({ flash });
        setPhoto({ uri: capturedPhoto.uri, coords });
        setStampedURI(null);
      } catch (e) {
        alert('Error: ' + e);
      }
      setLoading(false);
    }
  }

  async function fetchLocation() {
    if (!locationPermission?.granted) await requestLocationPermission();
    const res = await Location.getCurrentPositionAsync({});
    setLocation(res.coords);
    return res.coords;
  }

  function getMapURL(coords) {
    return coords
      ? `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`
      : '';
  }

  function renderQRCode() {
    if (!photo?.coords) return null;
    return (
      <View style={styles.qrContainer}>
        <QRCode value={getMapURL(photo.coords)} size={100} color="#000" backgroundColor="white" />
      </View>
    );
  }

  // Save stamped (flattened) image
  async function captureAndSave() {
    if (viewShotRef.current && mediaPermission?.granted && photo) {
      try {
        setLoading(true);
        const uri = await captureRef(viewShotRef, { format: 'jpg', quality: 0.9 });
        setStampedURI(uri);
        await MediaLibrary.createAssetAsync(uri);
        setLoading(false);
        alert('Flattened image saved to gallery!');
      } catch (e) {
        setLoading(false);
        alert('Save failed: ' + e);
      }
    } else {
      requestMediaPermission();
    }
  }

  // Permissions UI
  if (!permission) return <View />;
  if (!permission.granted)
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant camera permission" />
      </View>
    );
  if (!locationPermission)
    return <View />;
  if (!locationPermission.granted)
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to fetch your GPS location</Text>
        <Button onPress={requestLocationPermission} title="Grant location permission" />
      </View>
    );

  return (
    <View style={styles.container}>
      {!photo ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} flash={flash} />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={toggleCameraFacing}>
              <Text style={styles.actionText}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={toggleFlash}>
              <Text style={styles.actionText}>{flash === 'on' ? 'Flash On' : 'Flash Off'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shutterButton, loading && { backgroundColor: '#999' }]}
              onPress={takePicture}
              disabled={loading}
            />
            <TouchableOpacity style={styles.actionBtn} onPress={pickImageFromGallery}>
              <Text style={styles.actionText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.preview}>
          {/* "viewShotRef" wraps photo+QR for flatten&save */}
          <View ref={viewShotRef} collapsable={false} style={styles.compositePreview}>
            <Image source={{ uri: photo.uri }} style={styles.previewImage} />
            {renderQRCode()}
          </View>
          <View style={styles.saveRow}>
            <TouchableOpacity style={styles.saveButton} onPress={captureAndSave} disabled={loading}>
              <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save Stamped'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setPhoto(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {stampedURI && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ color: 'white' }}>Stamped image preview:</Text>
              <Image source={{ uri: stampedURI }} style={styles.previewImageSmall} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#222' },
  message: { textAlign: 'center', paddingBottom: 15, color: 'white', fontSize: 16 },
  camera: { flex: 1 },
  buttonRow: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  actionBtn: {
    backgroundColor: '#2e8b57',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  actionText: { fontSize: 13, color: 'white', fontWeight: 'bold' },
  shutterButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    alignSelf: 'center'
  },
  preview: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  compositePreview: { width: 320, height: 500, alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: 320, height: 500, resizeMode: 'contain', borderRadius: 10 },
  qrContainer: { position: 'absolute', bottom: 20, right: 20, backgroundColor: 'white', padding: 5, borderRadius: 8, elevation: 10 },
  saveRow: { flexDirection: 'row', marginTop: 24, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: '#38C172', padding: 12, borderRadius: 8, marginRight: 20 },
  saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { backgroundColor: '#e85d04', padding: 12, borderRadius: 8 },
  cancelText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  previewImageSmall: { width: 120, height: 180, marginTop: 8, borderRadius: 8 }
});
