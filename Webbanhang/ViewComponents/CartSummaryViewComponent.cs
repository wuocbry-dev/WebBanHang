using Microsoft.AspNetCore.Mvc;
using Webbanhang.Extensions;
using Webbanhang.Models;

namespace Webbanhang.ViewComponents
{
    public class CartSummaryViewComponent : ViewComponent
    {
        private const string CartSessionKey = "SHOPPING_CART";

        public IViewComponentResult Invoke()
        {
            var cart = HttpContext.Session.GetJson<List<CartItem>>(CartSessionKey) ?? new List<CartItem>();
            return View(cart);
        }
    }
}
