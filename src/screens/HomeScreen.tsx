import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Category = 'general' | 'education' | 'frontline' | 'legal' | 'health';

interface HomeScreenProps {
  onSelectCategory: (category: Category) => void;
  onSettings?: () => void;
}

interface CategoryCardData {
  id: Category;
  title: string;
  description: string;
  icon: string;
  gradient: string[];
}

const categories: CategoryCardData[] = [
  {
    id: 'general',
    title: 'General Chat',
    description: 'Everyday conversations and general queries',
    icon: 'chat',
    gradient: ['#6366F1', '#8B5CF6'],
  },
  {
    id: 'education',
    title: 'Education',
    description: 'Learning assistance and study help',
    icon: 'school',
    gradient: ['#8B5CF6', '#A855F7'],
  },
  {
    id: 'frontline',
    title: 'Frontline Workers',
    description: 'Support for field workers and agents',
    icon: 'briefcase',
    gradient: ['#A855F7', '#EC4899'],
  },
  {
    id: 'legal',
    title: 'Legal Help',
    description: 'Legal information and guidance',
    icon: 'gavel',
    gradient: ['#EC4899', '#F97316'],
  },
  {
    id: 'health',
    title: 'Health & Wellness',
    description: 'Health tips and wellness guidance',
    icon: 'heart-pulse',
    gradient: ['#F97316', '#EF4444'],
  },
];

export function HomeScreen({ onSelectCategory, onSettings }: HomeScreenProps) {

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.headerTitle}>How can I help you today?</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={onSettings}>
            <Icon name="cog" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Categories List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>CHOOSE A SERVICE</Text>
        
        <View style={styles.categoriesGrid}>
          {categories.map((category, index) => (
            <TouchableOpacity
              key={category.id}
              activeOpacity={0.8}
              onPress={() => onSelectCategory(category.id)}
              style={styles.categoryCard}
            >
              <LinearGradient
                colors={category.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.categoryIconContainer}
              >
                <Icon name={category.icon} size={28} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.categoryContent}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    height: 100,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 10,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 16,
    marginLeft: 4,
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 16,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
