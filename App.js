import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Button } from 'react-native';
import Slider from '@react-native-community/slider';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';
import { PanGestureHandler, GestureHandlerRootView, State } from 'react-native-gesture-handler';

const IMAGE_WIDTH = 320;
const IMAGE_HEIGHT = 500;
const MIN_QR_SIZE = 40;
const MAX_QR_SIZE = 180;
const DEFAULT_QR_SIZE = 90;

export default function App() {
  const cameraRef = useRef(null);
  const viewShotRef = useRef();

  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [photo, setPhoto] = useState(null); // {uri, coords}
  const [loading, setLoading] = useState(false);

  // QR code position and size
  const [qrPos, setQrPos] = useState({ x: 210, y: 370 });
  const [qrSize, setQrSize] = useState(DEFAULT_QR_SIZE);
  const qrLast = useRef({ x: 210, y: 370 });

  // Drag logic
  const onDragGesture = evt => {
    if (evt.nativeEvent.state === State.ACTIVE) {
      let x = qrLast.current.x + evt.nativeEvent.translationX;
      let y = qrLast.current.y + evt.nativeEvent.translationY;
      x = Math.max(0, Math.min(x, IMAGE_WIDTH - qrSize));
      y = Math.max(0, Math.min(y, IMAGE_HEIGHT - qrSize));
      setQrPos({ x, y });
    }
    if (evt.nativeEvent.state === State.END || evt.nativeEvent.state === State.CANCELLED) {
      let x = qrLast.current.x + evt.nativeEvent.translationX;
      let y = qrLast.current.y + evt.nativeEvent.translationY;
      x = Math.max(0, Math.min(x, IMAGE_WIDTH - qrSize));
      y = Math.max(0, Math.min(y, IMAGE_HEIGHT - qrSize));
      qrLast.current.x = x;
      qrLast.current.y = y;
      setQrPos({ x, y });
    }
  };

  // When slider changes, update QR size and clamp position if needed
  function onQRSizeChange(newSize) {
    const x = Math.max(0, Math.min(qrLast.current.x, IMAGE_WIDTH - newSize));
    const y = Math.max(0, Math.min(qrLast.current.y, IMAGE_HEIGHT - newSize));
    setQrPos({ x, y });
    qrLast.current.x = x;
    qrLast.current.y = y;
    setQrSize(newSize);
  }

  function getMapURL(coords) {
    return coords
      ? `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`
      : '';
  }

  function resetQR() {
    setQrPos({ x: 210, y: 370 });
    qrLast.current = { x: 210, y: 370 };
    setQrSize(DEFAULT_QR_SIZE);
  }

  async function pickImageFromGallery() {
    if (!mediaPermission?.granted) await requestMediaPermission();
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (!result.canceled && result.assets.length > 0) {
      let coords = await fetchLocation();
      setPhoto({ uri: result.assets[0].uri, coords });
      resetQR();
    }
  }

  async function takePicture() {
    if (cameraRef.current) {
      try {
        setLoading(true);
        let coords = await fetchLocation();
        const capturedPhoto = await cameraRef.current.takePictureAsync({ flash });
        setPhoto({ uri: capturedPhoto.uri, coords });
        resetQR();
      } catch (e) { alert('Error: ' + e); }
      setLoading(false);
    }
  }

  async function fetchLocation() {
    if (!locationPermission?.granted) await requestLocationPermission();
    const res = await Location.getCurrentPositionAsync({});
    return res.coords;
  }

  async function captureAndSave() {
    if (viewShotRef.current && mediaPermission?.granted && photo) {
      try {
        setLoading(true);
        const uri = await captureRef(viewShotRef, { format: 'jpg', quality: 0.9 });
        await MediaLibrary.createAssetAsync(uri);
        setLoading(false);
        alert('Flattened image saved to gallery!');
        setPhoto(null);
      } catch (e) {
        setLoading(false);
        alert('Save failed: ' + e);
      }
    } else {
      requestMediaPermission();
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
  if (!locationPermission) return <View />;
  if (!locationPermission.granted)
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to fetch your GPS location</Text>
        <Button onPress={requestLocationPermission} title="Grant location permission" />
      </View>
    );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {!photo ? (
          <>
            <CameraView ref={cameraRef} style={styles.camera} facing={facing} flash={flash} />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
                <Text style={styles.actionText}>Flip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}>
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
            <View ref={viewShotRef} collapsable={false} style={styles.compositePreview}>
              <Image source={{ uri: photo.uri }} style={styles.previewImage} />
              <PanGestureHandler onGestureEvent={onDragGesture}>
                <View
                  style={[
                    styles.qrContainerInImage,
                    {
                      left: qrPos.x,
                      top: qrPos.y,
                      width: qrSize,
                      height: qrSize,
                    },
                  ]}
                >
                  <QRCode
                    value={getMapURL(photo.coords)}
                    size={qrSize}
                    color="#000"
                    backgroundColor="white"
                  />
                </View>
              </PanGestureHandler>
            </View>
            <View style={styles.sliderRow}>
              <Text style={{ color: '#fff', marginRight: 10 }}>QR size</Text>
              <Slider
                style={{ width: 200 }}
                minimumValue={MIN_QR_SIZE}
                maximumValue={MAX_QR_SIZE}
                value={qrSize}
                step={1}
                onValueChange={onQRSizeChange}
                minimumTrackTintColor="#38C172"
                maximumTrackTintColor="#eee"
                thumbTintColor="#38C172"
              />
              <Text style={{ color: '#fff', marginLeft: 10 }}>{Math.round(qrSize)} px</Text>
            </View>
            <View style={styles.saveRow}>
              <TouchableOpacity style={styles.saveButton} onPress={captureAndSave} disabled={loading}>
                <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save Stamped'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setPhoto(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
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
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 16,
    marginBottom: 8
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
  compositePreview: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#333'
  },
  previewImage: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    resizeMode: 'cover',
    borderRadius: 10,
    position: 'absolute',
    top: 0,
    left: 0
  },
  qrContainerInImage: {
    position: 'absolute',
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 8,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  saveRow: { flexDirection: 'row', marginTop: 20, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: '#38C172', padding: 12, borderRadius: 8, marginRight: 20 },
  saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { backgroundColor: '#e85d04', padding: 12, borderRadius: 8 },
  cancelText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
