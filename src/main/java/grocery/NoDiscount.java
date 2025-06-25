package grocery;

public class NoDiscount implements Discount {
    @Override
    public double apply(double total) {
        return total;
    }
} 