-- AzerothCore Dashboard database
-- Run once as a privileged MySQL user (e.g. root):
--   mysql -u root -p < sql/acore_dashboard.sql

CREATE DATABASE IF NOT EXISTS `acore_dashboard`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `acore_dashboard`.* TO 'acore'@'localhost';
FLUSH PRIVILEGES;

USE `acore_dashboard`;

CREATE TABLE IF NOT EXISTS `settings` (
  `key`   VARCHAR(64)  NOT NULL,
  `value` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Dashboard-wide settings';

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(64)  NOT NULL DEFAULT '',
  `ip`         VARCHAR(45)  NOT NULL DEFAULT '',
  `action`     VARCHAR(128) NOT NULL,
  `details`    TEXT         DEFAULT NULL,
  `success`    TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_username`  (`username`),
  KEY `idx_action`    (`action`),
  KEY `idx_created`   (`created_at`),
  KEY `idx_success`   (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Dashboard audit log';

CREATE TABLE IF NOT EXISTS `alerts` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `type`        VARCHAR(64)     NOT NULL,
  `severity`    ENUM('info','warning','critical') NOT NULL DEFAULT 'warning',
  `title`       VARCHAR(255)    NOT NULL,
  `description` TEXT            DEFAULT NULL,
  `metadata`    JSON            DEFAULT NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type`       (`type`),
  KEY `idx_severity`   (`severity`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='System alert log';

CREATE TABLE IF NOT EXISTS `scheduled_tasks` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100)  NOT NULL,
  `type`        ENUM('restart','backup') NOT NULL,
  `hour`        TINYINT UNSIGNED NOT NULL DEFAULT 3,
  `minute`      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `days`        VARCHAR(20)   NOT NULL DEFAULT '0,1,2,3,4,5,6',
  `enabled`     TINYINT(1)    NOT NULL DEFAULT 1,
  `config`      JSON          NULL,
  `last_run`    DATETIME      NULL,
  `last_status` VARCHAR(255)  NULL,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Dashboard scheduled tasks';

CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(255)    NOT NULL,
  `description` TEXT            DEFAULT NULL,
  `start`       DATETIME        NOT NULL,
  `end`         DATETIME        NOT NULL,
  `type`        ENUM('custom','note') NOT NULL DEFAULT 'custom',
  `created_by`  VARCHAR(64)     NOT NULL DEFAULT '',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_start` (`start`),
  KEY `idx_end`   (`end`),
  KEY `idx_type`  (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Dashboard calendar custom events';

CREATE TABLE IF NOT EXISTS `analytics_history` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `type`        VARCHAR(32)     NOT NULL,
  `value`       FLOAT           NOT NULL DEFAULT 0,
  `recorded_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type_recorded` (`type`, `recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historical analytics snapshots';

CREATE TABLE IF NOT EXISTS `active_sessions` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `username`    VARCHAR(64)     NOT NULL,
  `token_hash`  VARCHAR(64)     NOT NULL,
  `ip`          VARCHAR(45)     NOT NULL DEFAULT '',
  `user_agent`  VARCHAR(512)    NOT NULL DEFAULT '',
  `gmlevel`     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_active` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked`     TINYINT(1)      NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_username`   (`username`),
  KEY `idx_token_hash` (`token_hash`),
  KEY `idx_revoked`    (`revoked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Dashboard active sessions';
