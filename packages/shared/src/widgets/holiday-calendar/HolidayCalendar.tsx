import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useFitScale } from '../../hooks/useFitScale';
import AppIcon from '../../components/AppIcon';

interface Holiday {
  name: string;
  date: string; // ISO date string YYYY-MM-DD
}

interface HolidayCalendarConfig {
  country?: string;
  year?: number;
  showPast?: boolean;
}

function getUSHolidays(year: number): Holiday[] {
  // Calculate dynamic holidays
  const mlkDay = getNthWeekday(year, 0, 1, 3); // 3rd Monday of January
  const presidentsDay = getNthWeekday(year, 1, 1, 3); // 3rd Monday of February
  const memorialDay = getLastWeekday(year, 4, 1); // Last Monday of May
  const laborDay = getNthWeekday(year, 8, 1, 1); // 1st Monday of September
  const columbusDay = getNthWeekday(year, 9, 1, 2); // 2nd Monday of October
  const thanksgivingDay = getNthWeekday(year, 10, 4, 4); // 4th Thursday of November

  return [
    { name: "New Year's Day", date: `${year}-01-01` },
    { name: 'Martin Luther King Jr. Day', date: formatDate(mlkDay) },
    { name: "Presidents' Day", date: formatDate(presidentsDay) },
    { name: 'Memorial Day', date: formatDate(memorialDay) },
    { name: 'Juneteenth', date: `${year}-06-19` },
    { name: 'Independence Day', date: `${year}-07-04` },
    { name: 'Labor Day', date: formatDate(laborDay) },
    { name: 'Columbus Day', date: formatDate(columbusDay) },
    { name: 'Veterans Day', date: `${year}-11-11` },
    { name: 'Thanksgiving Day', date: formatDate(thanksgivingDay) },
    { name: 'Christmas Day', date: `${year}-12-25` },
  ];
}

function getNthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const date = new Date(year, month, 1);
  let count = 0;
  while (count < n) {
    if (date.getDay() === weekday) count++;
    if (count < n) date.setDate(date.getDate() + 1);
  }
  return date;
}

function getLastWeekday(year: number, month: number, weekday: number): Date {
  const date = new Date(year, month + 1, 0); // Last day of month
  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() - 1);
  }
  return date;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const todayStr = formatDate(today);
  return dateStr === todayStr;
}

function isPast(dateStr: string): boolean {
  const today = formatDate(new Date());
  return dateStr < today;
}

export default function HolidayCalendar({ config, theme, width, height }: WidgetComponentProps) {
  const cc = config as HolidayCalendarConfig | undefined;
  const year = cc?.year ?? new Date().getFullYear();
  const showPast = cc?.showPast ?? false;

  const holidays = useMemo(() => {
    const all = getUSHolidays(year);
    if (showPast) return all;
    return all.filter(h => !isPast(h.date));
  }, [year, showPast]);

  const { scale, designWidth, designHeight } = useFitScale(width, height, 280, 320);

  return (
    <View style={[s.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left' }}>
        {/* Header */}
        <View style={s.header}>
          <AppIcon name="partyPopper" size={18} color={theme.accent} />
          <Text style={[s.headerText, { color: theme.accent }]}>Holidays {year}</Text>
        </View>
        {/* Holiday list */}
        {holidays.length === 0 ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>No upcoming holidays</Text>
          </View>
        ) : (
          <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
            {holidays.map((holiday, idx) => {
              const today = isToday(holiday.date);
              const past = isPast(holiday.date);
              return (
                <View
                  key={holiday.date + holiday.name}
                  style={[
                    s.row,
                    idx < holidays.length - 1 && s.rowBorder,
                    today && { backgroundColor: `${theme.accent}15` },
                  ]}
                >
                  <View style={s.dateColumn}>
                    <Text style={[s.dateDay, { color: today ? theme.accent : past ? 'rgba(255,255,255,0.3)' : 'white' }]}>
                      {holiday.date.split('-')[2]}
                    </Text>
                    <Text style={[s.dateMonth, { color: today ? theme.accent : 'rgba(255,255,255,0.5)' }]}>
                      {formatDisplayDate(holiday.date).split(',')[0]}
                    </Text>
                  </View>
                  <View style={s.nameColumn}>
                    <Text
                      style={[
                        s.holidayName,
                        { color: today ? theme.accent : past ? 'rgba(255,255,255,0.4)' : 'white' },
                      ]}
                      numberOfLines={1}
                    >
                      {holiday.name}
                    </Text>
                    <Text style={[s.holidayDate, { color: past ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)' }]}>
                      {formatDisplayDate(holiday.date)}
                    </Text>
                  </View>
                  {today && (
                    <View style={[s.todayBadge, { backgroundColor: theme.accent }]}>
                      <Text style={s.todayText}>Today</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  headerText: { fontSize: 16, fontWeight: '600' },
  scrollView: { flex: 1, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 6 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  dateColumn: { width: 36, alignItems: 'center' },
  dateDay: { fontSize: 20, fontWeight: '700' },
  dateMonth: { fontSize: 10, fontWeight: '500' },
  nameColumn: { flex: 1 },
  holidayName: { fontSize: 14, fontWeight: '600' },
  holidayDate: { fontSize: 11, marginTop: 2 },
  todayBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  todayText: { color: 'white', fontSize: 10, fontWeight: '700' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
});

registerWidget({
  type: 'holiday-calendar',
  name: 'Holiday Calendar',
  description: 'Shows upcoming holidays for the year',
  icon: 'partyPopper',
  minW: 2, minH: 2, defaultW: 3, defaultH: 3,
  component: HolidayCalendar,
  defaultProps: { showPast: false },
});
