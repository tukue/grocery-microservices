import grocery.TaxCalculator;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class TaxCalculatorTest {
    @Test
    public void testTaxCalculation() {
        TaxCalculator taxCalc = new TaxCalculator(0.25); // 25%
        assertEquals(25.0, taxCalc.calculateTax(100.0), 0.001);
    }

    @Test
    public void testZeroTax() {
        TaxCalculator taxCalc = new TaxCalculator(0.0);
        assertEquals(0.0, taxCalc.calculateTax(100.0), 0.001);
    }
} 