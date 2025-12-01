# QR-Code-Camera — Technologies Used

This app is built with the Expo/React Native ecosystem to capture photos, overlay a draggable QR code that encodes a map URL, and save the result to the device gallery.

## Core stack
- React Native (0.81) and React (19): UI components and app logic
- Expo (SDK 54): Development runtime and tooling
- Safe Area Context + Gesture Handler: Safe rendering on notched devices and touch gestures

## Camera & media
- expo-camera: Camera access, photo capture, flash control
- expo-image-picker: Pick images from the device gallery
- expo-media-library: Save flattened (captured) images to the gallery

## Location & search
- expo-location: Request permission and read current coordinates
- Photon geocoding API (komoot): Lightweight place search via fetch

## QR & graphics
- react-native-qrcode-svg + react-native-svg: Render QR code overlay with configurable size and color
- react-native-view-shot: Capture/flatten the composed view (photo + QR) into a single image

## Styling & layout
- React Native StyleSheet: Centralized styles in `src/styles/styles.js`
- Safe area and layout helpers in `App.js` and component-level styles

## Project structure
- `App.js`: App shell switching between camera and preview screens
- `src/components/CameraComponent.js`: Camera UI, flash, facing toggle, gallery import
- `src/components/PreviewComponent.js`: QR placement, size/color controls, place search, save
- `src/components/QRCodeOverlay.js`: Draggable QR overlay component
- `src/styles/styles.js`: Style constants and shared styles

## AI Assistance
This README and technology summary were authored with assistance from GitHub Copilot AI.

