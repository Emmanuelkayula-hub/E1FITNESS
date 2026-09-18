"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { addExam } from "@/app/career/actions";

export function ExamForm() {
  return (
    <ActionForm action={addExam} submitLabel="Add exam">
      <Field label="Exam name">
        <input type="text" name="name" className="input" required placeholder="e.g. CS1 - Actuarial Statistics" />
      </Field>
      <Field label="Sitting (optional)">
        <input type="text" name="sitting" className="input" placeholder="e.g. April 2027" />
      </Field>
      <Field label="Exam date (optional)">
        <input type="date" name="examDate" className="input" />
      </Field>
      <Field label="Registration deadline (optional)">
        <input type="date" name="registrationDeadline" className="input" />
      </Field>
      <Field label="Study start date (optional)">
        <input type="date" name="studyStartDate" className="input" />
      </Field>
      <Field label="Target study hours (optional)">
        <input type="number" name="targetStudyHours" step="1" min="0" className="input" />
      </Field>
      <Field label="Status">
        <select name="status" className="input" defaultValue="NOT_STARTED">
          <option value="NOT_STARTED">Not started</option>
          <option value="STUDYING">Studying</option>
          <option value="REVISION">Revision</option>
          <option value="MOCK_EXAMS">Mock exams</option>
          <option value="COMPLETED">Completed</option>
          <option value="PASSED">Passed</option>
          <option value="DEFERRED">Deferred</option>
        </select>
      </Field>
    </ActionForm>
  );
}
