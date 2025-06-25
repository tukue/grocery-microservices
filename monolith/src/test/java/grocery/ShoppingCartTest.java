import grocery.Product;
import grocery.ShoppingCart;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ShoppingCartTest {
    @Test
    public void testTotalCalculation() {
        Product apple = new Product("Apple", 0.50);
        Product bread = new Product("Bread", 2.00);

        ShoppingCart cart = new ShoppingCart();
        cart.addItem(apple, 4);
        cart.addItem(bread, 1);

        assertEquals(4 * 0.50 + 2.00, cart.getTotal(), 0.001);
    }
} 