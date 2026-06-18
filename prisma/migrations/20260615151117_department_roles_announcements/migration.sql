-- Backfill null roles before making column required
UPDATE `member_departments` SET `role` = 'MEMBER' WHERE `role` IS NULL OR `role` = '';

-- Sync existing department leaders to HOD role
UPDATE `member_departments` md
INNER JOIN `departments` d ON d.id = md.departmentId AND d.leaderId = md.memberId
SET md.`role` = 'HOD';

-- AlterTable
ALTER TABLE `member_departments` MODIFY `role` ENUM('HOD', 'ASSISTANT', 'SECRETARY', 'MEMBER') NOT NULL DEFAULT 'MEMBER';

-- CreateTable
CREATE TABLE `department_announcements` (
    `id` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'BOTH',
    `recipientCount` INTEGER NOT NULL DEFAULT 0,
    `sentById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `department_announcements_departmentId_idx`(`departmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `department_announcements` ADD CONSTRAINT `department_announcements_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
