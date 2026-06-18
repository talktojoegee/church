-- Link employees to system user accounts (one user per employee).
ALTER TABLE `employees` ADD COLUMN `userId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `employees_userId_key` ON `employees`(`userId`);

ALTER TABLE `employees` ADD CONSTRAINT `employees_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
