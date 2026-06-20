-- CreateTable
CREATE TABLE `outreach_types` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `outreach_types_branchId_idx`(`branchId`),
    UNIQUE INDEX `outreach_types_branchId_name_key`(`branchId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate distinct outreach types per branch
INSERT INTO `outreach_types` (`id`, `branchId`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT
    CONCAT('mig_', REPLACE(UUID(), '-', '')),
    o.`branchId`,
    o.`type`,
    NULL,
    NOW(3),
    NOW(3)
FROM `outreaches` o
WHERE o.`type` IS NOT NULL AND TRIM(o.`type`) <> ''
GROUP BY o.`branchId`, o.`type`;

-- Add new columns
ALTER TABLE `outreaches` ADD COLUMN `typeId` VARCHAR(191) NULL;
ALTER TABLE `outreaches` ADD COLUMN `state` VARCHAR(191) NULL;

-- Link outreaches to migrated types
UPDATE `outreaches` o
INNER JOIN `outreach_types` ot ON ot.`branchId` = o.`branchId` AND ot.`name` = o.`type`
SET o.`typeId` = ot.`id`
WHERE o.`type` IS NOT NULL AND TRIM(o.`type`) <> '';

-- Infer Lagos state where location mentions Lagos
UPDATE `outreaches` SET `state` = 'Lagos' WHERE `location` LIKE '%Lagos%';

-- Drop old type column
ALTER TABLE `outreaches` DROP COLUMN `type`;

-- CreateTable
CREATE TABLE `outreach_images` (
    `id` VARCHAR(191) NOT NULL,
    `outreachId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `outreach_images_outreachId_idx`(`outreachId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `outreaches_typeId_idx` ON `outreaches`(`typeId`);
CREATE INDEX `outreaches_state_idx` ON `outreaches`(`state`);
CREATE INDEX `outreaches_status_idx` ON `outreaches`(`status`);

-- AddForeignKey
ALTER TABLE `outreach_types` ADD CONSTRAINT `outreach_types_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `outreaches` ADD CONSTRAINT `outreaches_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `outreach_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `outreach_images` ADD CONSTRAINT `outreach_images_outreachId_fkey` FOREIGN KEY (`outreachId`) REFERENCES `outreaches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
