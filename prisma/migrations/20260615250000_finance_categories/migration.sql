-- CreateTable giving_types
CREATE TABLE `giving_types` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `giving_types_branchId_idx`(`branchId`),
    UNIQUE INDEX `giving_types_branchId_name_key`(`branchId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate contribution types per branch
INSERT INTO `giving_types` (`id`, `branchId`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT
    CONCAT('mig_gt_', REPLACE(UUID(), '-', '')),
    c.`branchId`,
    c.`type`,
    NULL,
    NOW(3),
    NOW(3)
FROM `contributions` c
WHERE c.`type` IS NOT NULL
GROUP BY c.`branchId`, c.`type`;

-- Default types for branches with no contributions yet
INSERT INTO `giving_types` (`id`, `branchId`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT CONCAT('mig_gt_', REPLACE(UUID(), '-', '')), b.`id`, 'Tithe', 'Regular tithe giving', NOW(3), NOW(3)
FROM `branches` b
WHERE NOT EXISTS (SELECT 1 FROM `giving_types` gt WHERE gt.`branchId` = b.`id` AND gt.`name` = 'Tithe');

INSERT INTO `giving_types` (`id`, `branchId`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT CONCAT('mig_gt_', REPLACE(UUID(), '-', '')), b.`id`, 'Offering', 'Sunday and special offerings', NOW(3), NOW(3)
FROM `branches` b
WHERE NOT EXISTS (SELECT 1 FROM `giving_types` gt WHERE gt.`branchId` = b.`id` AND gt.`name` = 'Offering');

-- CreateTable expense_categories
CREATE TABLE `expense_categories` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `expense_categories_branchId_idx`(`branchId`),
    UNIQUE INDEX `expense_categories_branchId_name_key`(`branchId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `expense_categories` (`id`, `branchId`, `name`, `description`, `createdAt`, `updatedAt`)
SELECT
    CONCAT('mig_ec_', REPLACE(UUID(), '-', '')),
    e.`branchId`,
    e.`category`,
    NULL,
    NOW(3),
    NOW(3)
FROM `expenses` e
WHERE e.`category` IS NOT NULL AND TRIM(e.`category`) <> ''
GROUP BY e.`branchId`, e.`category`;

-- Add FK columns
ALTER TABLE `contributions` ADD COLUMN `givingTypeId` VARCHAR(191) NULL;
ALTER TABLE `expenses` ADD COLUMN `categoryId` VARCHAR(191) NULL;

UPDATE `contributions` c
INNER JOIN `giving_types` gt ON gt.`branchId` = c.`branchId` AND gt.`name` = c.`type`
SET c.`givingTypeId` = gt.`id`;

UPDATE `expenses` e
INNER JOIN `expense_categories` ec ON ec.`branchId` = e.`branchId` AND ec.`name` = e.`category`
SET e.`categoryId` = ec.`id`;

ALTER TABLE `contributions` DROP COLUMN `type`;
ALTER TABLE `expenses` DROP COLUMN `category`;

CREATE INDEX `contributions_givingTypeId_idx` ON `contributions`(`givingTypeId`);
CREATE INDEX `expenses_categoryId_idx` ON `expenses`(`categoryId`);

ALTER TABLE `giving_types` ADD CONSTRAINT `giving_types_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `expense_categories` ADD CONSTRAINT `expense_categories_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `contributions` ADD CONSTRAINT `contributions_givingTypeId_fkey` FOREIGN KEY (`givingTypeId`) REFERENCES `giving_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `expense_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
