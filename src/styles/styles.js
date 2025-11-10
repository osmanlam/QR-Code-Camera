import { StyleSheet } from 'react-native';

export const IMAGE_WIDTH = 320;
export const IMAGE_HEIGHT = 500;
export const MIN_QR_SIZE = 40;
export const MAX_QR_SIZE = 180;
export const DEFAULT_QR_SIZE = 90;
export const DEFAULT_QR_COLOR = '#000';
export const DEFAULT_FLASH = 'off';

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
    marginTop: 14,
    marginBottom: 7
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: -6
  },
  colorPresetCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 6,
    marginVertical: 2,
    borderColor: '#fff'
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
    padding: 0,
    borderRadius: 8,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  saveRow: { flexDirection: 'row', marginTop: 16, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: '#38C172', padding: 12, borderRadius: 8, marginRight: 20 },
  saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { backgroundColor: '#e85d04', padding: 12, borderRadius: 8 },
  cancelText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default styles;
