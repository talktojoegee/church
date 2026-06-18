-- Bulk SMS scheduling
ALTER TABLE `bulk_sms_messages` ADD COLUMN `scheduleId` VARCHAR(191) NULL;

CREATE TABLE `bulk_sms_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `phoneGroupIds` JSON NULL,
    `phoneNumbers` TEXT NULL,
    `message` TEXT NOT NULL,
    `recurrence` ENUM('ONCE', 'WEEKLY') NOT NULL DEFAULT 'ONCE',
    `recurrenceDays` JSON NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `nextRunAt` DATETIME(3) NOT NULL,
    `lastRunAt` DATETIME(3) NULL,
    `lastRunError` TEXT NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'CANCELLED', 'FAILED') NOT NULL DEFAULT 'ACTIVE',
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bulk_sms_schedules_branchId_idx`(`branchId`),
    INDEX `bulk_sms_schedules_status_idx`(`status`),
    INDEX `bulk_sms_schedules_nextRunAt_idx`(`nextRunAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `bulk_sms_messages_scheduleId_idx` ON `bulk_sms_messages`(`scheduleId`);

ALTER TABLE `bulk_sms_messages` ADD CONSTRAINT `bulk_sms_messages_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `bulk_sms_schedules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `bulk_sms_schedules` ADD CONSTRAINT `bulk_sms_schedules_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `bulk_sms_schedules` ADD CONSTRAINT `bulk_sms_schedules_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
