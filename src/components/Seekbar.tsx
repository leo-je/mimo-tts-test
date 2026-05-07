import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {GestureResponderEvent} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {AppTheme} from '../theme/themes';

interface SeekbarProps {
  value: number;
  max: number;
  onSeek: (v: number) => void;
}

export default function Seekbar({value, max, onSeek}: SeekbarProps) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const ratio = max > 0 ? value / max : 0;

  function handleTouch(e: GestureResponderEvent) {
    const x = Math.max(0, Math.min(e.nativeEvent.locationX, trackWidth));
    const newPos = (x / trackWidth) * max;
    onSeek(newPos);
  }

  const styles = makeStyles(theme);

  return (
    <View
      style={styles.trackWrapper}
      onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}>
      <View style={styles.track}>
        <View style={[styles.fill, {width: `${ratio * 100}%`}]} />
        <View style={[styles.thumb, {left: `${ratio * 100}%`}]} />
      </View>
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    trackWrapper: {
      flex: 1,
      height: 28,
      justifyContent: 'center',
    },
    track: {
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
      overflow: 'visible',
    },
    fill: {
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.accent,
      position: 'absolute',
      top: 0,
      left: 0,
    },
    thumb: {
      position: 'absolute',
      top: -5,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.accent,
      marginLeft: -7,
    },
  });
}
