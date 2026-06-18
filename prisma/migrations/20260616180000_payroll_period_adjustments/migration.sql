CREATE TABLE `payroll_period_adjustments` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('ALLOWANCE', 'DEDUCTION') NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `payRunId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payroll_period_adjustments_branchId_period_idx`(`branchId`, `period`),
    INDEX `payroll_period_adjustments_employeeId_idx`(`employeeId`),
    INDEX `payroll_period_adjustments_payRunId_idx`(`payRunId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payroll_period_adjustments` ADD CONSTRAINT `payroll_period_adjustments_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `payroll_period_adjustments` ADD CONSTRAINT `payroll_period_adjustments_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `payroll_period_adjustments` ADD CONSTRAINT `payroll_period_adjustments_payRunId_fkey` FOREIGN KEY (`payRunId`) REFERENCES `pay_runs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
