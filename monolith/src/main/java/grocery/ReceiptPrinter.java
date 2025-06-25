package grocery;

import java.io.IOException;
import java.util.Locale;

public class ReceiptPrinter {
    private final Appendable out;

    public ReceiptPrinter(Appendable out) {
        this.out = out;
    }

    public void printReceipt(ShoppingCart cart) throws IOException {
        printReceipt(cart, 0.0);
    }

    public void printReceipt(ShoppingCart cart, double tax) throws IOException {
        out.append("Receipt:\n");
        for (CartItem item : cart.getItems()) {
            out.append(String.format(Locale.US, "%s x%d: $%.2f%n",
                item.getProduct().getName(),
                item.getQuantity(),
                item.getTotalPrice()));
        }
        double total = cart.getTotal();
        double discounted = cart.getTotalWithDiscount();
        out.append(String.format(Locale.US, "Total: $%.2f%n", total));
        if (discounted < total) {
            out.append(String.format(Locale.US, "Discounted Total: $%.2f%n", discounted));
        }
        if (tax > 0.0) {
            out.append(String.format(Locale.US, "Tax: $%.2f%n", tax));
            out.append(String.format(Locale.US, "Final Total: $%.2f%n", discounted + tax));
        }
    }
} 