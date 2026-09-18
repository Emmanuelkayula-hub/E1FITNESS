"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { addStudySession } from "@/app/career/actions";

export function StudySessionForm({ exams }: { exams: { id: string; name: string }[] }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ActionForm action={addStudySession} submitLabel="Log study session">
      <Field label="Exam (optional)">
        <select name="examId" className="input" defaultValue="">
          <option value="">— unassigned —</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input type="date" name="date" defaultValue={today} className="input" required />
      </Field>
      <Field label="Hours">
        <input type="number" name="hours" step="0.25" min="0" className="input" required />
      </Field>
      <Field label="Questions completed">
        <input type="number" name="questionsCompleted" step="1" min="0" defaultValue="0" className="input" />
      </Field>
      <Field label="Topic (optional)">
        <input type="text" name="topic" className="input" />
      </Field>
      <Field label="Mock score % (optional)">
        <input type="number" name="mockScorePercent" step="0.1" min="0" max="100" className="input" />
      </Field>
      <Field label="Notes (optional)">
        <input type="text" name="notes" className="input" />
      </Field>
    </ActionForm>
  );
}
