-- AlterTable
ALTER TABLE `funds` ADD COLUMN `isDefault` BOOLEAN NOT NULL DEFAULT false;

-- Set one default account per branch (oldest fund by id)
UPDATE `funds` f
INNER JOIN (
    SELECT `branchId`, MIN(`id`) AS `id`
    FROM `funds`
    GROUP BY `branchId`
) d ON f.`id` = d.`id`
SET f.`isDefault` = true;
