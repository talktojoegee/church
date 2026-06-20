-- AlterTable
ALTER TABLE `salary_components` ADD COLUMN `givingTypeId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `payroll_period_adjustments` ADD COLUMN `givingTypeId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `payslips` ADD COLUMN `expenseId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `contributions` ADD COLUMN `payslipId` VARCHAR(191) NULL,
    ADD COLUMN `payrollDeduction` VARCHAR(191) NULL;

-- DropForeignKey
ALTER TABLE `pay_runs` DROP FOREIGN KEY `pay_runs_expenseId_fkey`;

-- DropIndex
DROP INDEX `pay_runs_expenseId_key` ON `pay_runs`;

-- AlterTable
ALTER TABLE `pay_runs` DROP COLUMN `expenseId`;

-- CreateIndex
CREATE UNIQUE INDEX `payslips_expenseId_key` ON `payslips`(`expenseId`);

-- CreateIndex
CREATE INDEX `contributions_payslipId_idx` ON `contributions`(`payslipId`);

-- AddForeignKey
ALTER TABLE `salary_components` ADD CONSTRAINT `salary_components_givingTypeId_fkey` FOREIGN KEY (`givingTypeId`) REFERENCES `giving_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll_period_adjustments` ADD CONSTRAINT `payroll_period_adjustments_givingTypeId_fkey` FOREIGN KEY (`givingTypeId`) REFERENCES `giving_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payslips` ADD CONSTRAINT `payslips_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `expenses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contributions` ADD CONSTRAINT `contributions_payslipId_fkey` FOREIGN KEY (`payslipId`) REFERENCES `payslips`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
