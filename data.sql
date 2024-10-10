CREATE DATABASE DemoTrigger;

-- create table example trigger
CREATE TABLE `student` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(45) DEFAULT NULL,
    `age` int(11) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 DEFAULT CHARSET = utf8;

CREATE TABLE `total` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `total` INT(11) DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 1 DEFAULT CHARSET = utf8;

-- create trigger
DELIMITER $ $ CREATE TRIGGER `student_before_insert` BEFORE
INSERT
    ON `student` FOR EACH ROW BEGIN IF NEW.age < 18 THEN SIGNAL SQLSTATE '45000'
SET
    MESSAGE_TEXT = 'Age must be greater than 18';

END IF;

END $ $ DELIMITER;

-- create trigger when insert data into student table, total table will be updated
DELIMITER $ $ CREATE TRIGGER `student_after_insert_total`
AFTER
INSERT
    ON `student` FOR EACH ROW BEGIN DECLARE total INT;

SELECT
    COUNT(*) INTO total
FROM
    `student`;

IF (
    SELECT
        COUNT(*)
    FROM
        `total`
) = 0 THEN
INSERT INTO
    `total` (`total`)
VALUES
    (total);

ELSE
UPDATE
    `total`
SET
    `total` = total;

END IF;

END $ $ DELIMITER;

DELIMITER $ $ CREATE TRIGGER `student_after_delete_total`
AFTER
    DELETE ON `student` FOR EACH ROW BEGIN DECLARE total INT;

SELECT
    COUNT(*) INTO total
FROM
    `student`;

IF (
    SELECT
        COUNT(*)
    FROM
        `total`
) = 0 THEN
INSERT INTO
    `total` (`total`)
VALUES
    (total);

ELSE
UPDATE
    `total`
SET
    `total` = total;

END IF;

END $ $ DELIMITER;

-- insert data
INSERT INTO
    `student` (`name`, `age`)
VALUES
    ('Tom', 20);

INSERT INTO
    `student` (`name`, `age`)
VALUES
    ('Jerry', 15);

-- create produce 
DELIMITER $ $ CREATE PROCEDURE `insert_student`(IN name VARCHAR(45), IN age INT) BEGIN
INSERT INTO
    `student` (`name`, `age`)
VALUES
    (name, age);

END $ $ DELIMITER;

-- Delete data
DELIMITER $ $ CREATE PROCEDURE `delete_student`(IN id INT) BEGIN
DELETE FROM
    `student`
WHERE
    `id` = id;

END $ $ DELIMITER;

-- call produce
CALL insert_student('Tom', 20);

CALL insert_student('Grab', 22);

CALL delete_student(7);

DELETE FROM
    `student`
WHERE
    `id` = 10;