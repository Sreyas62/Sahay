import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const navItems = [
  { id: 'home' as const, icon: '🏠', label: 'Home' },
  { id: 'add', icon: '➕', label: 'Add' },
  { id: 'voice', icon: '🎤', label: 'Voice Input', highlight: true },
  { id: 'history', icon: '🕐', label: 'History' },
  { id: 'profile', icon: '👤', label: 'Profile' }
];

interface BottomNavProps {
  activeScreen: string;
  onNavigate: (screen: 'home') => void;
}

export function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  return (
    <View style={styles.nav}>
      <View style={styles.navContent}>
        {navItems.map((item) => {
          const isActive = (item.id === 'home' && activeScreen === 'home');
          const isHighlight = item.highlight;
          
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navButton,
                isHighlight && styles.navButtonHighlight,
              ]}
              onPress={() => item.id === 'home' && onNavigate('home')}
              accessible={true}
              accessibilityLabel={item.label}
            >
              <Text 
                style={[
                  styles.navIcon,
                  isActive && styles.navIconActive,
                  isHighlight && styles.navIconHighlight,
                ]}
              >
                {item.icon}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
  },
  navButtonHighlight: {
    backgroundColor: '#F0F9FF',
  },
  navIcon: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  navIconActive: {
    color: '#0EA5E9',
  },
  navIconHighlight: {
    color: '#0EA5E9',
  },
});