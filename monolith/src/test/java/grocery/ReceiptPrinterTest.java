import grocery.Product;
import grocery.ShoppingCart;
import grocery.ReceiptPrinter;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ReceiptPrinterTest {
    @Test
    public void testReceiptOutput() throws Exception {
        Product apple = new Product("Apple", 0.50);
        ShoppingCart cart = new ShoppingCart();
        cart.addItem(apple, 2);

        StringBuilder output = new StringBuilder();
        ReceiptPrinter printer = new ReceiptPrinter(output);
        printer.printReceipt(cart);

        String expected = "Receipt:\nApple x2: $1.00\nTotal: $1.00\n";
        assertEquals(
            expected.replace("\r\n", "\n").trim(),
            output.toString().replace("\r\n", "\n").trim()
        );
    }
} 