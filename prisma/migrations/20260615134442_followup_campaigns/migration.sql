-- CreateTable
CREATE TABLE `follow_up_campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `objective` TEXT NULL,
    `type` ENUM('FIRST_TIMER', 'ABSENTEE', 'NEW_CONVERT', 'PRAYER_REQUEST', 'COUNSELING', 'OTHER') NOT NULL DEFAULT 'FIRST_TIMER',
    `dueDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `follow_up_campaigns_branchId_idx`(`branchId`),
    INDEX `follow_up_campaigns_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `follow_up_recipients` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'CONTACTED', 'COMPLETED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `note` TEXT NULL,
    `contactedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `follow_up_recipients_campaignId_idx`(`campaignId`),
    INDEX `follow_up_recipients_memberId_idx`(`memberId`),
    INDEX `follow_up_recipients_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `follow_up_campaigns` ADD CONSTRAINT `follow_up_campaigns_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow_up_recipients` ADD CONSTRAINT `follow_up_recipients_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `follow_up_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow_up_recipients` ADD CONSTRAINT `follow_up_recipients_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
