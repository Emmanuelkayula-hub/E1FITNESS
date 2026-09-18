"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { addCareerExpense } from "@/app/career/actions";

export function CareerExpenseForm() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ActionForm action={addCareerExpense} submitLabel="Log career expense">
      <Field label="Date">
        <input type="date" name="date" defaultValue={today} className="input" required />
      </Field>
      <Field label="Category">
        <select name="category" className="input" defaultValue="exam_fee">
          <option value="exam_fee">Exam fee</option>
          <option value="study_materials">Study materials</option>
          <option value="course">Course</option>
          <option value="transport">Transport</option>
          <option value="membership">Professional membership</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Amount (K)">
        <input type="number" name="amount" step="0.01" min="0" className="input" required />
      </Field>
      <Field label="Description (optional)">
        <input type="text" name="description" className="input" />
      </Field>
    </ActionForm>
  );
}
