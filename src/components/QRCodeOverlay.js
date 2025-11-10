import React from 'react';
import { View } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import QRCode from 'react-native-qrcode-svg';
import styles from '../styles/styles';

export default function QRCodeOverlay({ pos, size, color, value, onGestureEvent, onHandlerStateChange }) {
  return (
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
        <QRCode value={value} size={size} color={color} backgroundColor="transparent" />
      </View>
    </PanGestureHandler>
  );
}
