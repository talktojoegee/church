-- CreateTable
CREATE TABLE `follow_up_interactions` (
    `id` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NULL,
    `recipientId` VARCHAR(191) NULL,
    `note` TEXT NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'NOTE',
    `performedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `follow_up_interactions_memberId_idx`(`memberId`),
    INDEX `follow_up_interactions_campaignId_idx`(`campaignId`),
    INDEX `follow_up_interactions_recipientId_idx`(`recipientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `follow_up_interactions` ADD CONSTRAINT `follow_up_interactions_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow_up_interactions` ADD CONSTRAINT `follow_up_interactions_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `follow_up_campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow_up_interactions` ADD CONSTRAINT `follow_up_interactions_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `follow_up_recipients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow_up_interactions` ADD CONSTRAINT `follow_up_interactions_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
