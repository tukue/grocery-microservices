package grocery;

public class PercentageDiscount implements Discount {
    private final double percent;

    public PercentageDiscount(double percent) {
        this.percent = percent;
    }

    @Override
    public double apply(double total) {
        return total * (1 - percent);
    }
} 