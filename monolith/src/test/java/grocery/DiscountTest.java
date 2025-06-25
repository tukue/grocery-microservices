import grocery.NoDiscount;
import grocery.PercentageDiscount;
import grocery.Discount;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class DiscountTest {
    @Test
    public void testNoDiscount() {
        Discount d = new NoDiscount();
        assertEquals(100.0, d.apply(100.0), 0.001);
    }

    @Test
    public void testPercentageDiscount() {
        Discount d = new PercentageDiscount(0.10); // 10%
        assertEquals(90.0, d.apply(100.0), 0.001);
    }
} 