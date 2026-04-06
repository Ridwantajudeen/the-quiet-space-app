import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';

import Button from './Button';
import { Caption } from './Typography';
import theme from '../theme';

const { colors, spacing } = theme;

const formatClock = (ms) => {
  if (!ms) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const VoicePlayer = ({ url }) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const updateStatus = (status) => {
    if (!status.isLoaded) return;
    if (!isSeeking) {
      setPositionMs(status.positionMillis || 0);
    }
    setDurationMs(status.durationMillis || 0);
    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    try {
      setIsLoading(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (sound) {
        const status = await sound.getStatusAsync();
        updateStatus(status);
        if (status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else if (status.didJustFinish || (status.positionMillis || 0) >= (status.durationMillis || 0)) {
          await sound.replayAsync();
          setIsPlaying(true);
        } else {
          await sound.setVolumeAsync(1.0);
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, volume: 1.0 },
          updateStatus
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Playback error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const seekBy = async (deltaMs) => {
    if (!sound) return;
    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;
      const next = Math.max(0, Math.min((status.durationMillis || 0), (status.positionMillis || 0) + deltaMs));
      await sound.setPositionAsync(next);
      setPositionMs(next);
    } catch (err) {
      console.error('Seek error:', err);
    }
  };

  const handleSlidingStart = () => {
    setIsSeeking(true);
  };

  const handleSlidingComplete = async (value) => {
    if (!sound) return;
    try {
      await sound.setPositionAsync(value);
      setPositionMs(value);
    } catch (err) {
      console.error('Seek error:', err);
    } finally {
      setIsSeeking(false);
    }
  };

  return (
    <View style={styles.voiceControls}>
      <View style={styles.controlsRow}>
        <Button variant="ghost" size="sm" onPress={() => seekBy(-10000)}>
          -10s
        </Button>
        <Button variant="outline" size="sm" onPress={togglePlay} loading={isLoading}>
          {isPlaying ? 'Pause voice' : 'Play voice'}
        </Button>
        <Button variant="ghost" size="sm" onPress={() => seekBy(10000)}>
          +10s
        </Button>
      </View>
      <View style={styles.scrubRow}>
        <Caption style={styles.timeText}>{formatClock(positionMs)}</Caption>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={durationMs || 1}
          value={positionMs}
          onSlidingStart={handleSlidingStart}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor={colors.primaryDark}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
        <Caption style={styles.timeText}>{formatClock(durationMs)}</Caption>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  voiceControls: {
    marginTop: spacing.xs,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  scrubRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slider: {
    flex: 1,
  },
  timeText: {
    color: colors.textMuted,
  },
});

export default VoicePlayer;
