import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Button, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';

export default function App() {
  const [facing, setFacing] = useState('back');
  const cameraRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  const [location, setLocation] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [stampedURI, setStampedURI] = useState(null); // URI of image with QR code stamped

  const viewShotRef = useRef();

  // Fetch coordinates when taking photo
  async function fetchLocation() {
    if (!locationPermission?.granted) await requestLocationPermission();
    const res = await Location.getCurrentPositionAsync({});
    setLocation(res.coords);
    return res.coords;
  }

  function toggleCameraFacing() {
    setFacing(cur => (cur === 'back' ? 'front' : 'back'));
  }

  async function takePicture() {
    if (cameraRef.current) {
      try {
        const coords = await fetchLocation();
        const capturedPhoto = await cameraRef.current.takePictureAsync();
        setPhoto({ uri: capturedPhoto.uri, coords });
        // clear previous stamp and stampURI
        setStampedURI(null);
      } catch (e) {
        alert('Error: ' + e);
      }
    }
  }

  // Generate QR Code value (Google Maps link)
  function getMapURL(coords) {
    return coords
      ? `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`
      : '';
  }

  // Render QR code with the map link
  function renderQRCode() {
    if (!photo?.coords) return null;
    return (
      <View style={styles.qrContainer}>
        <QRCode
          value={getMapURL(photo.coords)}
          size={100}
          color="#000"
          backgroundColor="white"
        />
      </View>
    );
  }

  // Capture the preview with QR and save to gallery
  async function captureAndSave() {
    if (viewShotRef.current && mediaPermission?.granted && photo) {
      try {
        const uri = await captureRef(viewShotRef, { format: 'jpg', quality: 0.9 });
        setStampedURI(uri);
        await MediaLibrary.createAssetAsync(uri);
        alert('Stamped photo saved to gallery!');
      } catch (e) {
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

  // Main UI
  return (
    <View style={styles.container}>
      {!photo ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
              <Text style={styles.text}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shutterButton} onPress={takePicture} />
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
            <TouchableOpacity style={styles.saveButton} onPress={captureAndSave}>
              <Text style={styles.saveText}>Save Stamped</Text>
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

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222'
  },
  message: {
    textAlign: 'center',
    paddingBottom: 15,
    color: 'white',
    fontSize: 16
  },
  camera: {
    flex: 1
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 64,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    width: '100%',
    paddingHorizontal: 64,
    justifyContent: 'space-between'
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e8b57',
    padding: 12,
    borderRadius: 8
  },
  text: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold'
  },
  shutterButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignSelf: 'center'
  },
  preview: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  compositePreview: {
    width: 320,
    height: 500,
    alignItems: 'center',
    justifyContent: 'center'
  },
  previewImage: {
    width: 320,
    height: 500,
    resizeMode: 'contain',
    borderRadius: 10
  },
  qrContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 8,
    elevation: 10
  },
  saveRow: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveButton: {
    backgroundColor: '#38C172',
    padding: 12,
    borderRadius: 8,
    marginRight: 20
  },
  saveText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  cancelButton: {
    backgroundColor: '#e85d04',
    padding: 12,
    borderRadius: 8
  },
  cancelText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  previewImageSmall: {
    width: 120,
    height: 180,
    marginTop: 8,
    borderRadius: 8
  }
});
