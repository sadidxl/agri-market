-- =====================================================================
-- AgriMarket — MySQL Schema
-- Run with: mysql -u root -p < schema.sql
-- Requires MySQL 5.7+ (CHECK constraints are enforced on 8.0.16+; on
-- older versions they are parsed but not enforced, everything else works).
-- =====================================================================

DROP DATABASE IF EXISTS agrimarket;
CREATE DATABASE agrimarket CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agrimarket;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- users  (merges Supabase's auth.users + profiles + user_roles)
-- IDs are app-generated UUID v4 strings (CHAR(36)) for compatibility
-- with the existing React frontend, which already expects string ids.
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id              CHAR(36)      NOT NULL PRIMARY KEY,
    email           VARCHAR(255)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    first_name      VARCHAR(100)  NOT NULL DEFAULT '',
    last_name       VARCHAR(100)  NOT NULL DEFAULT '',
    phone           VARCHAR(30)   DEFAULT NULL,
    role            ENUM('buyer','farmer','admin') NOT NULL DEFAULT 'buyer',
    avatar_url      VARCHAR(500)  DEFAULT NULL,
    address         VARCHAR(255)  DEFAULT NULL,
    city            VARCHAR(100)  DEFAULT NULL,
    state           VARCHAR(100)  DEFAULT NULL,
    country         VARCHAR(100)  DEFAULT 'Bangladesh',
    is_kyc_verified TINYINT(1)    NOT NULL DEFAULT 0,
    kyc_status      ENUM('pending','submitted','verified','rejected') NOT NULL DEFAULT 'pending',
    is_active       TINYINT(1)    NOT NULL DEFAULT 1,
    reset_token         VARCHAR(255) DEFAULT NULL,
    reset_token_expires TIMESTAMP    NULL DEFAULT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
CREATE TABLE categories (
    id          CHAR(36)     NOT NULL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon        VARCHAR(100),
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------
CREATE TABLE products (
    id           CHAR(36)      NOT NULL PRIMARY KEY,
    farmer_id    CHAR(36)      NOT NULL,
    category_id  CHAR(36)      DEFAULT NULL,
    name         VARCHAR(255)  NOT NULL,
    description  TEXT,
    price        DECIMAL(10,2) NOT NULL CHECK (price > 0),
    unit         VARCHAR(20)   NOT NULL DEFAULT 'kg',
    stock        INT           NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url    VARCHAR(500),
    location     VARCHAR(255),
    is_active    TINYINT(1)    NOT NULL DEFAULT 1,
    is_featured  TINYINT(1)    NOT NULL DEFAULT 0,
    is_approved  TINYINT(1)    NOT NULL DEFAULT 1,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_farmer   FOREIGN KEY (farmer_id)   REFERENCES users(id)      ON DELETE CASCADE,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_products_farmer (farmer_id),
    INDEX idx_products_category (category_id),
    INDEX idx_products_active (is_active, is_approved),
    FULLTEXT INDEX ft_products_name_desc (name, description)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- product_images (gallery — product.image_url remains the primary image)
-- ---------------------------------------------------------------------
CREATE TABLE product_images (
    id         CHAR(36)     NOT NULL PRIMARY KEY,
    product_id CHAR(36)     NOT NULL,
    image_url  VARCHAR(500) NOT NULL,
    is_primary TINYINT(1)   NOT NULL DEFAULT 0,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_images_product (product_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- wishlists
-- ---------------------------------------------------------------------
CREATE TABLE wishlists (
    id         CHAR(36)  NOT NULL PRIMARY KEY,
    user_id    CHAR(36)  NOT NULL,
    product_id CHAR(36)  NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wishlists_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    CONSTRAINT fk_wishlists_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uq_wishlist_user_product (user_id, product_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- carts / cart_items  (one cart per buyer)
-- ---------------------------------------------------------------------
CREATE TABLE carts (
    id         CHAR(36)  NOT NULL PRIMARY KEY,
    user_id    CHAR(36)  NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cart_items (
    id         CHAR(36)  NOT NULL PRIMARY KEY,
    cart_id    CHAR(36)  NOT NULL,
    product_id CHAR(36)  NOT NULL,
    quantity   INT       NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cart_items_cart    FOREIGN KEY (cart_id)    REFERENCES carts(id)    ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uq_cart_product (cart_id, product_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- addresses (saved delivery addresses for checkout)
-- ---------------------------------------------------------------------
CREATE TABLE addresses (
    id           CHAR(36)     NOT NULL PRIMARY KEY,
    user_id      CHAR(36)     NOT NULL,
    label        VARCHAR(50)  DEFAULT 'Home',
    full_address VARCHAR(255) NOT NULL,
    city         VARCHAR(100) NOT NULL,
    state        VARCHAR(100) NOT NULL,
    is_default   TINYINT(1)   NOT NULL DEFAULT 0,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_addresses_user (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- orders / order_items
-- ---------------------------------------------------------------------
CREATE TABLE orders (
    id               CHAR(36)      NOT NULL PRIMARY KEY,
    buyer_id         CHAR(36)      DEFAULT NULL,
    order_number     VARCHAR(40)   NOT NULL UNIQUE,
    status           ENUM('pending','confirmed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
    subtotal         DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_fee     DECIMAL(10,2) NOT NULL DEFAULT 0,
    promo_code       VARCHAR(40)   DEFAULT NULL,
    discount_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_address VARCHAR(255),
    delivery_city    VARCHAR(100),
    delivery_state   VARCHAR(100),
    notes            TEXT,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_orders_buyer (buyer_id),
    INDEX idx_orders_status (status)
) ENGINE=InnoDB;

CREATE TABLE order_items (
    id           CHAR(36)      NOT NULL PRIMARY KEY,
    order_id     CHAR(36)      NOT NULL,
    product_id   CHAR(36)      DEFAULT NULL,
    farmer_id    CHAR(36)      DEFAULT NULL,
    product_name VARCHAR(255)  NOT NULL,
    quantity     INT           NOT NULL CHECK (quantity > 0),
    unit_price   DECIMAL(10,2) NOT NULL,
    total_price  DECIMAL(10,2) NOT NULL,
    created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_items_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_order_items_farmer  FOREIGN KEY (farmer_id)  REFERENCES users(id)    ON DELETE SET NULL,
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_farmer (farmer_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------
CREATE TABLE payments (
    id             CHAR(36)      NOT NULL PRIMARY KEY,
    order_id       CHAR(36)      NOT NULL,
    amount         DECIMAL(10,2) NOT NULL,
    payment_method ENUM('card','bank_transfer','bkash','rocket','nagad','cash_on_delivery') NOT NULL DEFAULT 'cash_on_delivery',
    status         ENUM('pending','processing','completed','failed','refunded') NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(100),
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_payments_order (order_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------
CREATE TABLE reviews (
    id          CHAR(36)  NOT NULL PRIMARY KEY,
    product_id  CHAR(36)  NOT NULL,
    user_id     CHAR(36)  NOT NULL,
    rating      TINYINT   NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    is_approved TINYINT(1) NOT NULL DEFAULT 1,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    UNIQUE KEY uq_review_product_user (product_id, user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- inventory_logs — audit trail of every stock change
-- ---------------------------------------------------------------------
CREATE TABLE inventory_logs (
    id               CHAR(36)     NOT NULL PRIMARY KEY,
    product_id       CHAR(36)     NOT NULL,
    farmer_id        CHAR(36)     NOT NULL,
    change_type      ENUM('initial','restock','sale','cancellation_restock','adjustment') NOT NULL,
    quantity_change  INT          NOT NULL,
    previous_stock   INT          NOT NULL,
    new_stock        INT          NOT NULL,
    reason           VARCHAR(255),
    order_id         CHAR(36)     DEFAULT NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_logs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_logs_farmer  FOREIGN KEY (farmer_id)  REFERENCES users(id)    ON DELETE CASCADE,
    INDEX idx_inventory_logs_product (product_id),
    INDEX idx_inventory_logs_farmer (farmer_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- promo_codes
-- ---------------------------------------------------------------------
CREATE TABLE promo_codes (
    id                   CHAR(36)      NOT NULL PRIMARY KEY,
    code                 VARCHAR(40)   NOT NULL UNIQUE,
    description          VARCHAR(255),
    discount_type        ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
    discount_value       DECIMAL(10,2) NOT NULL,
    min_order_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_discount_amount  DECIMAL(10,2) DEFAULT NULL,
    max_uses             INT           DEFAULT NULL,
    times_used           INT           NOT NULL DEFAULT 0,
    is_active            TINYINT(1)    NOT NULL DEFAULT 1,
    expires_at           DATETIME      DEFAULT NULL,
    created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================================
-- Default categories
-- =====================================================================
INSERT INTO categories (id, name, description, icon) VALUES
  (UUID(), 'Vegetables', 'Fresh vegetables from local farms', 'carrot'),
  (UUID(), 'Fruits', 'Seasonal and exotic fruits', 'apple'),
  (UUID(), 'Grains', 'Rice, wheat, maize and other grains', 'wheat'),
  (UUID(), 'Dairy', 'Milk, cheese, and dairy products', 'milk'),
  (UUID(), 'Poultry', 'Chicken, eggs, and poultry products', 'egg'),
  (UUID(), 'Livestock', 'Cattle, goat, and meat products', 'beef'),
  (UUID(), 'Tubers', 'Yam, cassava, potatoes', 'potato'),
  (UUID(), 'Spices', 'Herbs and spices', 'pepper');

-- =====================================================================
-- Default promo codes
-- =====================================================================
INSERT INTO promo_codes (id, code, description, discount_type, discount_value, min_order_amount, max_discount_amount, max_uses, is_active) VALUES
  (UUID(), 'AGRI10', '10% off your order', 'percentage', 10, 1000, 500, NULL, 1),
  (UUID(), 'WELCOME50', 'Flat ৳50 off for new buyers', 'fixed', 50, 500, NULL, NULL, 1),
  (UUID(), 'FARMFRESH20', '20% off orders over ৳3000', 'percentage', 20, 3000, 1500, 100, 1);

-- =====================================================================
-- withdrawals — farmer payout requests against their marketplace earnings
-- =====================================================================
CREATE TABLE withdrawals (
    id              CHAR(36)      NOT NULL PRIMARY KEY,
    farmer_id       CHAR(36)      NOT NULL,
    amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    method          ENUM('bkash','nagad','bank') NOT NULL,
    account_details VARCHAR(255)  NOT NULL,
    status          ENUM('pending','approved','completed','rejected') NOT NULL DEFAULT 'pending',
    admin_note      VARCHAR(255)  DEFAULT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_withdrawals_farmer FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_withdrawals_farmer (farmer_id),
    INDEX idx_withdrawals_status (status)
) ENGINE=InnoDB;
