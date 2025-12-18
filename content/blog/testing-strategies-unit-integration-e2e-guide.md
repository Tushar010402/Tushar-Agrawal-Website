---
title: "Testing Strategies: Unit, Integration, and E2E Testing Complete Guide"
description: "Master software testing with comprehensive guide on unit testing, integration testing, and end-to-end testing. Learn pytest, Jest, Playwright, testing pyramids, TDD, and best practices for reliable code."
date: "2024-12-17"
author: "Tushar Agrawal"
tags: ["Testing", "Unit Testing", "Integration Testing", "E2E Testing", "pytest", "Jest", "Playwright", "TDD", "Backend"]
image: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&h=630&fit=crop"
published: true
---

## Introduction

Testing is not optional—it's essential for building reliable software. A well-designed testing strategy catches bugs early, enables confident refactoring, and serves as living documentation. This guide covers the complete testing pyramid with practical examples.

## The Testing Pyramid

```
         ╱╲
        ╱  ╲      E2E Tests (Few)
       ╱────╲     - Slow, expensive
      ╱      ╲    - Test complete flows
     ╱────────╲
    ╱          ╲  Integration Tests (Some)
   ╱────────────╲ - Medium speed
  ╱              ╲- Test component interactions
 ╱────────────────╲
╱                  ╲ Unit Tests (Many)
╱────────────────────╲- Fast, cheap
                       - Test individual functions
```

## Unit Testing

Unit tests verify individual functions or methods in isolation.

### Python with pytest

```python
# src/services/order_service.py
from decimal import Decimal
from typing import List
from dataclasses import dataclass

@dataclass
class OrderItem:
    product_id: str
    quantity: int
    price: Decimal

@dataclass
class Order:
    items: List[OrderItem]
    discount_percent: Decimal = Decimal("0")

    def calculate_subtotal(self) -> Decimal:
        return sum(
            item.price * item.quantity
            for item in self.items
        )

    def calculate_discount(self) -> Decimal:
        subtotal = self.calculate_subtotal()
        return subtotal * (self.discount_percent / 100)

    def calculate_total(self) -> Decimal:
        return self.calculate_subtotal() - self.calculate_discount()

    def add_item(self, item: OrderItem) -> None:
        existing = next(
            (i for i in self.items if i.product_id == item.product_id),
            None
        )
        if existing:
            existing.quantity += item.quantity
        else:
            self.items.append(item)


# tests/test_order_service.py
import pytest
from decimal import Decimal
from src.services.order_service import Order, OrderItem


class TestOrder:
    """Unit tests for Order class"""

    @pytest.fixture
    def sample_items(self):
        return [
            OrderItem("PROD-001", 2, Decimal("29.99")),
            OrderItem("PROD-002", 1, Decimal("49.99")),
        ]

    @pytest.fixture
    def order(self, sample_items):
        return Order(items=sample_items)

    def test_calculate_subtotal(self, order):
        # 2 * 29.99 + 1 * 49.99 = 109.97
        assert order.calculate_subtotal() == Decimal("109.97")

    def test_calculate_subtotal_empty_order(self):
        order = Order(items=[])
        assert order.calculate_subtotal() == Decimal("0")

    def test_calculate_discount(self, order):
        order.discount_percent = Decimal("10")
        # 10% of 109.97 = 10.997
        assert order.calculate_discount() == Decimal("10.997")

    def test_calculate_total_with_discount(self, order):
        order.discount_percent = Decimal("10")
        # 109.97 - 10.997 = 98.973
        assert order.calculate_total() == Decimal("98.973")

    def test_calculate_total_no_discount(self, order):
        assert order.calculate_total() == Decimal("109.97")

    def test_add_item_new_product(self, order):
        new_item = OrderItem("PROD-003", 1, Decimal("19.99"))
        order.add_item(new_item)
        assert len(order.items) == 3

    def test_add_item_existing_product(self, order):
        # Add more of PROD-001
        existing_item = OrderItem("PROD-001", 3, Decimal("29.99"))
        order.add_item(existing_item)

        assert len(order.items) == 2  # No new item added
        prod_001 = next(i for i in order.items if i.product_id == "PROD-001")
        assert prod_001.quantity == 5  # 2 + 3


class TestOrderEdgeCases:
    """Edge case tests"""

    @pytest.mark.parametrize("discount,expected", [
        (Decimal("0"), Decimal("100")),
        (Decimal("50"), Decimal("50")),
        (Decimal("100"), Decimal("0")),
    ])
    def test_discount_percentages(self, discount, expected):
        order = Order(
            items=[OrderItem("PROD", 1, Decimal("100"))],
            discount_percent=discount
        )
        assert order.calculate_total() == expected

    def test_large_order(self):
        items = [
            OrderItem(f"PROD-{i}", 100, Decimal("99.99"))
            for i in range(1000)
        ]
        order = Order(items=items)
        # Should handle large orders without issues
        total = order.calculate_total()
        assert total == Decimal("9999000.00")
```

### JavaScript/TypeScript with Jest

```typescript
// src/services/userService.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
}

export interface CreateUserDTO {
  email: string;
  name: string;
  role?: 'admin' | 'user' | 'guest';
}

export class UserService {
  private users: Map<string, User> = new Map();

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createUser(dto: CreateUserDTO): User {
    if (!this.validateEmail(dto.email)) {
      throw new Error('Invalid email format');
    }

    if (!dto.name || dto.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }

    const user: User = {
      id: this.generateId(),
      email: dto.email.toLowerCase(),
      name: dto.name.trim(),
      role: dto.role || 'user',
    };

    this.users.set(user.id, user);
    return user;
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  findByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(
      (u) => u.email === email.toLowerCase()
    );
  }
}


// tests/userService.test.ts
import { UserService, CreateUserDTO } from '../src/services/userService';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      expect(userService.validateEmail('test@example.com')).toBe(true);
    });

    it('should return true for email with subdomain', () => {
      expect(userService.validateEmail('user@mail.example.com')).toBe(true);
    });

    it('should return false for email without @', () => {
      expect(userService.validateEmail('testexample.com')).toBe(false);
    });

    it('should return false for email without domain', () => {
      expect(userService.validateEmail('test@')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(userService.validateEmail('')).toBe(false);
    });
  });

  describe('createUser', () => {
    const validDto: CreateUserDTO = {
      email: 'john@example.com',
      name: 'John Doe',
    };

    it('should create user with valid data', () => {
      const user = userService.createUser(validDto);

      expect(user.email).toBe('john@example.com');
      expect(user.name).toBe('John Doe');
      expect(user.role).toBe('user');
      expect(user.id).toMatch(/^user_\d+_[a-z0-9]+$/);
    });

    it('should assign specified role', () => {
      const user = userService.createUser({ ...validDto, role: 'admin' });
      expect(user.role).toBe('admin');
    });

    it('should lowercase email', () => {
      const user = userService.createUser({
        ...validDto,
        email: 'John@EXAMPLE.COM',
      });
      expect(user.email).toBe('john@example.com');
    });

    it('should trim name', () => {
      const user = userService.createUser({
        ...validDto,
        name: '  John Doe  ',
      });
      expect(user.name).toBe('John Doe');
    });

    it('should throw error for invalid email', () => {
      expect(() =>
        userService.createUser({ ...validDto, email: 'invalid' })
      ).toThrow('Invalid email format');
    });

    it('should throw error for short name', () => {
      expect(() =>
        userService.createUser({ ...validDto, name: 'J' })
      ).toThrow('Name must be at least 2 characters');
    });
  });

  describe('findById', () => {
    it('should find existing user', () => {
      const created = userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      const found = userService.findById(created.id);
      expect(found).toEqual(created);
    });

    it('should return undefined for non-existent user', () => {
      expect(userService.findById('non-existent')).toBeUndefined();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email case-insensitively', () => {
      userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      const found = userService.findByEmail('TEST@EXAMPLE.COM');
      expect(found?.name).toBe('Test User');
    });
  });
});
```

### Mocking Dependencies

```python
# tests/test_payment_service.py
from unittest.mock import Mock, patch, AsyncMock
import pytest
from src.services.payment_service import PaymentService

class TestPaymentService:

    @pytest.fixture
    def mock_stripe(self):
        with patch('src.services.payment_service.stripe') as mock:
            yield mock

    @pytest.fixture
    def payment_service(self, mock_stripe):
        return PaymentService()

    def test_create_payment_intent_success(self, payment_service, mock_stripe):
        # Arrange
        mock_stripe.PaymentIntent.create.return_value = Mock(
            id="pi_123",
            client_secret="secret_123",
            status="requires_payment_method"
        )

        # Act
        result = payment_service.create_payment_intent(
            amount=1000,
            currency="usd",
            customer_id="cus_123"
        )

        # Assert
        assert result["payment_intent_id"] == "pi_123"
        assert result["client_secret"] == "secret_123"
        mock_stripe.PaymentIntent.create.assert_called_once_with(
            amount=1000,
            currency="usd",
            customer="cus_123"
        )

    def test_create_payment_intent_stripe_error(self, payment_service, mock_stripe):
        # Arrange
        mock_stripe.PaymentIntent.create.side_effect = Exception("Stripe error")

        # Act & Assert
        with pytest.raises(Exception, match="Stripe error"):
            payment_service.create_payment_intent(1000, "usd", "cus_123")


# Async mocking
class TestAsyncService:

    @pytest.mark.asyncio
    async def test_fetch_user_data(self):
        # Mock async HTTP client
        mock_client = AsyncMock()
        mock_client.get.return_value = Mock(
            status_code=200,
            json=Mock(return_value={"id": 1, "name": "John"})
        )

        service = UserDataService(http_client=mock_client)
        result = await service.fetch_user(1)

        assert result["name"] == "John"
        mock_client.get.assert_awaited_once_with("/users/1")
```

## Integration Testing

Integration tests verify that multiple components work together correctly.

### Database Integration Tests

```python
# tests/integration/test_user_repository.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.models import Base, User
from src.repositories.user_repository import UserRepository


@pytest.fixture(scope="module")
def test_engine():
    """Create test database engine"""
    engine = create_engine("postgresql://test:test@localhost:5432/test_db")
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture
def session(test_engine):
    """Create a new session for each test"""
    Session = sessionmaker(bind=test_engine)
    session = Session()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def user_repository(session):
    return UserRepository(session)


class TestUserRepository:

    def test_create_and_retrieve_user(self, user_repository, session):
        # Create user
        user = user_repository.create(
            email="test@example.com",
            name="Test User",
            password_hash="hashed_password"
        )
        session.commit()

        # Retrieve user
        retrieved = user_repository.find_by_id(user.id)

        assert retrieved is not None
        assert retrieved.email == "test@example.com"
        assert retrieved.name == "Test User"

    def test_find_by_email(self, user_repository, session):
        user_repository.create(
            email="findme@example.com",
            name="Find Me",
            password_hash="hash"
        )
        session.commit()

        found = user_repository.find_by_email("findme@example.com")
        assert found is not None
        assert found.name == "Find Me"

    def test_update_user(self, user_repository, session):
        user = user_repository.create(
            email="update@example.com",
            name="Original Name",
            password_hash="hash"
        )
        session.commit()

        user_repository.update(user.id, name="Updated Name")
        session.commit()

        updated = user_repository.find_by_id(user.id)
        assert updated.name == "Updated Name"

    def test_delete_user(self, user_repository, session):
        user = user_repository.create(
            email="delete@example.com",
            name="Delete Me",
            password_hash="hash"
        )
        session.commit()

        user_repository.delete(user.id)
        session.commit()

        deleted = user_repository.find_by_id(user.id)
        assert deleted is None

    def test_unique_email_constraint(self, user_repository, session):
        user_repository.create(
            email="unique@example.com",
            name="First",
            password_hash="hash"
        )
        session.commit()

        with pytest.raises(Exception):  # IntegrityError
            user_repository.create(
                email="unique@example.com",
                name="Second",
                password_hash="hash"
            )
            session.commit()
```

### API Integration Tests

```python
# tests/integration/test_api.py
import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.database import get_db, Base, engine


@pytest.fixture(scope="module")
def client():
    """Create test client with test database"""
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def auth_headers(client):
    """Get authentication headers"""
    # Register user
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123",
        "name": "Test User"
    })

    # Login
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "securepassword123"
    })
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


class TestUserAPI:

    def test_register_user(self, client):
        response = client.post("/api/auth/register", json={
            "email": "newuser@example.com",
            "password": "password123",
            "name": "New User"
        })

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert "id" in data
        assert "password" not in data  # Password should not be returned

    def test_register_duplicate_email(self, client):
        # First registration
        client.post("/api/auth/register", json={
            "email": "duplicate@example.com",
            "password": "password123",
            "name": "First User"
        })

        # Second registration with same email
        response = client.post("/api/auth/register", json={
            "email": "duplicate@example.com",
            "password": "password456",
            "name": "Second User"
        })

        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_login_success(self, client):
        # Register
        client.post("/api/auth/register", json={
            "email": "login@example.com",
            "password": "password123",
            "name": "Login User"
        })

        # Login
        response = client.post("/api/auth/login", json={
            "email": "login@example.com",
            "password": "password123"
        })

        assert response.status_code == 200
        assert "access_token" in response.json()
        assert response.json()["token_type"] == "bearer"

    def test_login_wrong_password(self, client):
        response = client.post("/api/auth/login", json={
            "email": "login@example.com",
            "password": "wrongpassword"
        })

        assert response.status_code == 401

    def test_get_current_user(self, client, auth_headers):
        response = client.get("/api/users/me", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["email"] == "test@example.com"

    def test_protected_route_without_auth(self, client):
        response = client.get("/api/users/me")
        assert response.status_code == 401


class TestOrderAPI:

    def test_create_order(self, client, auth_headers):
        response = client.post(
            "/api/orders",
            headers=auth_headers,
            json={
                "items": [
                    {"product_id": "PROD-001", "quantity": 2},
                    {"product_id": "PROD-002", "quantity": 1}
                ]
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert "order_id" in data
        assert data["status"] == "pending"

    def test_get_order(self, client, auth_headers):
        # Create order first
        create_response = client.post(
            "/api/orders",
            headers=auth_headers,
            json={"items": [{"product_id": "PROD-001", "quantity": 1}]}
        )
        order_id = create_response.json()["order_id"]

        # Get order
        response = client.get(f"/api/orders/{order_id}", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["order_id"] == order_id

    def test_cannot_access_other_users_order(self, client, auth_headers):
        # Create order with first user
        create_response = client.post(
            "/api/orders",
            headers=auth_headers,
            json={"items": [{"product_id": "PROD-001", "quantity": 1}]}
        )
        order_id = create_response.json()["order_id"]

        # Try to access with different user
        client.post("/api/auth/register", json={
            "email": "other@example.com",
            "password": "password123",
            "name": "Other User"
        })
        login_response = client.post("/api/auth/login", json={
            "email": "other@example.com",
            "password": "password123"
        })
        other_headers = {
            "Authorization": f"Bearer {login_response.json()['access_token']}"
        }

        response = client.get(f"/api/orders/{order_id}", headers=other_headers)
        assert response.status_code == 403
```

## End-to-End Testing

E2E tests verify complete user workflows in a real browser environment.

### Playwright E2E Tests

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should register a new user', async ({ page }) => {
    // Navigate to registration
    await page.click('text=Sign Up');

    // Fill registration form
    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');
    await page.fill('[name="name"]', 'New User');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome, New User')).toBeVisible();
  });

  test('should login existing user', async ({ page }) => {
    await page.click('text=Login');

    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.click('text=Login');

    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toContainText(
      'Invalid email or password'
    );
  });

  test('should logout user', async ({ page }) => {
    // Login first
    await page.click('text=Login');
    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Login')).toBeVisible();
  });
});


// tests/e2e/checkout.spec.ts
test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[name="email"]', 'shopper@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('complete purchase flow', async ({ page }) => {
    // Browse products
    await page.goto('/products');

    // Add items to cart
    await page.click('[data-testid="product-1"] button:text("Add to Cart")');
    await page.click('[data-testid="product-2"] button:text("Add to Cart")');

    // Verify cart badge
    await expect(page.locator('[data-testid="cart-badge"]')).toContainText('2');

    // Go to cart
    await page.click('[data-testid="cart-icon"]');
    await expect(page).toHaveURL('/cart');

    // Verify cart items
    await expect(page.locator('.cart-item')).toHaveCount(2);

    // Proceed to checkout
    await page.click('text=Proceed to Checkout');

    // Fill shipping info
    await page.fill('[name="address"]', '123 Test Street');
    await page.fill('[name="city"]', 'Test City');
    await page.fill('[name="zipCode"]', '12345');
    await page.click('text=Continue to Payment');

    // Fill payment info (test card)
    const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await stripeFrame.locator('[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('[name="cvc"]').fill('123');

    // Place order
    await page.click('text=Place Order');

    // Verify success
    await expect(page).toHaveURL(/\/orders\/\w+/);
    await expect(page.locator('text=Order Confirmed')).toBeVisible();
  });

  test('should persist cart across sessions', async ({ page, context }) => {
    // Add item to cart
    await page.goto('/products');
    await page.click('[data-testid="product-1"] button:text("Add to Cart")');

    // Close browser and reopen
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/cart');

    // Cart should still have item
    await expect(newPage.locator('.cart-item')).toHaveCount(1);
  });
});


// tests/e2e/visual-regression.spec.ts
test.describe('Visual Regression', () => {
  test('homepage looks correct', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('product page looks correct', async ({ page }) => {
    await page.goto('/products/1');
    await expect(page).toHaveScreenshot('product-page.png');
  });

  test('responsive design - mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-mobile.png');
  });
});
```

### API Contract Testing

```typescript
// tests/contract/api.spec.ts
import { test, expect } from '@playwright/test';

test.describe('API Contract Tests', () => {
  const baseUrl = process.env.API_URL || 'http://localhost:3000/api';

  test('GET /products returns correct schema', async ({ request }) => {
    const response = await request.get(`${baseUrl}/products`);

    expect(response.status()).toBe(200);

    const data = await response.json();

    // Verify array
    expect(Array.isArray(data.products)).toBe(true);

    // Verify product schema
    const product = data.products[0];
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('price');
    expect(typeof product.id).toBe('string');
    expect(typeof product.name).toBe('string');
    expect(typeof product.price).toBe('number');
  });

  test('POST /orders validates request body', async ({ request }) => {
    const response = await request.post(`${baseUrl}/orders`, {
      data: {
        items: [] // Empty items should fail
      }
    });

    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error.message).toContain('items');
  });

  test('rate limiting works correctly', async ({ request }) => {
    // Make many requests quickly
    const requests = Array(100).fill(null).map(() =>
      request.get(`${baseUrl}/products`)
    );

    const responses = await Promise.all(requests);

    // Some should be rate limited
    const rateLimited = responses.filter(r => r.status() === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

## Test-Driven Development (TDD)

TDD follows the Red-Green-Refactor cycle:

```python
# Step 1: RED - Write failing test first
def test_password_strength_validator():
    validator = PasswordValidator()

    # Weak passwords should fail
    assert not validator.is_strong("password")
    assert not validator.is_strong("12345678")
    assert not validator.is_strong("short")

    # Strong passwords should pass
    assert validator.is_strong("SecurePass123!")
    assert validator.is_strong("MyP@ssw0rd2024")


# Step 2: GREEN - Write minimal code to pass
class PasswordValidator:
    def is_strong(self, password: str) -> bool:
        if len(password) < 8:
            return False

        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_special = any(c in "!@#$%^&*" for c in password)

        return all([has_upper, has_lower, has_digit, has_special])


# Step 3: REFACTOR - Improve code while keeping tests green
class PasswordValidator:
    MIN_LENGTH = 8
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"

    def is_strong(self, password: str) -> bool:
        checks = [
            self._check_length(password),
            self._check_uppercase(password),
            self._check_lowercase(password),
            self._check_digit(password),
            self._check_special(password),
        ]
        return all(checks)

    def _check_length(self, password: str) -> bool:
        return len(password) >= self.MIN_LENGTH

    def _check_uppercase(self, password: str) -> bool:
        return any(c.isupper() for c in password)

    def _check_lowercase(self, password: str) -> bool:
        return any(c.islower() for c in password)

    def _check_digit(self, password: str) -> bool:
        return any(c.isdigit() for c in password)

    def _check_special(self, password: str) -> bool:
        return any(c in self.SPECIAL_CHARS for c in password)

    def get_feedback(self, password: str) -> list[str]:
        """Returns list of requirements not met"""
        feedback = []
        if not self._check_length(password):
            feedback.append(f"Must be at least {self.MIN_LENGTH} characters")
        if not self._check_uppercase(password):
            feedback.append("Must contain uppercase letter")
        if not self._check_lowercase(password):
            feedback.append("Must contain lowercase letter")
        if not self._check_digit(password):
            feedback.append("Must contain a number")
        if not self._check_special(password):
            feedback.append("Must contain special character")
        return feedback
```

## Test Configuration

### pytest Configuration

```ini
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --tb=short
    --strict-markers
    -ra
    --cov=src
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=80

markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
    e2e: marks tests as end-to-end tests

filterwarnings =
    ignore::DeprecationWarning
```

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '@/(.*)': '<rootDir>/src/$1',
  },
};
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Best Practices

### 1. Test Naming Convention

```python
# Good: Descriptive names that explain the scenario
def test_user_registration_with_valid_email_creates_account():
    pass

def test_user_registration_with_duplicate_email_returns_error():
    pass

def test_password_reset_with_expired_token_fails():
    pass

# Bad: Vague names
def test_registration():
    pass

def test_error():
    pass
```

### 2. Arrange-Act-Assert Pattern

```python
def test_order_total_with_discount():
    # Arrange
    order = Order(items=[
        OrderItem("PROD-1", 2, Decimal("50.00"))
    ])
    order.apply_discount(Decimal("10"))

    # Act
    total = order.calculate_total()

    # Assert
    assert total == Decimal("90.00")
```

### 3. Test Isolation

```python
# Use fixtures for setup/teardown
@pytest.fixture
def clean_database(db):
    yield db
    db.rollback()

# Each test gets fresh state
def test_create_user(clean_database):
    # Database is clean for this test
    pass
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest tests/unit --cov

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v4
      - run: pytest tests/integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npx playwright test
```

## Conclusion

A solid testing strategy combines:
- **Unit tests** for fast, isolated verification
- **Integration tests** for component interactions
- **E2E tests** for complete user workflows

Start with unit tests, add integration tests for critical paths, and use E2E tests sparingly for key user journeys. The goal is confidence in your code, not 100% coverage.

---

*Building reliable systems requires rigorous testing. Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) to discuss testing strategies.*

## Related Articles

- [GitHub Actions CI/CD Complete Guide](/blog/github-actions-cicd-complete-guide) - Automate your test pipeline
- [TypeScript Best Practices](/blog/typescript-best-practices-guide) - Type-safe testing
- [REST API Design Best Practices](/blog/rest-api-design-best-practices) - Design testable APIs
- [Python Asyncio Complete Guide](/blog/python-asyncio-complete-guide) - Test async Python code
