CREATE DATABASE IF NOT EXISTS production;
USE production;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  password VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description VARCHAR(100) NOT NULL,
  amount VARCHAR(100),
  config json,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


