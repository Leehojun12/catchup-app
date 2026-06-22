import React from 'react';
import { StyleSheet, View, SafeAreaView } from 'react-native';
import { Calendar } from 'react-native-calendars';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.calendarContainer}>
        <Calendar
          // 달력의 기본 설정
          onDayPress={(day) => {
            console.log('선택한 날짜: ', day);
          }}
          theme={{
            todayTextColor: '#00adf5',
            selectedDayBackgroundColor: '#00adf5',
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  calendarContainer: {
    marginTop: 50,
  },
});