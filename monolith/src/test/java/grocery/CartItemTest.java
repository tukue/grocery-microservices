import grocery.Product;
import grocery.CartItem;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CartItemTest {
    @Test
    public void testValidCartItem() {
        Product p = new Product("Apple", 1.0);
        CartItem item = new CartItem(p, 2);
        assertEquals(p, item.getProduct());
        assertEquals(2, item.getQuantity());
    }

    @Test
    public void testNullProductThrows() {
        assertThrows(IllegalArgumentException.class, () -> new CartItem(null, 2));
    }

    @Test
    public void testZeroQuantityThrows() {
        Product p = new Product("Apple", 1.0);
        assertThrows(IllegalArgumentException.class, () -> new CartItem(p, 0));
    }

    @Test
    public void testNegativeQuantityThrows() {
        Product p = new Product("Apple", 1.0);
        assertThrows(IllegalArgumentException.class, () -> new CartItem(p, -1));
    }
} 