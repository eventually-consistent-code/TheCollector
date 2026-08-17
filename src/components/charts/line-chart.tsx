/**
 * Purpose: The portfolio value line — one amber stroke over a faint hunter
 * fill, three brass hairline gridlines, first/last dates whispered under
 * the frame. Geometry lives in chart-math.ts; this file just draws it.
 * Author(s): John Reed
 */

import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import Svg, { Line, Path, Polyline } from 'react-native-svg';

import { scaleSeries, toAreaPath, toPolyline } from '@/components/charts/chart-math';
import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing, Type } from '@/constants/theme';
import type { SeriesPoint } from '@/lib/value-series';

// Constants

const CHART_HEIGHT = 180;

// The one lamp in the room draws the line; hunter felt grounds it.
const LINE_STROKE = Palette.amber;
const FILL_UNDER = Palette.hunter;
const FILL_OPACITY = 0.12;
const GRID_STROKE = Palette.brass;

// Short axis date — "Aug 17" voice, matched to the day-bucketed series.
function axisDate(t: number): string {
  const d = new Date(t);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function LineChart({
  data,
  height = CHART_HEIGHT,
}: {
  data: readonly SeriesPoint[];
  height?: number;
}) {
  // Width rides the card, measured once per layout.
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(Math.round(e.nativeEvent.layout.width));
  };

  const points = scaleSeries(data, width, height);
  const showDates = data.length > 0;
  const sameDay = data.length > 0 && data[0].t === data[data.length - 1].t;

  return (
    <View onLayout={onLayout}>
      <Svg width={Math.max(width, 1)} height={height}>
        {/* Three brass hairlines at the quarter marks — shelf lines, not axes. */}
        {[0.25, 0.5, 0.75].map((f) => (
          <Line
            key={f}
            x1={0}
            y1={height * f}
            x2={width}
            y2={height * f}
            stroke={GRID_STROKE}
            strokeWidth={StyleSheet.hairlineWidth || 0.5}
            opacity={0.6}
          />
        ))}
        {points.length > 0 ? (
          <>
            <Path
              d={toAreaPath(points, height)}
              fill={FILL_UNDER}
              opacity={FILL_OPACITY}
            />
            <Polyline
              points={toPolyline(points)}
              fill="none"
              stroke={LINE_STROKE}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        ) : null}
      </Svg>
      {showDates ? (
        <View style={styles.dateRow}>
          <ThemedText themeColor="textSecondary" style={styles.dateLabel}>
            {axisDate(data[0].t)}
          </ThemedText>
          {!sameDay ? (
            <ThemedText themeColor="textSecondary" style={styles.dateLabel}>
              {axisDate(data[data.length - 1].t)}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  // Muted small — the dates whisper; the line does the talking.
  dateLabel: {
    ...Type.data,
    fontSize: 11,
    lineHeight: 14,
  },
});
