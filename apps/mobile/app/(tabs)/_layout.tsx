import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { WorldBackground } from '../../src/components/WorldBackground';
import { TopBar } from '../../src/components/TopBar';
import { TabBar } from '../../src/components/TabBar';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <WorldBackground />
      <TopBar />
      <View style={{ flex: 1 }}>
        <Tabs
          tabBar={(props) => <TabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: 'transparent' },
            animation: 'none',
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="notifications" />
          <Tabs.Screen name="you" />
        </Tabs>
      </View>
    </View>
  );
}
