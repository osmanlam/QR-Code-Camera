import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

export default function App() {
  // Use string fallback instead of CameraType.back
  const [facing, setFacing] = useState('back'); // 'front' or 'back'

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [photo, setPhoto] = useState(null);

  // For saving to gallery permission
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  // Toggle between front/back camera
  function toggleCameraFacing() {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }

  // Take a photo
  async function takePicture() {
    if (cameraRef.current) {
      try {
        const capturedPhoto = await cameraRef.current.takePictureAsync();
        setPhoto(capturedPhoto.uri);
      } catch (e) {
        alert('Error taking photo: ' + e);
      }
    }
  }

  // Save photo to gallery
  async function savePhoto() {
    if (photo && mediaPermission?.granted) {
      await MediaLibrary.createAssetAsync(photo);
      alert('Saved to gallery!');
      setPhoto(null);
    } else {
      requestMediaPermission();
    }
  }

  // Permission checks and prompts
  if (!permission) {
    // Loading permission
    return <View />;
  }
  if (!permission.granted) {
    // Permission denied
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant permission" />
      </View>
    );
  }

  // Main UI
  return (
    <View style={styles.container}>
      {!photo ? (
        <>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
              <Text style={styles.text}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shutterButton} onPress={takePicture} />
          </View>
        </>
      ) : (
        <View style={styles.preview}>
          <Image source={{ uri: photo }} style={styles.previewImage} />
          <View style={styles.saveRow}>
            <TouchableOpacity style={styles.saveButton} onPress={savePhoto}>
              <Text style={styles.saveText}>Save to Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setPhoto(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
  previewImage: {
    width: '90%',
    height: '75%',
    resizeMode: 'contain'
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
  }
});
