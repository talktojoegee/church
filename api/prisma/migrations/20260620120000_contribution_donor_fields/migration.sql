-- Online giving donor details on income records
ALTER TABLE `contributions` ADD COLUMN `donorName` VARCHAR(191) NULL;
ALTER TABLE `contributions` ADD COLUMN `donorEmail` VARCHAR(191) NULL;
