// PreviewComponent: Shows the captured image with a draggable QR code overlay.
// Lets the user search/select a place, size/color the QR, and save a flattened image to gallery.
import React, { useRef, useState, useEffect } from 'react';
import { View, Image, Text, TouchableOpacity, Alert, TextInput, FlatList, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { State } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import styles, { IMAGE_WIDTH, IMAGE_HEIGHT, MIN_QR_SIZE, MAX_QR_SIZE, DEFAULT_QR_SIZE, DEFAULT_QR_COLOR } from '../styles/styles';
import QRCodeOverlay from './QRCodeOverlay';

export default function PreviewComponent({ photo, onClose }) {
  // Ref to the composite view for snapshotting (react-native-view-shot)
  const viewShotRef = useRef();
  // Tracks the last committed QR position so drag deltas can be applied smoothly
  const qrLast = useRef({ x: 210, y: 370 });

  // QR overlay state
  const [qrPos, setQrPos] = useState({ x: qrLast.current.x, y: qrLast.current.y });
  const [qrSize, setQrSize] = useState(DEFAULT_QR_SIZE);
  const [qrColor, setQrColor] = useState(DEFAULT_QR_COLOR);
  // Save operation loading flag
  const [loading, setLoading] = useState(false);
  // Place search state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [lastError, setLastError] = useState(null);
  // Debounce timer for search queries
  const searchTimer = useRef(null);

  useEffect(() => {
    // Cleanup pending search timeout when component unmounts
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  function onDragGesture(evt) {
    // Drag handler for QR overlay: update position while dragging, then commit on END.
    if (evt.nativeEvent.state === State.ACTIVE) {
      let x = qrLast.current.x + evt.nativeEvent.translationX;
      let y = qrLast.current.y + evt.nativeEvent.translationY;
      // Constrain QR within image bounds based on current size
      x = Math.max(0, Math.min(x, IMAGE_WIDTH - qrSize));
      y = Math.max(0, Math.min(y, IMAGE_HEIGHT - qrSize));
      setQrPos({ x, y });
    }
    if (evt.nativeEvent.state === State.END || evt.nativeEvent.state === State.CANCELLED) {
      let x = qrLast.current.x + evt.nativeEvent.translationX;
      let y = qrLast.current.y + evt.nativeEvent.translationY;
      x = Math.max(0, Math.min(x, IMAGE_WIDTH - qrSize));
      y = Math.max(0, Math.min(y, IMAGE_HEIGHT - qrSize));
      // Persist the new position as the "last" baseline
      qrLast.current.x = x;
      qrLast.current.y = y;
      setQrPos({ x, y });
    }
  }

  function onQRSizeChange(newSize) {
    // Update QR size and ensure the QR remains within bounds at its last position
    const x = Math.max(0, Math.min(qrLast.current.x, IMAGE_WIDTH - newSize));
    const y = Math.max(0, Math.min(qrLast.current.y, IMAGE_HEIGHT - newSize));
    setQrPos({ x, y });
    qrLast.current.x = x;
    qrLast.current.y = y;
    setQrSize(newSize);
  }

  function getMapURL(coords) {
    // Build a Google Maps search URL from coordinates.
    // Prefer a user-selected location; fall back to photo coords from capture.
    const c = selectedLocation || coords;
    return c && c.latitude
      ? `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`
      : '';
  }

  async function searchPlaces(q) {
    // Debounced place search using Photon API.
    // Maps results to a compact structure with stable ids.
    if (!q || q.length < 2) {
      setSuggestions([]);
      setLastError(null);
      return;
    }
    setSearching(true);
    setLastError(null);
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`;
      const res = await fetch(photonUrl);
      if (!res.ok) throw new Error(`Photon ${res.status}`);
      const json = await res.json();
      const features = json && json.features ? json.features : [];
      if (!features || features.length === 0) {
        setSuggestions([]);
        setLastError('No results found');
        return;
      }

      const mapped = features.map((f, idx) => {
        const props = f.properties || {};
        const title = props.name || props.street || props.osm_key || props.city || props.country || props.state || props.type || 'Unknown';
        const subtitleParts = [];
        if (props.city && props.city !== title) subtitleParts.push(props.city);
        if (props.state) subtitleParts.push(props.state);
        if (props.country) subtitleParts.push(props.country);
        const subtitle = subtitleParts.join(', ');
        const lat = f.geometry && f.geometry.coordinates ? String(f.geometry.coordinates[1]) : '';
        const lon = f.geometry && f.geometry.coordinates ? String(f.geometry.coordinates[0]) : '';
        // Build a stable, unique id using available osm id/type and fallback to index+coords
        const osmId = props.osm_id || props.osmID || '';
        const osmType = props.osm_type || props.osmType || 'ph';
        const id = osmId ? `${osmType}_${osmId}` : `${osmType}_${idx}_${lat}_${lon}`;
        return {
          id,
          display_name: props.name ? `${props.name}${subtitle ? ', ' + subtitle : ''}` : (props.osm_key || subtitle),
          title,
          subtitle,
          lat,
          lon
        };
      });

      setSuggestions(mapped);
    } catch (e) {
      console.warn('Search failed', e);
      setSuggestions([]);
      setLastError(String(e));
    } finally {
      setSearching(false);
    }
  }

  function onQueryChange(text) {
    // Update the query and debounce the search request.
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchPlaces(text), 350);
    // if user edits after selecting a place, clear the selection
    if (selectedLocation && text !== selectedLocation.display_name) {
      setSelectedLocation(null);
    }
  }

  function selectPlace(item) {
    // When a suggestion is tapped, persist its coords and reflect the display name in the search bar
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      setSelectedLocation({ latitude: lat, longitude: lon, display_name: item.display_name });
      // update suggestions and query
      setSuggestions([]);
      setQuery(item.display_name);
    }
  }

  function resetQR() {
    // Restore QR position/size/color to defaults
    setQrPos({ x: 210, y: 370 });
    qrLast.current = { x: 210, y: 370 };
    setQrSize(DEFAULT_QR_SIZE);
    setQrColor(DEFAULT_QR_COLOR);
  }

  async function captureAndSave() {
    // Flatten the image + QR overlay into a single bitmap and save to the gallery.
    // Asks for media library permission when needed.
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
      {/* Search bar + suggestions */}
      <View style={{ width: IMAGE_WIDTH, padding: 8 }}>
        <TextInput
          // Place search input; submit triggers immediate search, typing is debounced
          placeholder="Search place"
          placeholderTextColor="#ccc"
          value={query}
          onChangeText={onQueryChange}
          onSubmitEditing={() => searchPlaces(query)}
          style={{ backgroundColor: '#222', color: '#fff', padding: 8, borderRadius: 6 }}
        />
        {searching ? (
          <View style={{ padding: 8 }}>
            <ActivityIndicator size="small" color="#38C172" />
          </View>
        ) : null}
        {/* Suggestions overlay: absolute and top-most */}
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: 54, left: '50%', transform: [{ translateX: -(IMAGE_WIDTH / 2) }], width: IMAGE_WIDTH - 16, zIndex: 9999, elevation: 20 }}
        >
          {suggestions && suggestions.length > 0 ? (
            <View style={{ backgroundColor: '#111', borderRadius: 6, overflow: 'hidden' }}>
              <FlatList
                data={suggestions}
                keyExtractor={(item, index) => {
                  // Combine a stable id with index to avoid collisions when API returns duplicates
                  const base = item.id || `${item.lat}_${item.lon}`;
                  return `${base}-${index}`;
                }}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => selectPlace(item)} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#222' }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{item.title || item.display_name}</Text>
                    {item.subtitle ? <Text style={{ color: '#ccc', fontSize: 12 }}>{item.subtitle}</Text> : null}
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : null}

          {/* Show error/no-results only when user hasn't selected this exact query */}
          {!searching && query && query.length >= 2 && suggestions && suggestions.length === 0 && (!selectedLocation || query !== selectedLocation.display_name) ? (
            <View style={{ backgroundColor: '#111', padding: 12, borderRadius: 6 }}>
              <Text style={{ color: '#fff', opacity: 0.9 }}>{lastError || 'No results'}</Text>
            </View>
          ) : null}
        </View>

        {/* selectedLocation label intentionally hidden from the stamped image UI */}
      </View>
      <View ref={viewShotRef} collapsable={false} style={styles.compositePreview}>
        {/* Base image (from CameraComponent) plus a draggable QR overlay that encodes a map URL */}
        <Image source={{ uri: photo.uri }} style={styles.previewImage} />
        {/* Selected location badge removed — QR will still encode the selected coords but no text will be stamped on the photo */}
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
        {/* Quick color presets for the QR overlay */}
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
