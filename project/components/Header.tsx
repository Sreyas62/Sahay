import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface HeaderProps {
  onShowModelManagement?: () => void;
}

export function Header({ onShowModelManagement }: HeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => {}}
        accessible={true}
        accessibilityLabel="Menu"
      >
        <Text style={styles.icon}>☰</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Sahay</Text>
      
      {/* Settings Button */}
      {onShowModelManagement && (
        <TouchableOpacity 
          onPress={onShowModelManagement}
          style={styles.button}
          accessible={true}
          accessibilityLabel="Model settings"
        >
          <Text style={styles.icon}>⚙️</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => {}}
        accessible={true}
        accessibilityLabel="Search"
      >
        <Text style={styles.iconSearch}>🔍</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  button: {
    padding: 8,
  },
  icon: {
    fontSize: 24,
    color: '#4B5563',
  },
  iconSearch: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
});