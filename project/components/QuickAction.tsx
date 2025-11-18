import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface QuickActionProps {
  icon: string;
  label: string;
  color: string;
  onClick: () => void;
}

export function QuickAction({ icon, label, color, onClick }: QuickActionProps) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    'bg-indigo-100 text-indigo-600': { bg: '#E0E7FF', text: '#4F46E5' },
    'bg-blue-100 text-blue-600': { bg: '#DBEAFE', text: '#2563EB' },
    'bg-purple-100 text-purple-600': { bg: '#EDE9FE', text: '#7C3AED' },
    'bg-pink-100 text-pink-600': { bg: '#FCE7F3', text: '#DB2777' },
  };

  const colors = colorMap[color] || { bg: '#E0E7FF', text: '#4F46E5' };

  return (
    <TouchableOpacity
      onPress={onClick}
      style={[styles.button, { backgroundColor: colors.bg }]}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
