-- AlterTable
ALTER TABLE `pay_runs` ADD COLUMN `expenseId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `pay_runs_expenseId_key` ON `pay_runs`(`expenseId`);

-- AddForeignKey
ALTER TABLE `pay_runs` ADD CONSTRAINT `pay_runs_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `expenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
