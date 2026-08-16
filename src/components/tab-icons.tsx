/**
 * Purpose: Dependency-free tab bar glyphs, drawn with plain Views. SDK 57
 * dropped @expo/vector-icons from the expo package and this project ships
 * no icon font, so the shell draws its own thin-line marks instead — five
 * small pieces of brass hardware for the bottom rail.
 * Author(s): John Reed
 */

import { StyleSheet, View, type ColorValue } from 'react-native';

// Constants

const STROKE = 1.5;

interface IconProps {
  color: ColorValue;
  size?: number;
}

// Dashboard — a 2x2 grid of thin-line tiles.
export function GridIcon({ color, size = 24 }: IconProps) {
  const tile = {
    width: (size - 4) / 2,
    height: (size - 4) / 2,
    borderWidth: STROKE,
    borderColor: color,
    borderRadius: 2,
  };
  return (
    <View style={[styles.grid, { width: size, height: size }]}>
      <View style={tile} />
      <View style={tile} />
      <View style={tile} />
      <View style={tile} />
    </View>
  );
}

// The Vault — an archive box: lid on top, body with a handle slot below.
export function VaultIcon({ color, size = 24 }: IconProps) {
  return (
    <View style={[styles.centerColumn, { width: size, height: size }]}>
      <View
        style={{
          width: size,
          height: size * 0.3,
          borderWidth: STROKE,
          borderColor: color,
          borderRadius: 2,
        }}
      />
      <View
        style={[
          styles.centerColumn,
          {
            width: size * 0.82,
            height: size * 0.58,
            marginTop: 2,
            borderWidth: STROKE,
            borderColor: color,
            borderTopWidth: STROKE,
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
            justifyContent: 'flex-start',
            paddingTop: size * 0.12,
          },
        ]}
      >
        <View style={{ width: size * 0.3, height: 2, backgroundColor: color }} />
      </View>
    </View>
  );
}

// Insights — three rising chart bars.
export function InsightsIcon({ color, size = 24 }: IconProps) {
  const bar = (height: number) => ({
    width: (size - 10) / 3,
    height: size * height,
    backgroundColor: color,
    borderRadius: 1.5,
  });
  return (
    <View style={[styles.bars, { width: size, height: size }]}>
      <View style={bar(0.45)} />
      <View style={bar(0.7)} />
      <View style={bar(1)} />
    </View>
  );
}

// Profile — a thin-line head over open shoulders.
export function ProfileIcon({ color, size = 24 }: IconProps) {
  return (
    <View style={[styles.centerColumn, { width: size, height: size }]}>
      <View
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderWidth: STROKE,
          borderColor: color,
          borderRadius: size * 0.21,
        }}
      />
      <View
        style={{
          width: size * 0.8,
          height: size * 0.42,
          marginTop: 2,
          borderWidth: STROKE,
          borderColor: color,
          borderBottomWidth: 0,
          borderTopLeftRadius: size * 0.4,
          borderTopRightRadius: size * 0.4,
        }}
      />
    </View>
  );
}

// Scan — barcode stripes inside viewfinder corner brackets.
export function ScanIcon({ color, size = 24 }: IconProps) {
  const corner = size * 0.28;
  const bracket = { width: corner, height: corner, borderColor: color, position: 'absolute' as const };
  const stripe = (width: number) => ({
    width,
    height: size * 0.42,
    backgroundColor: color,
    borderRadius: 1,
  });
  return (
    <View style={[styles.scanBox, { width: size, height: size }]}>
      <View style={[bracket, { top: 0, left: 0, borderTopWidth: STROKE, borderLeftWidth: STROKE }]} />
      <View style={[bracket, { top: 0, right: 0, borderTopWidth: STROKE, borderRightWidth: STROKE }]} />
      <View style={[bracket, { bottom: 0, left: 0, borderBottomWidth: STROKE, borderLeftWidth: STROKE }]} />
      <View style={[bracket, { bottom: 0, right: 0, borderBottomWidth: STROKE, borderRightWidth: STROKE }]} />
      <View style={styles.stripes}>
        <View style={stripe(2.5)} />
        <View style={stripe(1.5)} />
        <View style={stripe(3)} />
        <View style={stripe(1.5)} />
        <View style={stripe(2.5)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  centerColumn: {
    alignItems: 'center',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 1,
  },
  scanBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
