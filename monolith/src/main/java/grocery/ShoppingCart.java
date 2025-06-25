package grocery;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class ShoppingCart {
    private final List<CartItem> items = new ArrayList<>();
    private Discount discount = new NoDiscount();

    public void addItem(Product product, int quantity) {
        items.add(new CartItem(product, quantity));
    }

    public void removeItem(Product product) {
        Iterator<CartItem> it = items.iterator();
        while (it.hasNext()) {
            CartItem item = it.next();
            if (item.getProduct().equals(product)) {
                it.remove();
                break;
            }
        }
    }

    public void setDiscount(Discount discount) {
        this.discount = discount;
    }

    public List<CartItem> getItems() {
        return new ArrayList<>(items);
    }

    public double getTotal() {
        return items.stream().mapToDouble(CartItem::getTotalPrice).sum();
    }

    public double getTotalWithDiscount() {
        return discount.apply(getTotal());
    }
} 