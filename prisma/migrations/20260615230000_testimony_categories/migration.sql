-- CreateTable
CREATE TABLE `testimony_categories` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `testimony_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate distinct category names
INSERT INTO `testimony_categories` (`id`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT
    CONCAT('mig_', REPLACE(UUID(), '-', '')),
    t.`category`,
    NULL,
    NOW(3),
    NOW(3)
FROM `testimonies` t
WHERE t.`category` IS NOT NULL AND TRIM(t.`category`) <> ''
GROUP BY t.`category`;

-- Add categoryId column
ALTER TABLE `testimonies` ADD COLUMN `categoryId` VARCHAR(191) NULL;

-- Link testimonies to migrated categories
UPDATE `testimonies` t
INNER JOIN `testimony_categories` tc ON tc.`name` = t.`category`
SET t.`categoryId` = tc.`id`
WHERE t.`category` IS NOT NULL AND TRIM(t.`category`) <> '';

-- Drop old category column
ALTER TABLE `testimonies` DROP COLUMN `category`;

-- CreateIndex
CREATE INDEX `testimonies_categoryId_idx` ON `testimonies`(`categoryId`);

-- AddForeignKey
ALTER TABLE `testimonies` ADD CONSTRAINT `testimonies_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `testimony_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
