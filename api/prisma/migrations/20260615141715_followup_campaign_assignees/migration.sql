-- CreateTable
CREATE TABLE `follow_up_campaign_assignees` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `notifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `follow_up_campaign_assignees_campaignId_idx`(`campaignId`),
    INDEX `follow_up_campaign_assignees_userId_idx`(`userId`),
    UNIQUE INDEX `follow_up_campaign_assignees_campaignId_userId_key`(`campaignId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `follow_up_campaign_assignees` ADD CONSTRAINT `follow_up_campaign_assignees_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `follow_up_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow_up_campaign_assignees` ADD CONSTRAINT `follow_up_campaign_assignees_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
