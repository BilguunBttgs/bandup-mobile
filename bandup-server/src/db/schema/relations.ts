import { relations } from "drizzle-orm";
import { users } from "./users";
import { readings } from "./readings";
import { questions, questionOptions } from "./questions";
import { userReadingSubmissions } from "./submissions";

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(userReadingSubmissions),
}));

export const readingsRelations = relations(readings, ({ many }) => ({
  questions: many(questions),
  submissions: many(userReadingSubmissions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  reading: one(readings, {
    fields: [questions.readingId],
    references: [readings.id],
  }),
  options: many(questionOptions),
}));

export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, {
    fields: [questionOptions.questionId],
    references: [questions.id],
  }),
}));

export const userReadingSubmissionsRelations = relations(userReadingSubmissions, ({ one }) => ({
  user: one(users, {
    fields: [userReadingSubmissions.userId],
    references: [users.id],
  }),
  reading: one(readings, {
    fields: [userReadingSubmissions.readingId],
    references: [readings.id],
  }),
}));
