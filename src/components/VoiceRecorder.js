// src/components/VoiceRecorder.js
// Voice input for journal entries
// Records audio -> uploads to backend -> returns download URL
//
// Install:
//   expo install expo-av
//
// Usage:
//   <VoiceRecorder userId={userId} onRecordingComplete={({ url, localUri }) => {}} />

import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Audio } from "expo-av";
import NetInfo from "@react-native-community/netinfo";
import * as FileSystem from "expo-file-system/legacy";
import theme from "../theme";
import { authorizedFetch } from "../services/authSession";

const { colors, spacing, typography } = theme;
const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://the-quiet-space-backend.onrender.com";

const confirmPermission = (message) =>
  new Promise((resolve) => {
    Alert.alert("Before you continue", message, [
      { text: "Not now", style: "cancel", onPress: () => resolve(false) },
      { text: "Continue", onPress: () => resolve(true) },
    ]);
  });

const VoiceRecorder = ({ onRecordingComplete, userId }) => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [savedOffline, setSavedOffline] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    let loop;
    if (isRecording) {
      loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulse, {
              toValue: 1.25,
              duration: 800,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulse, {
              toValue: 1,
              duration: 800,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0.15,
              duration: 800,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.6,
              duration: 800,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      loop.start();
    } else {
      pulse.setValue(1);
      pulseOpacity.setValue(0.6);
    }

    return () => {
      if (loop) loop.stop();
    };
  }, [isRecording, pulse, pulseOpacity]);

  const startRecording = async () => {
    try {
      if (AppState.currentState !== "active") {
        Alert.alert(
          "Recording not ready",
          "Please return to the app and try recording again."
        );
        return;
      }

      const permission = await Audio.getPermissionsAsync();
      if (!permission.granted) {
        const allow = await confirmPermission(
          "We use your microphone so you can record voice journal entries."
        );
        if (!allow) return;
      }

      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      await new Promise((resolve) => setTimeout(resolve, 250));

      if (AppState.currentState !== "active") {
        Alert.alert(
          "Recording not ready",
          "Please keep the app open while we start the microphone."
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setSavedOffline(false);
    } catch (_err) {
      console.error("Failed to start recording:", _err);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordedUri(uri);
      setRecording(null);
      await handleRecording(uri);
    } catch (_err) {
      console.error("Failed to stop recording:", _err);
    }
  };

  const cacheRecording = async (uri) => {
    const folder = `${FileSystem.documentDirectory}voice-cache/`;
    const dirInfo = await FileSystem.getInfoAsync(folder);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
    }
    const filename = `voice_${Date.now()}.m4a`;
    const dest = `${folder}${filename}`;
    await FileSystem.moveAsync({ from: uri, to: dest });
    return dest;
  };

  const handleRecording = async (uri) => {
    const network = await NetInfo.fetch();
    const isOnline = !!network.isConnected;

    if (!isOnline) {
      try {
        const localUri = await cacheRecording(uri);
        setRecordedUri(localUri);
        setSavedOffline(true);
        onRecordingComplete({ url: null, localUri });
        return;
      } catch (_err) {
        console.error("Failed to cache recording:", _err);
        return;
      }
    }

    try {
      await uploadRecording(uri);
      setSavedOffline(false);
    } catch (_err) {
      try {
        const localUri = await cacheRecording(uri);
        setRecordedUri(localUri);
        setSavedOffline(true);
        onRecordingComplete({ url: null, localUri });
      } catch (cacheErr) {
        console.error("Failed to cache recording:", cacheErr);
      }
    }
  };

  const uploadRecording = async (uri) => {
    try {
      setUploading(true);
      const filename = `voice_${Date.now()}.m4a`;
      const formData = new FormData();

      formData.append("file", {
        uri,
        name: filename,
        type: "audio/m4a",
      });

      if (userId) {
        formData.append("userId", userId);
      }

      const response = await authorizedFetch(`${API_URL}/uploads/voice`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || data?.error || "Upload failed");
      }

      onRecordingComplete({ url: data.url, localUri: null });
    } catch (_err) {
      console.error("Upload failed:", _err);
      throw _err;
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={isRecording ? stopRecording : startRecording}
        style={[styles.btn, isRecording && styles.btnRecording]}
        activeOpacity={0.8}
        disabled={uploading}
      >
        {isRecording && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                opacity: pulseOpacity,
                transform: [{ scale: pulse }],
              },
            ]}
          />
        )}
        {uploading ? (
          <ActivityIndicator color={colors.textInverse} size="small" />
        ) : (
          <View style={[styles.dot, isRecording && styles.dotRecording]} />
        )}
      </TouchableOpacity>

      <Text style={styles.label}>
        {uploading
          ? "Uploading..."
          : isRecording
          ? "Tap to stop"
          : savedOffline
          ? "Saved offline"
          : recordedUri
          ? "Recording saved"
          : "Tap to record"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  btn: {
    width: 64,
    height: 64,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.primaryLight,
    overflow: 'visible',
  },
  btnRecording: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  pulseRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.textInverse,
  },
  dotRecording: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  label: {
    ...typography.presets.caption,
    color: colors.textSecondary,
  },
});

export default VoiceRecorder;
