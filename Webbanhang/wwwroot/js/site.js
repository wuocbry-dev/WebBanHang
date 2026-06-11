// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.
document.addEventListener("DOMContentLoaded", () => {
    window.requestAnimationFrame(() => document.body.classList.add("is-page-ready"));

    const autoDismissDelay = 3000;
    movePageAlertsToToastContainer();

    const alerts = document.querySelectorAll(".alert");
    const vndInputs = document.querySelectorAll(".js-vnd-input");
    const imagePasteBoxes = document.querySelectorAll(".js-image-paste-box");

    alerts.forEach((alert) => {
        const closeButton = alert.querySelector(".alert-close");
        if (closeButton) {
            closeButton.addEventListener("click", () => dismissAlert(alert));
        }

        window.setTimeout(() => dismissAlert(alert), autoDismissDelay);
    });

    vndInputs.forEach((input) => {
        formatVndInput(input);
        validateVndInput(input);

        input.addEventListener("input", () => {
            formatVndInput(input);
            validateVndInput(input);
        });
        input.addEventListener("blur", () => validateVndInput(input));
        input.addEventListener("focus", () => moveCaretBeforeVnd(input));
        input.addEventListener("click", () => moveCaretBeforeVnd(input));

        input.form?.addEventListener("submit", (event) => {
            const formVndInputs = input.form.querySelectorAll(".js-vnd-input");
            const isInvalid = Array.from(formVndInputs).some((field) => !validateVndInput(field));

            if (isInvalid) {
                event.preventDefault();
                input.form.reportValidity();
                return;
            }

            input.value = getVndDigits(input.value);
        }, true);
    });

    imagePasteBoxes.forEach((box) => setupImagePasteBox(box));
    setupCartActionForms();
    setupCartQuantityInputs();

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

const movePageAlertsToToastContainer = () => {
    const pageAlerts = document.querySelectorAll(".cart-alert:not(.toast-alert)");
    if (!pageAlerts.length) {
        return;
    }

    const container = getToastContainer();
    pageAlerts.forEach((alert) => {
        alert.classList.add("toast-alert");
        container.appendChild(alert);
    });
};

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

const validateVndInput = (input) => {
    const digits = getVndDigits(input.value);
    const value = digits ? Number.parseInt(digits, 10) : null;
    const min = input.dataset.vndMin ? Number.parseInt(input.dataset.vndMin, 10) : null;
    const max = input.dataset.vndMax ? Number.parseInt(input.dataset.vndMax, 10) : null;

    input.setCustomValidity("");

    if (input.required && value === null) {
        input.setCustomValidity("Vui lòng nhập giá bán.");
        return false;
    }

    if (value === null) {
        return true;
    }

    if (min !== null && value < min) {
        input.setCustomValidity(`Giá bán phải từ ${min.toLocaleString("en-US")} VND trở lên.`);
        return false;
    }

    if (max !== null && value > max) {
        input.setCustomValidity(`Giá bán không được vượt quá ${max.toLocaleString("en-US")} VND.`);
        return false;
    }

    return true;
};

const moveCaretBeforeVnd = (input) => {
    window.requestAnimationFrame(() => {
        const suffixStart = input.value.indexOf(" VND");
        const caretPosition = suffixStart === -1 ? input.value.length : suffixStart;
        input.setSelectionRange(caretPosition, caretPosition);
    });
};

const setupImagePasteBox = (box) => {
    const form = box.closest("form");
    const imageValue = form?.querySelector(".js-image-value");
    const preview = box.querySelector(".js-image-preview");
    const fileInput = box.querySelector(".js-image-file");
    const fileButton = box.querySelector(".image-file-btn");

    if (!imageValue || !preview) {
        return;
    }

    const setImage = (file) => {
        if (!file?.type?.startsWith("image/")) {
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            imageValue.value = reader.result;
            preview.src = reader.result;

            const editPreviewImage = document.querySelector(".js-edit-preview-image");
            if (editPreviewImage) {
                editPreviewImage.src = reader.result;
            }

            box.classList.add("has-image");
        });
        reader.readAsDataURL(file);
    };

    box.addEventListener("paste", (event) => {
        const imageFile = Array.from(event.clipboardData?.files ?? [])
            .find((file) => file.type.startsWith("image/"));

        if (imageFile) {
            event.preventDefault();
            setImage(imageFile);
        }
    });

    box.addEventListener("click", () => box.focus());

    fileButton?.addEventListener("click", () => fileInput?.click());
    fileInput?.addEventListener("change", () => setImage(fileInput.files?.[0]));
};

const setupCartActionForms = () => {
    const forms = document.querySelectorAll(".js-cart-action-form");

    forms.forEach((form) => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            if (form.classList.contains("is-loading")) {
                return;
            }

            const cartItem = form.closest(".js-cart-item");
            const cartPage = form.closest(".js-cart-page");
            const submitButtons = cartItem?.querySelectorAll("button") ?? form.querySelectorAll("button");

            form.classList.add("is-loading");
            cartItem?.classList.add("is-updating");
            submitButtons.forEach((button) => button.disabled = true);

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    headers: {
                        "X-Requested-With": "XMLHttpRequest"
                    }
                });

                if (!response.ok) {
                    HTMLFormElement.prototype.submit.call(form);
                    return;
                }

                const data = await response.json();
                updateCartUi(data, cartPage);
            } catch {
                HTMLFormElement.prototype.submit.call(form);
            } finally {
                form.classList.remove("is-loading");
                cartItem?.classList.remove("is-updating");
                submitButtons.forEach((button) => button.disabled = false);
            }
        });
    });
};

const setupCartQuantityInputs = () => {
    const inputs = document.querySelectorAll(".js-cart-qty-input");

    inputs.forEach((input) => {
        input.dataset.lastValue = input.value;

        input.addEventListener("change", () => submitQuantityInput(input));
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                input.blur();
                submitQuantityInput(input);
            }
        });
    });
};

const submitQuantityInput = (input) => {
    const value = Number.parseInt(input.value, 10);
    const normalizedValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), 99) : 1;
    input.value = normalizedValue.toString();

    if (input.dataset.lastValue === input.value) {
        return;
    }

    input.dataset.lastValue = input.value;
    input.closest("form")?.requestSubmit();
};

const updateCartUi = (data, cartPage) => {
    if (!data) {
        return;
    }

    if (data.message) {
        showAlert(null, data.message);
    }

    const cartCount = document.querySelector(".cart-count");
    if (cartCount && Number.isFinite(data.count)) {
        cartCount.textContent = data.count;
    }

    if (data.summary) {
        setText(".js-summary-subtotal", data.summary.subTotal);
        setText(".js-summary-shipping", data.summary.shippingFee);
        setText(".js-summary-discount", data.summary.discount);
        setText(".js-summary-total", data.summary.total);
    }

    const productId = data.changedProductId?.toString();
    const row = productId ? document.querySelector(`.js-cart-item[data-product-id="${productId}"]`) : null;

    if (data.item && row) {
        const quantityInput = row.querySelector(".js-cart-qty-input");
        const lineTotal = row.querySelector(".js-line-total");

        if (quantityInput) {
            quantityInput.value = data.item.quantity;
            quantityInput.dataset.lastValue = data.item.quantity.toString();
        }

        if (lineTotal) {
            lineTotal.textContent = data.item.lineTotal;
            lineTotal.classList.add("is-value-updated");
            window.setTimeout(() => lineTotal.classList.remove("is-value-updated"), 280);
        }

        return;
    }

    if (row) {
        row.classList.add("is-removing");
        window.setTimeout(() => {
            row.remove();
            if (data.isEmpty || !cartPage?.querySelector(".js-cart-item")) {
                window.location.reload();
            }
        }, 180);
        return;
    }

    if (data.isEmpty) {
        window.location.reload();
    }
};

const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element && value !== undefined && value !== null) {
        element.textContent = value;
        element.classList.add("is-value-updated");
        window.setTimeout(() => element.classList.remove("is-value-updated"), 280);
    }
};

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
