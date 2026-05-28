// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.
document.addEventListener("DOMContentLoaded", () => {
    const autoDismissDelay = 3000;
    const alerts = document.querySelectorAll(".alert");
    const vndInputs = document.querySelectorAll(".js-vnd-input");

    alerts.forEach((alert) => {
        const closeButton = alert.querySelector(".alert-close");
        if (closeButton) {
            closeButton.addEventListener("click", () => dismissAlert(alert));
        }

        window.setTimeout(() => dismissAlert(alert), autoDismissDelay);
    });

    const savedScrollPosition = sessionStorage.getItem("scrollPosition");
    if (savedScrollPosition) {
        window.scrollTo(0, Number.parseInt(savedScrollPosition, 10));
        sessionStorage.removeItem("scrollPosition");
    }

    vndInputs.forEach((input) => {
        formatVndInput(input);

        input.addEventListener("input", () => formatVndInput(input));
        input.addEventListener("focus", () => moveCaretBeforeVnd(input));
        input.addEventListener("click", () => moveCaretBeforeVnd(input));

        input.form?.addEventListener("submit", () => {
            input.value = getVndDigits(input.value);
        }, true);
    });

    const addToCartForms = document.querySelectorAll(".add-cart-form, .detail-cart-form");
    addToCartForms.forEach((form) => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formData = new FormData(form);
            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: formData,
                    headers: {
                        "X-Requested-With": "XMLHttpRequest"
                    }
                });

                if (!response.ok) {
                    form.submit();
                    return;
                }

                const data = await response.json();
                if (data?.message) {
                    showAlert(form, data.message);
                }

                if (Number.isFinite(data?.count)) {
                    const cartCount = document.querySelector(".cart-count");
                    if (cartCount) {
                        cartCount.textContent = data.count;
                    }
                }
            } catch {
                form.submit();
            }
        });
    });
});

const dismissAlert = (alert) => {
    if (!alert || alert.classList.contains("is-dismissed")) {
        return;
    }

    alert.classList.add("is-dismissed");

    const removeAlert = () => {
        if (alert.parentElement) {
            alert.remove();
        }
    };

    alert.addEventListener("transitionend", removeAlert, { once: true });
    window.setTimeout(removeAlert, 250);
};

const getVndDigits = (value) => {
    const currencyValue = value.replace(/\s*VND\s*$/i, "").trim();
    const wholeNumber = currencyValue.includes(".") && !currencyValue.includes(",")
        ? currencyValue.split(".")[0]
        : currencyValue;

    return wholeNumber.replace(/\D/g, "");
};

const formatVndInput = (input) => {
    const digits = getVndDigits(input.value);
    input.value = digits ? `${Number.parseInt(digits, 10).toLocaleString("en-US")} VND` : "";
    moveCaretBeforeVnd(input);
};

const moveCaretBeforeVnd = (input) => {
    window.requestAnimationFrame(() => {
        const suffixStart = input.value.indexOf(" VND");
        const caretPosition = suffixStart === -1 ? input.value.length : suffixStart;
        input.setSelectionRange(caretPosition, caretPosition);
    });
};

window.addEventListener("beforeunload", () => {
    sessionStorage.setItem("scrollPosition", window.scrollY.toString());
});

const showAlert = (_form, message) => {
    const container = getToastContainer();
    const alert = document.createElement("div");
    alert.className = "alert toast-alert";
    alert.setAttribute("role", "alert");
    alert.innerHTML = `
        <i class="fa-solid fa-circle-check"></i>
        <span>${message}</span>
        <button type="button" class="alert-close" aria-label="Đóng thông báo">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    const closeButton = alert.querySelector(".alert-close");
    if (closeButton) {
        closeButton.addEventListener("click", () => dismissAlert(alert));
    }

    container.appendChild(alert);
    window.setTimeout(() => dismissAlert(alert), 3000);
};

const getToastContainer = () => {
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    return container;
};
