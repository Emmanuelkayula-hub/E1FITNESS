import { z } from "zod";

export const examSchema = z.object({
  name: z.string().min(1),
  sitting: z.string().max(200).optional(),
  examDate: z.coerce.date().optional(),
  registrationDeadline: z.coerce.date().optional(),
  studyStartDate: z.coerce.date().optional(),
  targetStudyHours: z.coerce.number().min(0).optional(),
  status: z.enum([
    "NOT_STARTED",
    "STUDYING",
    "REVISION",
    "MOCK_EXAMS",
    "COMPLETED",
    "PASSED",
    "DEFERRED",
  ]),
});

export const studySessionSchema = z.object({
  examId: z.string().min(1).optional(),
  date: z.coerce.date(),
  hours: z.coerce.number().positive("Hours must be greater than zero."),
  questionsCompleted: z.coerce.number().int().min(0).default(0),
  topic: z.string().max(200).optional(),
  mockScorePercent: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export const careerExpenseSchema = z.object({
  date: z.coerce.date(),
  category: z.enum(["exam_fee", "study_materials", "course", "transport", "membership", "other"]),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  description: z.string().max(500).optional(),
});

export type ExamInput = z.infer<typeof examSchema>;
export type StudySessionInput = z.infer<typeof studySessionSchema>;
export type CareerExpenseInput = z.infer<typeof careerExpenseSchema>;
