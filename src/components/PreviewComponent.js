import React, { useRef, useState } from 'react';
import { View, Image, Text, TouchableOpacity, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { State } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import styles, { IMAGE_WIDTH, IMAGE_HEIGHT, MIN_QR_SIZE, MAX_QR_SIZE, DEFAULT_QR_SIZE, DEFAULT_QR_COLOR } from '../styles/styles';
import QRCodeOverlay from './QRCodeOverlay';

export default function PreviewComponent({ photo, onClose }) {
  const viewShotRef = useRef();
  const qrLast = useRef({ x: 210, y: 370 });

  const [qrPos, setQrPos] = useState({ x: qrLast.current.x, y: qrLast.current.y });
  const [qrSize, setQrSize] = useState(DEFAULT_QR_SIZE);
  const [qrColor, setQrColor] = useState(DEFAULT_QR_COLOR);
  const [loading, setLoading] = useState(false);

  function onDragGesture(evt) {
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
  }

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
    setQrColor(DEFAULT_QR_COLOR);
  }

  async function captureAndSave() {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission', 'Need permission to save to gallery');
        return;
      }
      setLoading(true);
      const uri = await captureRef(viewShotRef, { format: 'jpg', quality: 0.9 });
      await MediaLibrary.createAssetAsync(uri);
      setLoading(false);
      Alert.alert('Saved', 'Flattened image saved to gallery!');
      onClose();
    } catch (e) {
      setLoading(false);
      Alert.alert('Save failed', String(e));
    }
  }

  return (
    <View style={styles.preview}>
      <View ref={viewShotRef} collapsable={false} style={styles.compositePreview}>
        <Image source={{ uri: photo.uri }} style={styles.previewImage} />
        <QRCodeOverlay
          pos={qrPos}
          size={qrSize}
          color={qrColor}
          value={getMapURL(photo.coords)}
          onGestureEvent={onDragGesture}
          onHandlerStateChange={onDragGesture}
        />
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

      <View style={styles.colorRow}>
        {['#000', '#2e8b57', '#e85d04', '#005af0', '#222', '#ff0000', '#edff21'].map(preset => (
          <TouchableOpacity
            key={preset}
            style={[styles.colorPresetCircle, { backgroundColor: preset, borderWidth: preset === qrColor ? 2 : 0 }]}
            onPress={() => setQrColor(preset)}
          />
        ))}
      </View>

      <View style={styles.saveRow}>
        <TouchableOpacity style={styles.saveButton} onPress={captureAndSave} disabled={loading}>
          <Text style={styles.saveText}>{loading ? 'Saving...' : 'Save Stamped'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
