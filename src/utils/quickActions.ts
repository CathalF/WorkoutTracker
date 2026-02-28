import { Platform } from 'react-native';
import { getAllTemplates } from '../database/services';

export function refreshQuickActions() {
  try {
    const QuickActions = require('expo-quick-actions');

    const templates = getAllTemplates();
    const items: any[] = [];

    // Add up to 3 most recent templates as shortcuts
    const topTemplates = templates.slice(0, 3);
    for (const template of topTemplates) {
      items.push({
        id: `template-${template.id}`,
        title: template.name,
        subtitle: template.split_label,
        icon: Platform.OS === 'ios' ? 'symbol:dumbbell.fill' : undefined,
        params: { templateId: String(template.id) },
      });
    }

    // Generic start workout action (always last)
    items.push({
      id: 'start-workout',
      title: 'Start Workout',
      subtitle: 'Choose a split',
      icon: Platform.OS === 'ios' ? 'symbol:plus.circle.fill' : undefined,
    });

    QuickActions.setItems(items);
  } catch {
    // expo-quick-actions not available (e.g., Expo Go)
  }
}
