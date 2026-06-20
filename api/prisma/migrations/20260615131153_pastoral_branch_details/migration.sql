-- AlterTable
ALTER TABLE `branches` ADD COLUMN `assistantPastorId` VARCHAR(191) NULL,
    ADD COLUMN `branchPastorId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `members` ADD COLUMN `pastoralRole` ENUM('NONE', 'PASTOR', 'ASSISTANT_PASTOR') NOT NULL DEFAULT 'NONE';

-- AddForeignKey
ALTER TABLE `branches` ADD CONSTRAINT `branches_branchPastorId_fkey` FOREIGN KEY (`branchPastorId`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `branches` ADD CONSTRAINT `branches_assistantPastorId_fkey` FOREIGN KEY (`assistantPastorId`) REFERENCES `members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
