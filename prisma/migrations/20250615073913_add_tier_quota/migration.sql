-- CreateTable
CREATE TABLE `TierQuota` (
    `date` VARCHAR(191) NOT NULL,
    `tier` VARCHAR(191) NOT NULL,
    `usage` INTEGER NOT NULL DEFAULT 0,
    `messageId` VARCHAR(191) NULL,

    INDEX `TierQuota_date_idx`(`date`),
    PRIMARY KEY (`date`, `tier`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
