import React, { useRef, useState, useEffect } from 'react';
import { View, Image, Text, TouchableOpacity, Alert, TextInput, FlatList, ActivityIndicator } from 'react-native';
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
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [lastError, setLastError] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

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
    // prefer a user-selected location; fall back to photo coords
    const c = selectedLocation || coords;
    return c && c.latitude
      ? `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`
      : '';
  }

  async function searchPlaces(q) {
    if (!q || q.length < 2) {
      setSuggestions([]);
      setLastError(null);
      return;
    }
    setSearching(true);
    setLastError(null);
    try {
      // Primary: Photon (works well from web and native)
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`;
      const pres = await fetch(photonUrl);
      if (pres.ok) {
        const pjson = await pres.json();
        const features = pjson && pjson.features ? pjson.features : [];
        if (features.length > 0) {
          const mapped = features.map(f => {
            const props = f.properties || {};
            const title = props.name || props.street || props.osm_key || props.city || props.country || props.state || props.type || 'Unknown';
            const subtitleParts = [];
            if (props.city && props.city !== title) subtitleParts.push(props.city);
            if (props.state) subtitleParts.push(props.state);
            if (props.country) subtitleParts.push(props.country);
            const subtitle = subtitleParts.join(', ');
            return {
              id: `${f.properties.osm_type || 'ph'}_${f.properties.osm_id || f.properties.osm_id}`,
              display_name: props.name ? `${props.name}${subtitle ? ', ' + subtitle : ''}` : (f.properties.osm_key || subtitle),
              title,
              subtitle,
              lat: String(f.geometry.coordinates[1]),
              lon: String(f.geometry.coordinates[0])
            };
          });
          setSuggestions(mapped);
          setSearching(false);
          return;
        }
      }

      // Fallback: try Nominatim if Photon returns nothing or errors
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'QR-Code-Camera/1.0 (youremail@example.com)' } });
      if (!res.ok) throw new Error(`Nominatim ${res.status}`);
      const json = await res.json();
      if (json && json.length > 0) {
        const mapped = json.map((it, idx) => ({
          id: it.place_id ? String(it.place_id) : `nomin_${idx}`,
          display_name: it.display_name,
          title: it.display_name ? it.display_name.split(',')[0] : it.type || 'Unknown',
          subtitle: it.display_name ? it.display_name.split(',').slice(1).join(', ') : '',
          lat: String(it.lat),
          lon: String(it.lon)
        }));
        setSuggestions(mapped);
        setSearching(false);
        return;
      }

      setSuggestions([]);
      setLastError('No results found');
    } catch (e) {
      console.warn('Search failed', e);
      setSuggestions([]);
      setLastError(String(e));
    } finally {
      setSearching(false);
    }
  }

  function onQueryChange(text) {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchPlaces(text), 350);
    // if user edits after selecting a place, clear the selection
    if (selectedLocation && text !== selectedLocation.display_name) {
      setSelectedLocation(null);
    }
  }

  function selectPlace(item) {
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
      {/* Search bar + suggestions */}
      <View style={{ width: IMAGE_WIDTH, padding: 8 }}>
        <TextInput
          placeholder="Search place (like Google Maps)"
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
                keyExtractor={item => item.id || `${item.lat}_${item.lon}`}
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

        {selectedLocation ? (
          <Text style={{ color: '#fff', marginTop: 6 }}>Selected: {selectedLocation.display_name}</Text>
        ) : null}
      </View>
      <View ref={viewShotRef} collapsable={false} style={styles.compositePreview}>
        <Image source={{ uri: photo.uri }} style={styles.previewImage} />
        {/* Selected location badge on top of image */}
        {selectedLocation ? (
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 6 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', maxWidth: 220 }} numberOfLines={2}>
              {selectedLocation.display_name}
            </Text>
            <Text style={{ color: '#ddd', fontSize: 11 }}>
              {selectedLocation.latitude.toFixed(6)},{' '}
              {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
        ) : null}
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
