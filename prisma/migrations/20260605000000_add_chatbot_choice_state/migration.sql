-- AlterTable
ALTER TABLE "ChatbotConversation" ADD COLUMN "currentQuestion" TEXT;
ALTER TABLE "ChatbotConversation" ADD COLUMN "activeChoices" TEXT;
ALTER TABLE "ChatbotConversation" ADD COLUMN "conversationState" TEXT;
