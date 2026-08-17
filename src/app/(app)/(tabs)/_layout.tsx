/**
 * Purpose: Bottom tab shell — Dashboard / Collections / Scan / Insights /
 * Profile. Scan is a dummy route: pressing it never navigates, it raises
 * the collection picker instead. The bar is deep slate with a brass
 * hairline — the shelf edge under the whole app.
 * Author(s): John Reed
 */

import { Tabs } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { CollectionPicker } from '@/components/collection-picker';
import {
  GridIcon,
  InsightsIcon,
  ProfileIcon,
  ScanIcon,
  VaultIcon,
} from '@/components/tab-icons';
import { FontFamily, Palette } from '@/constants/theme';

// The raised center button — a brass-ringed hunter disc that overhangs the
// bar. Press is wired through the tab's own onPress so the tabPress
// listener (which opens the picker) still fires.
function ScanTabButton({ onPress }: { onPress?: (event: GestureResponderEvent) => void }) {
  return (
    <Pressable
      style={styles.scanSlot}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Scan an item"
      hitSlop={8}
    >
      <View style={styles.scanCircle}>
        <ScanIcon color={Palette.vellum} size={26} />
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          // Serif header titles — the Estate & Ember display voice.
          headerTitleStyle: { fontFamily: FontFamily.serifBold },
          tabBarStyle: {
            backgroundColor: Palette.slate,
            borderTopWidth: 1,
            borderTopColor: Palette.brass,
          },
          tabBarActiveTintColor: Palette.amber,
          tabBarInactiveTintColor: Palette.vellumMuted,
          tabBarLabelStyle: { fontFamily: FontFamily.sansMedium, fontSize: 11 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <GridIcon color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="vault"
          options={{
            title: 'Collections',
            tabBarIcon: ({ color }) => <VaultIcon color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarButton: ({ onPress }) => <ScanTabButton onPress={onPress} />,
          }}
          listeners={{
            // Never navigate to the dummy route — raise the picker instead.
            tabPress: (event) => {
              event.preventDefault();
              setPickerOpen(true);
            },
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: 'Insights',
            tabBarIcon: ({ color }) => <InsightsIcon color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <ProfileIcon color={color} size={22} />,
          }}
        />
      </Tabs>
      <CollectionPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  scanSlot: {
    flex: 1,
    alignItems: 'center',
  },
  // ~58px disc, 2px amber ring, hunter fill, overhanging the bar top.
  scanCircle: {
    width: 58,
    height: 58,
    marginTop: -22,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: Palette.amber,
    backgroundColor: Palette.hunter,
    alignItems: 'center',
    justifyContent: 'center',
    // A little lamplight under the disc so the overhang reads as raised.
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
