import { Model } from '@nozbe/watermelondb';
import { field, text, date, json, readonly, writer } from '@nozbe/watermelondb/decorators';

// Ensures the stored JSON is always a clean array of member names.
const sanitizeMembers = (raw) => (Array.isArray(raw) ? raw.filter(Boolean) : []);

export default class Event extends Model {
  static table = 'events';

  @text('title') title;
  @text('date') date;
  @text('start_time') startTime;
  @text('end_time') endTime;
  @text('location') location;
  @json('members', sanitizeMembers) members;
  @text('memo') memo;
  @field('all_day') allDay;
  @field('reminder_minutes') reminderMinutes;
  @readonly @date('created_at') createdAt;
  @readonly @date('updated_at') updatedAt;

  // Plain object for the rest of the app (mirrors the AsyncStorage shape).
  toPlain() {
    return {
      id: this.id,
      title: this.title,
      date: this.date,
      startTime: this.startTime || '',
      endTime: this.endTime || '',
      location: this.location || '',
      members: this.members || [],
      memo: this.memo || '',
      allDay: !!this.allDay,
      reminderMinutes: this.reminderMinutes ?? 30,
    };
  }

  @writer async updateFromPlain(data) {
    await this.update((record) => {
      if (data.title !== undefined) record.title = data.title;
      if (data.date !== undefined) record.date = data.date;
      if (data.startTime !== undefined) record.startTime = data.startTime;
      if (data.endTime !== undefined) record.endTime = data.endTime;
      if (data.location !== undefined) record.location = data.location;
      if (data.members !== undefined) record.members = data.members;
      if (data.memo !== undefined) record.memo = data.memo;
      if (data.allDay !== undefined) record.allDay = data.allDay;
      if (data.reminderMinutes !== undefined) record.reminderMinutes = data.reminderMinutes;
    });
  }
}
