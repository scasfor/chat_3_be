BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [email_verified_at] DATETIME2,
    [password] NVARCHAR(1000) NOT NULL,
    [remember_token] NVARCHAR(1000),
    [is_active] BIT NOT NULL CONSTRAINT [users_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[categories] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(1000) NOT NULL,
    [sort_order] INT NOT NULL CONSTRAINT [categories_sort_order_df] DEFAULT 0,
    [status] INT NOT NULL CONSTRAINT [categories_status_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [categories_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [categories_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[category_topics] (
    [id] INT NOT NULL IDENTITY(1,1),
    [category_id] INT NOT NULL,
    [topic] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [category_topics_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [category_topics_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[intents] (
    [id] INT NOT NULL IDENTITY(1,1),
    [category_id] INT NOT NULL,
    [intent_key] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [normalized_title] NVARCHAR(1000),
    [response] NVARCHAR(max) NOT NULL,
    [priority] INT NOT NULL CONSTRAINT [intents_priority_df] DEFAULT 1,
    [is_active] BIT NOT NULL CONSTRAINT [intents_is_active_df] DEFAULT 1,
    [resource_link] NVARCHAR(1000),
    [source] NVARCHAR(1000),
    [reference_in_original_file] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [intents_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [intents_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [intents_intent_key_key] UNIQUE NONCLUSTERED ([intent_key])
);

-- CreateTable
CREATE TABLE [dbo].[intent_phrases] (
    [id] INT NOT NULL IDENTITY(1,1),
    [intent_id] INT NOT NULL,
    [phrase] NVARCHAR(max) NOT NULL,
    [normalized_phrase] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [intent_phrases_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [intent_phrases_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[intent_keywords] (
    [id] INT NOT NULL IDENTITY(1,1),
    [intent_id] INT NOT NULL,
    [keyword] NVARCHAR(1000) NOT NULL,
    [weight] INT NOT NULL CONSTRAINT [intent_keywords_weight_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [intent_keywords_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [intent_keywords_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[follow_up_intents] (
    [id] INT NOT NULL IDENTITY(1,1),
    [intent_id] INT NOT NULL,
    [follow_up_intent_id] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [follow_up_intents_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [follow_up_intents_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[synonyms] (
    [id] INT NOT NULL IDENTITY(1,1),
    [word] NVARCHAR(1000) NOT NULL,
    [synonym] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [synonyms_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [synonyms_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[conversations] (
    [id] INT NOT NULL IDENTITY(1,1),
    [session_id] NVARCHAR(1000) NOT NULL,
    [user_message] NVARCHAR(max) NOT NULL,
    [normalized_message] NVARCHAR(max),
    [intent_id] INT,
    [confidence] DECIMAL(5,2),
    [bot_response] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [conversations_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [conversations_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[unmatched_questions] (
    [id] INT NOT NULL IDENTITY(1,1),
    [question] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [unmatched_questions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [unmatched_questions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[settings] (
    [id] INT NOT NULL IDENTITY(1,1),
    [key] NVARCHAR(1000) NOT NULL,
    [value] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [settings_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [settings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [settings_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [category_topics_category_id_idx] ON [dbo].[category_topics]([category_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [intents_normalized_title_idx] ON [dbo].[intents]([normalized_title]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [intent_phrases_intent_id_idx] ON [dbo].[intent_phrases]([intent_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [intent_phrases_normalized_phrase_idx] ON [dbo].[intent_phrases]([normalized_phrase]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [intent_keywords_intent_id_idx] ON [dbo].[intent_keywords]([intent_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [follow_up_intents_intent_id_idx] ON [dbo].[follow_up_intents]([intent_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [follow_up_intents_follow_up_intent_id_idx] ON [dbo].[follow_up_intents]([follow_up_intent_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [synonyms_word_idx] ON [dbo].[synonyms]([word]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [synonyms_synonym_idx] ON [dbo].[synonyms]([synonym]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [conversations_session_id_idx] ON [dbo].[conversations]([session_id]);

-- AddForeignKey
ALTER TABLE [dbo].[category_topics] ADD CONSTRAINT [category_topics_category_id_fkey] FOREIGN KEY ([category_id]) REFERENCES [dbo].[categories]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[intents] ADD CONSTRAINT [intents_category_id_fkey] FOREIGN KEY ([category_id]) REFERENCES [dbo].[categories]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[intent_phrases] ADD CONSTRAINT [intent_phrases_intent_id_fkey] FOREIGN KEY ([intent_id]) REFERENCES [dbo].[intents]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[intent_keywords] ADD CONSTRAINT [intent_keywords_intent_id_fkey] FOREIGN KEY ([intent_id]) REFERENCES [dbo].[intents]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[follow_up_intents] ADD CONSTRAINT [follow_up_intents_intent_id_fkey] FOREIGN KEY ([intent_id]) REFERENCES [dbo].[intents]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[follow_up_intents] ADD CONSTRAINT [follow_up_intents_follow_up_intent_id_fkey] FOREIGN KEY ([follow_up_intent_id]) REFERENCES [dbo].[intents]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[conversations] ADD CONSTRAINT [conversations_intent_id_fkey] FOREIGN KEY ([intent_id]) REFERENCES [dbo].[intents]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
