import React from 'react';
import { Linking } from 'react-native';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { WorkoutWidget } from './WorkoutWidget';
import {
  getWeeklyStreak,
  getWorkouts,
  getMonthlyStats,
  getSetting,
} from '../database/services';

function formatRelativeDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === today) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatVolume(volume: number): string {
  if (volume >= 10000) {
    return `${(volume / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return volume.toLocaleString();
}

function getWidgetData() {
  try {
    const goalStr = getSetting('weekly_goal', '3');
    const weeklyGoal = parseInt(goalStr, 10) || 3;
    const streak = getWeeklyStreak(weeklyGoal);

    const now = new Date();
    const stats = getMonthlyStats(now.getFullYear(), now.getMonth() + 1);

    const workouts = getWorkouts();
    const lastWorkout = workouts.length > 0 ? workouts[0] : null;

    let lastWorkoutLabel = '';
    let lastWorkoutMeta = '';
    if (lastWorkout) {
      lastWorkoutLabel = lastWorkout.muscle_group_name;
      lastWorkoutMeta = `${formatRelativeDate(lastWorkout.date)} \u00B7 ${lastWorkout.exercise_count} exercises \u00B7 ${formatVolume(lastWorkout.total_volume)} kg`;
    }

    return {
      streak,
      monthlyWorkouts: stats.workoutCount,
      lastWorkoutLabel,
      lastWorkoutMeta,
      hasWorkouts: workouts.length > 0,
    };
  } catch (e) {
    console.warn('Widget data fetch failed:', e);
    return {
      streak: 0,
      monthlyWorkouts: 0,
      lastWorkoutLabel: '',
      lastWorkoutMeta: '',
      hasWorkouts: false,
    };
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      const data = getWidgetData();
      props.renderWidget(React.createElement(WorkoutWidget, data));
      break;

    case 'WIDGET_CLICK':
      if (props.clickAction === 'START_WORKOUT') {
        Linking.openURL('workouttracker://workout');
      } else if (props.clickAction === 'OPEN_APP') {
        Linking.openURL('workouttracker://');
      }
      break;

    case 'WIDGET_DELETED':
      break;
  }
}
