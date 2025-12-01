// QRCodeOverlay: Renders a draggable QR code over the base image.
// Delegates gesture handling to parent via PanGestureHandler callbacks.
import React from 'react';
import { View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import QRCode from 'react-native-qrcode-svg';
import styles from '../styles/styles';

// Props
// - pos: { x: number, y: number } position within the image canvas
// - size: number (pixels)
// - color: string (hex) foreground color of the QR modules
// - value: string content to encode (e.g., a URL)
// - onGestureEvent: function passed to PanGestureHandler for continuous updates
// - onHandlerStateChange: function passed to PanGestureHandler for START/END state changes
export default function QRCodeOverlay({ pos, size, color, value, onGestureEvent, onHandlerStateChange }) {
  return (
    // PanGestureHandler wraps the QR to allow dragging; parent computes constrained positions
    <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
      <View
        style={[
          styles.qrContainerInImage,
          {
            left: pos.x,
            top: pos.y,
            width: size,
            height: size,
          },
        ]}
      >
        {/* Transparent background so underlying photo remains visible */}
        <QRCode value={value} size={size} color={color} backgroundColor="transparent" />
      </View>
    </PanGestureHandler>
  );
}
