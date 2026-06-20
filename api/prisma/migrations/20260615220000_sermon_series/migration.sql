-- CreateTable
CREATE TABLE `sermon_series` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `sermon_series_branchId_idx`(`branchId`),
    UNIQUE INDEX `sermon_series_branchId_name_key`(`branchId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate distinct series names into sermon_series
INSERT INTO `sermon_series` (`id`, `branchId`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT
    CONCAT('mig_', REPLACE(UUID(), '-', '')),
    s.`branchId`,
    s.`series`,
    NULL,
    NOW(3),
    NOW(3)
FROM `sermons` s
WHERE s.`series` IS NOT NULL AND TRIM(s.`series`) <> ''
GROUP BY s.`branchId`, s.`series`;

-- Add seriesId column
ALTER TABLE `sermons` ADD COLUMN `seriesId` VARCHAR(191) NULL;

-- Link sermons to migrated series
UPDATE `sermons` s
INNER JOIN `sermon_series` ss ON ss.`branchId` = s.`branchId` AND ss.`name` = s.`series`
SET s.`seriesId` = ss.`id`
WHERE s.`series` IS NOT NULL AND TRIM(s.`series`) <> '';

-- Drop old series column
ALTER TABLE `sermons` DROP COLUMN `series`;

-- CreateIndex
CREATE INDEX `sermons_seriesId_idx` ON `sermons`(`seriesId`);

-- AddForeignKey
ALTER TABLE `sermon_series` ADD CONSTRAINT `sermon_series_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `sermons` ADD CONSTRAINT `sermons_seriesId_fkey` FOREIGN KEY (`seriesId`) REFERENCES `sermon_series`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
