// ─── TEACHING MOMENT ──────────────────────────────────────────
// Unit tests follow the AAA pattern:
// Arrange — set up the data you need
// Act     — call the function you're testing
// Assert  — verify the result is what you expect

describe('Price calculation helpers', () => {

  // describe() groups related tests together
  // The string is the group name shown in test output

  it('should calculate total price correctly', () => {
    // Arrange
    const price    = 999;
    const quantity = 3;

    // Act
    const total = price * quantity;

    // Assert
    // expect(value).matcher(expected)
    expect(total).toBe(2997);
  });

  it('should apply flash deal price when active', () => {
    const now          = new Date();
    const flashEndsAt  = new Date(now.getTime() + 60000); // 60 seconds from now
    const regularPrice = 999;
    const flashPrice   = 499;

    // Is the flash deal currently active?
    const isFlash     = flashEndsAt > now;
    const actualPrice = isFlash ? flashPrice : regularPrice;

    expect(isFlash).toBe(true);
    expect(actualPrice).toBe(499);
  });

  it('should NOT apply flash deal price when expired', () => {
    const now         = new Date();
    const flashEndsAt = new Date(now.getTime() - 1000); // 1 second in the past
    const flashPrice  = 499;
    const regularPrice = 999;

    const isFlash     = flashEndsAt > now;
    const actualPrice = isFlash ? flashPrice : regularPrice;

    expect(isFlash).toBe(false);
    expect(actualPrice).toBe(999);
  });

  it('should correctly identify a valid user role', () => {
    const validRoles   = ['buyer', 'seller'];
    const testRole     = 'seller';
    const invalidRole  = 'admin';

    expect(validRoles.includes(testRole)).toBe(true);
    expect(validRoles.includes(invalidRole)).toBe(false);
  });
});