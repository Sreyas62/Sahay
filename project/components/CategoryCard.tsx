import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

interface CategoryCardProps {
  title: string;
  icon: string;
  color: string;
  description: string;
  onClick: () => void;
}

export function CategoryCard({ title, icon, color, description, onClick }: CategoryCardProps) {
  const colorMap: Record<string, string> = {
    'bg-indigo-400': '#818CF8',
    'bg-sky-400': '#38BDF8',
    'bg-emerald-400': '#34D399',
    'bg-purple-400': '#A78BFA',
    'bg-red-400': '#F87171',
  };

  return (
    <TouchableOpacity 
      style={[
        styles.card,
        { backgroundColor: colorMap[color] || '#818CF8' }
      ]}
      onPress={onClick}
      accessible={true}
      accessibilityLabel={description}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
