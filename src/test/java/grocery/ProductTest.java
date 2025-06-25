import grocery.Product;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ProductTest {
    @Test
    public void testValidProduct() {
        Product p = new Product("Apple", 1.0);
        assertEquals("Apple", p.getName());
        assertEquals(1.0, p.getPrice());
    }

    @Test
    public void testNullNameThrows() {
        assertThrows(IllegalArgumentException.class, () -> new Product(null, 1.0));
    }

    @Test
    public void testEmptyNameThrows() {
        assertThrows(IllegalArgumentException.class, () -> new Product("", 1.0));
    }

    @Test
    public void testNegativePriceThrows() {
        assertThrows(IllegalArgumentException.class, () -> new Product("Apple", -1.0));
    }
} 