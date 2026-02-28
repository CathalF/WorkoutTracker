import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface WorkoutWidgetProps {
  streak: number;
  monthlyWorkouts: number;
  lastWorkoutLabel: string;   // e.g., "Chest & Triceps"
  lastWorkoutMeta: string;    // e.g., "Today · 6 exercises · 4,500 lbs"
  hasWorkouts: boolean;
}

export function WorkoutWidget({
  streak,
  monthlyWorkouts,
  lastWorkoutLabel,
  lastWorkoutMeta,
  hasWorkouts,
}: WorkoutWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
      }}
      clickAction="OPEN_APP"
    >
      {/* Header */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextWidget text="\uD83C\uDFCB\uFE0F" style={{ fontSize: 14 }} />
        <TextWidget
          text=" Workout Tracker"
          style={{ fontSize: 14, fontWeight: '600', color: '#000000' }}
        />
      </FlexWidget>

      {hasWorkouts ? (
        <>
          {/* Stats Row */}
          <FlexWidget
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              width: 'match_parent',
              marginTop: 4,
            }}
          >
            <FlexWidget style={{ alignItems: 'center' }}>
              <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextWidget text="\uD83D\uDD25 " style={{ fontSize: 12 }} />
                <TextWidget
                  text={String(streak)}
                  style={{ fontSize: 26, fontWeight: '700', color: '#000000' }}
                />
              </FlexWidget>
              <TextWidget
                text="week streak"
                style={{ fontSize: 11, color: '#8E8E93' }}
              />
            </FlexWidget>
            <FlexWidget style={{ alignItems: 'center' }}>
              <TextWidget
                text={String(monthlyWorkouts)}
                style={{ fontSize: 26, fontWeight: '700', color: '#000000' }}
              />
              <TextWidget
                text="this month"
                style={{ fontSize: 11, color: '#8E8E93' }}
              />
            </FlexWidget>
          </FlexWidget>

          {/* Last Workout */}
          <FlexWidget style={{ marginTop: 2 }}>
            <TextWidget
              text={`Last: ${lastWorkoutLabel}`}
              style={{ fontSize: 12, fontWeight: '600', color: '#3C3C43' }}
            />
            <TextWidget
              text={lastWorkoutMeta}
              style={{ fontSize: 11, color: '#8E8E93', marginTop: 1 }}
            />
          </FlexWidget>
        </>
      ) : (
        <FlexWidget
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            width: 'match_parent',
          }}
        >
          <TextWidget
            text="No workouts yet"
            style={{ fontSize: 14, color: '#8E8E93' }}
          />
        </FlexWidget>
      )}

      {/* Start Button */}
      <FlexWidget
        clickAction="START_WORKOUT"
        style={{
          backgroundColor: '#007AFF',
          borderRadius: 8,
          padding: 10,
          alignItems: 'center',
          justifyContent: 'center',
          width: 'match_parent',
          marginTop: 4,
        }}
      >
        <TextWidget
          text="Start Workout"
          style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
