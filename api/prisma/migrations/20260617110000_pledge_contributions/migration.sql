-- AlterTable
ALTER TABLE `contributions` ADD COLUMN `pledgeId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `contributions_pledgeId_idx` ON `contributions`(`pledgeId`);

-- AddForeignKey
ALTER TABLE `contributions` ADD CONSTRAINT `contributions_pledgeId_fkey` FOREIGN KEY (`pledgeId`) REFERENCES `pledges`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
