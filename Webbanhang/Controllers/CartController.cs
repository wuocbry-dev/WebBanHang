using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using Webbanhang.Extensions;
using Webbanhang.Models;

namespace Webbanhang.Controllers
{
    [Authorize]
    public class CartController : Controller
    {
        private const string CartSessionKey = "SHOPPING_CART";

        public IActionResult Index()
        {
            return View(GetCart());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Add(int id, int quantity = 1, string? returnUrl = null)
        {
            var product = ProductRepository.Products.FirstOrDefault(p => p.Id == id);
            if (product == null)
            {
                return NotFound();
            }

            quantity = Math.Clamp(quantity, 1, 99);
            var cart = GetCart();
            var item = cart.FirstOrDefault(i => i.ProductId == id);

            if (item == null)
            {
                cart.Add(new CartItem
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Price = product.Price,
                    ImageUrl = product.ImageUrl,
                    Quantity = quantity
                });
            }
            else
            {
                item.Quantity = Math.Clamp(item.Quantity + quantity, 1, 99);
            }

            SaveCart(cart);
            var message = $"Đã thêm {product.Name} vào giỏ hàng.";
            TempData["CartMessage"] = message;

            if (IsAjaxRequest())
            {
                var count = cart.Sum(cartItem => cartItem.Quantity);
                return Json(new { message, count });
            }

            if (!string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl))
            {
                return Redirect(returnUrl);
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Update(int id, int quantity)
        {
            var cart = GetCart();
            var item = cart.FirstOrDefault(i => i.ProductId == id);

            if (item != null)
            {
                if (quantity <= 0)
                {
                    cart.Remove(item);
                    TempData["CartMessage"] = "Đã xóa sản phẩm khỏi giỏ hàng.";
                }
                else
                {
                    item.Quantity = Math.Clamp(quantity, 1, 99);
                    TempData["CartMessage"] = "Đã cập nhật số lượng sản phẩm.";
                }

                SaveCart(cart);
            }

            if (IsAjaxRequest())
            {
                return CartJson(cart, id);
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Increase(int id)
        {
            var cart = GetCart();
            var item = cart.FirstOrDefault(i => i.ProductId == id);

            if (item != null)
            {
                item.Quantity = Math.Clamp(item.Quantity + 1, 1, 99);
                SaveCart(cart);
            }

            if (IsAjaxRequest())
            {
                return CartJson(cart, id);
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Decrease(int id)
        {
            var cart = GetCart();
            var item = cart.FirstOrDefault(i => i.ProductId == id);

            if (item != null)
            {
                item.Quantity--;
                if (item.Quantity <= 0)
                {
                    cart.Remove(item);
                }

                SaveCart(cart);
            }

            if (IsAjaxRequest())
            {
                return CartJson(cart, id);
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Remove(int id)
        {
            var cart = GetCart();
            var item = cart.FirstOrDefault(i => i.ProductId == id);

            if (item != null)
            {
                cart.Remove(item);
                SaveCart(cart);
                TempData["CartMessage"] = "Đã xóa sản phẩm khỏi giỏ hàng.";
            }

            if (IsAjaxRequest())
            {
                return CartJson(cart, id);
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult Clear()
        {
            SaveCart(new List<CartItem>());
            TempData["CartMessage"] = "Đã xóa toàn bộ giỏ hàng.";
            return RedirectToAction(nameof(Index));
        }

        private List<CartItem> GetCart()
        {
            return HttpContext.Session.GetJson<List<CartItem>>(CartSessionKey) ?? new List<CartItem>();
        }

        private void SaveCart(List<CartItem> cart)
        {
            HttpContext.Session.SetJson(CartSessionKey, cart);
        }

        private bool IsAjaxRequest()
        {
            return Request.Headers["X-Requested-With"] == "XMLHttpRequest";
        }

        private JsonResult CartJson(List<CartItem> cart, int changedProductId)
        {
            var subTotal = cart.Sum(item => item.LineTotal);
            var shippingFee = subTotal > 0 ? 30000 : 0;
            var discount = subTotal >= 500000 ? 50000 : 0;
            var total = subTotal + shippingFee - discount;
            var changedItem = cart.FirstOrDefault(item => item.ProductId == changedProductId);

            return Json(new
            {
                isEmpty = !cart.Any(),
                count = cart.Sum(item => item.Quantity),
                changedProductId,
                item = changedItem == null ? null : new
                {
                    quantity = changedItem.Quantity,
                    lineTotal = FormatCurrency(changedItem.LineTotal)
                },
                summary = new
                {
                    subTotal = FormatCurrency(subTotal),
                    shippingFee = FormatCurrency(shippingFee),
                    discount = $"-{FormatCurrency(discount)}",
                    total = FormatCurrency(total)
                }
            });
        }

        private static string FormatCurrency(decimal value)
        {
            return $"{value.ToString("N0", CultureInfo.InvariantCulture)} đ";
        }
    }
}
