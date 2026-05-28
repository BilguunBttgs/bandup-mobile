import { relations } from "drizzle-orm";
import { users } from "./users";
import { readings } from "./readings";
import { questions, questionOptions } from "./questions";
import { userReadingSubmissions } from "./submissions";
import { listenings } from "./listenings";
import { listeningQuestions, listeningQuestionOptions } from "./listening_questions";
import { userListeningSubmissions } from "./listening_submissions";
import { characters } from "./characters";
import { userStats } from "./user_stats";
import { quests, userQuests } from "./quests";
import { shopItems, userInventory } from "./shop";
import { leaderboardSnapshots } from "./leaderboard_snapshots";

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  submissions: many(userReadingSubmissions),
  listeningSubmissions: many(userListeningSubmissions),
  characters: many(characters),
  stats: one(userStats, {
    fields: [users.id],
    references: [userStats.userId],
  }),
  quests: many(userQuests),
  inventory: many(userInventory),
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

// ─── Gamification Relations ───────────────────────────────────────────────────

export const charactersRelations = relations(characters, ({ one }) => ({
  user: one(users, {
    fields: [characters.userId],
    references: [users.id],
  }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}));

export const questsRelations = relations(quests, ({ many }) => ({
  userQuests: many(userQuests),
}));

export const userQuestsRelations = relations(userQuests, ({ one }) => ({
  user: one(users, {
    fields: [userQuests.userId],
    references: [users.id],
  }),
  quest: one(quests, {
    fields: [userQuests.questId],
    references: [quests.id],
  }),
}));

// ─── Listening Relations ──────────────────────────────────────────────────────

export const listeningsRelations = relations(listenings, ({ many }) => ({
  questions: many(listeningQuestions),
  submissions: many(userListeningSubmissions),
}));

export const listeningQuestionsRelations = relations(listeningQuestions, ({ one, many }) => ({
  listening: one(listenings, {
    fields: [listeningQuestions.listeningId],
    references: [listenings.id],
  }),
  options: many(listeningQuestionOptions),
}));

export const listeningQuestionOptionsRelations = relations(listeningQuestionOptions, ({ one }) => ({
  question: one(listeningQuestions, {
    fields: [listeningQuestionOptions.questionId],
    references: [listeningQuestions.id],
  }),
}));

export const userListeningSubmissionsRelations = relations(userListeningSubmissions, ({ one }) => ({
  user: one(users, {
    fields: [userListeningSubmissions.userId],
    references: [users.id],
  }),
  listening: one(listenings, {
    fields: [userListeningSubmissions.listeningId],
    references: [listenings.id],
  }),
}));

export const shopItemsRelations = relations(shopItems, ({ many }) => ({
  inventory: many(userInventory),
}));

export const userInventoryRelations = relations(userInventory, ({ one }) => ({
  user: one(users, {
    fields: [userInventory.userId],
    references: [users.id],
  }),
  item: one(shopItems, {
    fields: [userInventory.itemId],
    references: [shopItems.id],
  }),
}));

export const leaderboardSnapshotsRelations = relations(leaderboardSnapshots, ({ one }) => ({
  user: one(users, {
    fields: [leaderboardSnapshots.userId],
    references: [users.id],
  }),
}));
