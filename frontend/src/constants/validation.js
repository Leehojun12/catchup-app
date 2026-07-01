export const VALIDATION = {
  title: {
    required: true,
    minLength: 1,
    maxLength: 50,
    messages: {
      required: '제목을 입력해주세요',
      maxLength: '제목은 50자 이하로 입력해주세요',
    },
  },
  date: {
    required: true,
    messages: {
      required: '날짜를 선택해주세요',
      past: '지난 날짜입니다. 계속할까요?',
    },
  },
  time: {
    messages: {
      required: '시작 시간을 선택해주세요',
      invalidRange: '종료 시간이 시작보다 빠릅니다',
    },
  },
  location: {
    required: true,
    maxLength: 100,
    messages: {
      required: '장소를 입력해주세요',
      maxLength: '너무 길어요 (100자 초과)',
    },
  },
  members: {
    maxCount: 10,
    maxLengthPerMember: 20,
    messages: {
      maxCount: '최대 10명까지 추가 가능해요',
      maxLength: '참석자 이름은 20자 이하로 입력해주세요',
    },
  },
  memo: {
    maxLength: 200,
    messages: {
      maxLength: '200자를 초과했어요',
    },
  },
};

export function validateEventForm(form) {
  const errors = {};

  if (!form.title?.trim()) {
    errors.title = VALIDATION.title.messages.required;
  } else if (form.title.length > VALIDATION.title.maxLength) {
    errors.title = VALIDATION.title.messages.maxLength;
  }

  if (!form.date) {
    errors.date = VALIDATION.date.messages.required;
  }

  if (!form.allDay && !form.startTime?.trim()) {
    errors.startTime = VALIDATION.time.messages.required;
  }

  if (form.startTime && form.endTime && form.endTime <= form.startTime) {
    errors.endTime = VALIDATION.time.messages.invalidRange;
  }

  if (!form.location?.trim()) {
    errors.location = VALIDATION.location.messages.required;
  } else if (form.location.length > VALIDATION.location.maxLength) {
    errors.location = VALIDATION.location.messages.maxLength;
  }

  if (form.members?.length > VALIDATION.members.maxCount) {
    errors.members = VALIDATION.members.messages.maxCount;
  }

  if (form.memo && form.memo.length > VALIDATION.memo.maxLength) {
    errors.memo = VALIDATION.memo.messages.maxLength;
  }

  return errors;
}
