import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CategoryCard } from './CategoryCard';

const categories = [
  {
    id: 'general' as const,
    title: 'General Assistant',
    icon: '💬',
    color: 'bg-indigo-400',
    description: 'Ask me anything in your language'
  },
  {
    id: 'education' as const,
    title: 'Basic Education',
    icon: '📚',
    color: 'bg-sky-400',
    description: 'Quick explanations, study tips, and learning resources'
  },
  {
    id: 'frontline' as const,
    title: 'Frontline & ASHA',
    icon: '👥',
    color: 'bg-emerald-400',
    description: 'Support for community health workers'
  },
  {
    id: 'legal' as const,
    title: 'Legal & Fraud ID',
    icon: '⚖️',
    color: 'bg-purple-400',
    description: 'Recognize scams and access verified support'
  },
  {
    id: 'health' as const,
    title: 'Health & First Aid',
    icon: '💼',
    color: 'bg-red-400',
    description: 'Symptom guidance and first aid information'
  }
];

interface CategoryGridProps {
  onSelectCategory: (category: 'general' | 'education' | 'frontline' | 'legal' | 'health') => void;
}

export function CategoryGrid({ onSelectCategory }: CategoryGridProps) {
  return (
    <View style={styles.grid}>
      {categories.map((category) => (
        <View key={category.id} style={styles.gridItem}>
          <CategoryCard 
            {...category} 
            onClick={() => onSelectCategory(category.id)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridItem: {
    width: '50%',
    padding: 8,
  },
});