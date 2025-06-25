package grocery;

public class Main {
    public static void main(String[] args) throws Exception {
        Product apple = new Product("Apple", 0.50);
        Product bread = new Product("Bread", 2.00);
        Product milk = new Product("Milk", 1.50);

        ShoppingCart cart = new ShoppingCart();
        cart.addItem(apple, 4);
        cart.addItem(bread, 1);
        cart.addItem(milk, 2);

        // Remove one item
        cart.removeItem(bread);

        // Apply a 10% discount
        cart.setDiscount(new PercentageDiscount(0.10));

        // Calculate tax
        TaxCalculator taxCalculator = new TaxCalculator(0.07); // 7% tax
        double discountedTotal = cart.getTotalWithDiscount();
        double tax = taxCalculator.calculateTax(discountedTotal);

        ReceiptPrinter printer = new ReceiptPrinter(System.out);
        printer.printReceipt(cart, tax);
    }
} 