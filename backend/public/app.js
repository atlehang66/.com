/* =============================================================
   .com — Men's Fashion
   Main application script.

   Sections in this file:
   1.  Size charts + Supabase catalog loading
   2.  Category carousel rendering (horizontal scroll, replaces grid)
   3.  Carousel interaction: drag, wheel, scroll-hint, edge fades
   4.  "View All" category modal
   5.  Notifications
   6.  Cart + size selection + preview modal
   7.  Header search / category filter
   8.  Mobile drawer navigation
   9.  Sign up / log in (Supabase Auth)
   10. Checkout (PayFast handoff)
   11. Misc: cursor glow, ripple buttons, scroll-reveal
============================================================= */

/* =========================================================
   1. SIZE CHARTS + CATALOG
========================================================= */
const SIZE_CHARTS = {
    apparel: {
        label: 'Size',
        options: [
            { size: 'S',  details: 'Chest 96cm · Length 68cm' },
            { size: 'M',  details: 'Chest 102cm · Length 70cm' },
            { size: 'L',  details: 'Chest 108cm · Length 72cm' },
            { size: 'XL', details: 'Chest 114cm · Length 74cm' }
        ]
    },
    bottoms: {
        label: 'Waist',
        options: [
            { size: '30', details: 'Waist 76cm · Inseam 81cm' },
            { size: '32', details: 'Waist 81cm · Inseam 81cm' },
            { size: '34', details: 'Waist 86cm · Inseam 81cm' },
            { size: '36', details: 'Waist 91cm · Inseam 81cm' }
        ]
    },
    outerwear: {
        label: 'Size',
        options: [
            { size: 'S',  details: 'Chest 100cm · Length 70cm' },
            { size: 'M',  details: 'Chest 106cm · Length 72cm' },
            { size: 'L',  details: 'Chest 112cm · Length 74cm' },
            { size: 'XL', details: 'Chest 118cm · Length 76cm' }
        ]
    },
    footwear: {
        label: 'Size (EU)',
        options: [
            { size: '41', details: 'Foot length 26.0cm' },
            { size: '42', details: 'Foot length 26.7cm' },
            { size: '43', details: 'Foot length 27.3cm' },
            { size: '44', details: 'Foot length 28.0cm' },
            { size: '45', details: 'Foot length 28.7cm' }
        ]
    },
    accessory: {
        label: 'Size',
        options: [
            { size: 'One Size', details: 'Fits most' }
        ]
    }
};

const SUPABASE_URL = 'https://hslthecstubekjahgfzt.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vorzX1AzK6j18WhY7lGYDA_Yb7GbHkM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let PRODUCT_CATALOG = [];

async function loadCatalogFromSupabase() {
    const { data: categories, error: catError } = await supabaseClient
        .from('categories')
        .select('*')
        .order('name');

    if (catError) {
        console.error('Failed to load categories:', catError);
        return false;
    }

    const { data: products, error: prodError } = await supabaseClient
        .from('products')
        .select('*')
        .eq('is_active', true);

    if (prodError) {
        console.error('Failed to load products:', prodError);
        return false;
    }

    const shapeProduct = (p) => ({
        name: p.name,
        price: Number(p.price),
        image: p.image_url,
        description: p.description,
        sizeType: p.size_type || 'accessory'
    });

    const featuredProducts = products
        .filter((p) => p.is_featured)
        .map(shapeProduct);

    const categorySections = categories.map((cat) => ({
        id: cat.slug,
        name: cat.name,
        tagline: cat.tagline || '',
        products: products
            .filter((p) => p.category_id === cat.id)
            .map(shapeProduct)
    }));

    PRODUCT_CATALOG = [
        {
            id: 'featured',
            name: 'Featured',
            tagline: 'Hand-picked favorites, trending this week',
            products: featuredProducts
        },
        ...categorySections
    ];

    return true;
}

const AD_BANNERS = [
    {
        tag: 'Sponsored',
        headline: 'Buy 2 Tops, Get 15% Off',
        body: 'Mix and match any tops in your cart — the discount applies automatically at checkout.',
        cta: 'Shop Tops',
        href: '#category-tops'
    },
    {
        tag: 'Limited Time',
        headline: 'Free Shipping on Orders Over R75',
        body: 'No code needed — applied automatically at checkout on outerwear and footwear.',
        cta: 'Shop Footwear',
        href: '#category-footwear'
    }
];

/* =========================================================
   2. CATEGORY CAROUSEL RENDERING
   Replaces the old CSS-grid product layout with a horizontal,
   snap-scrolling row per category.
========================================================= */
function sizeChipsMarkup(sizeType) {
    const chart = SIZE_CHARTS[sizeType] || SIZE_CHARTS.accessory;
    return chart.options.map(opt =>
        `<button type="button" class="size-chip" data-size="${opt.size}" data-details="${opt.details}">${opt.size}</button>`
    ).join('');
}

function renderProductCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.product = product.name;
    card.dataset.price = product.price.toFixed(2);
    card.dataset.description = product.description;
    card.dataset.image = product.image;
    card.dataset.sizetype = product.sizeType;
    card.dataset.selectedSize = '';

    const chart = SIZE_CHARTS[product.sizeType] || SIZE_CHARTS.accessory;

    card.innerHTML = `
        <div class="product-card-media">
            <img src="${product.image}" alt="${product.name}" loading="lazy">
        </div>
        <div class="product-card-body">
            <h4 class="product-card-name">${product.name}</h4>
            <p class="product-card-price">$${product.price.toFixed(2)}</p>

            <div class="size-block">
                <span class="size-label">${chart.label}</span>
                <div class="size-row">${sizeChipsMarkup(product.sizeType)}</div>
                <p class="size-measurement">Tap a size to see measurements</p>
            </div>

            <button class="add-to-cart-btn ripple-btn" type="button">Add to Cart</button>
        </div>
    `;
    return card;
}

// One category = header (name, tagline, View All) + a horizontally
// scrolling, snap-aligned row of fixed-width cards.
function renderCategorySection(category) {
    const section = document.createElement('section');
    section.className = 'category-section';
    section.id = `category-${category.id}`;

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `
        <div class="category-header-text">
            <h3>${category.name}</h3>
            <p class="category-sub">${category.tagline || 'Explore the latest arrivals'}</p>
        </div>
        <button type="button" class="view-all-btn" data-category="${category.id}">
            View All <span aria-hidden="true">→</span>
        </button>
    `;

    // The scroll area itself, wrapped so we can position edge-fade
    // gradients and the scroll hint chevron relative to it.
    const carouselWrap = document.createElement('div');
    carouselWrap.className = 'carousel-wrap';

    const track = document.createElement('div');
    track.className = 'carousel-track';
    track.setAttribute('tabindex', '0');
    track.setAttribute('role', 'region');
    track.setAttribute('aria-label', `${category.name} products, scroll horizontally`);

    if (category.products.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'carousel-empty';
        empty.textContent = 'No products in this category yet.';
        track.appendChild(empty);
    } else {
        category.products.forEach(p => track.appendChild(renderProductCard(p)));
    }

    const hint = document.createElement('button');
    hint.type = 'button';
    hint.className = 'scroll-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.setAttribute('tabindex', '-1');
    hint.innerHTML = '<span class="scroll-hint-chevron">→</span>';

    carouselWrap.appendChild(track);
    carouselWrap.appendChild(hint);

    section.appendChild(header);
    section.appendChild(carouselWrap);

    // Only show the "swipe to see more" affordance if there's actually
    // more content than fits on screen.
    requestAnimationFrame(() => {
        if (track.scrollWidth > track.clientWidth + 8) {
            carouselWrap.classList.add('has-overflow');
        }
    });

    enableCarouselInteractions(track, carouselWrap);

    return section;
}

function renderAdBanner(ad) {
    const section = document.createElement('section');
    section.className = 'ad-banner';
    section.innerHTML = `
        <div class="ad-banner-shape" aria-hidden="true"></div>
        <div class="ad-banner-content">
            <span class="ad-tag">${ad.tag}</span>
            <h3 class="ad-headline">${ad.headline}</h3>
            <p class="ad-body">${ad.body}</p>
            <a class="ad-cta" href="${ad.href}">${ad.cta}</a>
        </div>
    `;
    return section;
}

function renderCategoryNav() {
    const nav = document.getElementById('category-nav');
    nav.innerHTML = PRODUCT_CATALOG.map(category =>
        `<a href="#category-${category.id}" class="category-pill">${category.name}</a>`
    ).join('');
}

function renderCategoryToggles() {
    const group = document.getElementById('category-toggle-group');
    const buttons = ['<button type="button" class="category-toggle-btn active" data-category="all">All</button>']
        .concat(PRODUCT_CATALOG.map(category =>
            `<button type="button" class="category-toggle-btn" data-category="${category.id}">${category.name}</button>`
        ));
    group.innerHTML = buttons.join('');
}

function renderCatalog() {
    const root = document.getElementById('catalog-root');
    root.innerHTML = '';

    let adIndex = 0;
    PRODUCT_CATALOG.forEach((category, i) => {
        const section = renderCategorySection(category);
        root.appendChild(section);
        scrollRevealObserver.observe(section);

        const categoriesSoFar = i + 1;
        const isPairBoundary = categoriesSoFar % 2 === 0;
        const isLastCategory = categoriesSoFar === PRODUCT_CATALOG.length;

        if (isPairBoundary && !isLastCategory && adIndex < AD_BANNERS.length) {
            const banner = renderAdBanner(AD_BANNERS[adIndex]);
            root.appendChild(banner);
            scrollRevealObserver.observe(banner);
            adIndex++;
        }
    });
}

/* =========================================================
   3. CAROUSEL INTERACTIONS
   CSS handles snap + momentum + native touch swipe.
   JS adds: mouse-drag, scroll-wheel, and the "hint disappears
   after first scroll" behaviour.
========================================================= */
function enableCarouselInteractions(track, wrap) {
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let hasDragged = false;

    const dismissHint = () => {
        wrap.classList.add('hint-dismissed');
    };

    // --- mouse drag-to-scroll ---
    track.addEventListener('mousedown', (e) => {
        isDown = true;
        hasDragged = false;
        track.classList.add('is-dragging');
        startX = e.pageX;
        startScroll = track.scrollLeft;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        const delta = e.pageX - startX;
        if (Math.abs(delta) > 4) hasDragged = true;
        track.scrollLeft = startScroll - delta;
    });

    const endDrag = () => {
        if (!isDown) return;
        isDown = false;
        track.classList.remove('is-dragging');
        if (hasDragged) dismissHint();
    };
    window.addEventListener('mouseup', endDrag);
    track.addEventListener('mouseleave', endDrag);

    // Prevent a drag from also firing a card-open click.
    track.addEventListener('click', (e) => {
        if (hasDragged) {
            e.stopPropagation();
            e.preventDefault();
            hasDragged = false;
        }
    }, true);

    // --- scroll wheel support (vertical wheel moves the row horizontally) ---
    track.addEventListener('wheel', (e) => {
        // Let pinch-zoom / ctrl+wheel through untouched.
        if (e.ctrlKey) return;

        const horizontalIntent = Math.abs(e.deltaY) > Math.abs(e.deltaX);
        if (!horizontalIntent) return;

        const atStart = track.scrollLeft <= 0;
        const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
        const scrollingPastStart = e.deltaY < 0 && atStart;
        const scrollingPastEnd = e.deltaY > 0 && atEnd;

        // Only hijack the wheel while there's somewhere left to go —
        // otherwise let the page scroll normally past this section.
        if (scrollingPastStart || scrollingPastEnd) return;

        e.preventDefault();
        track.scrollLeft += e.deltaY;
        dismissHint();
    }, { passive: false });

    // --- native touch swipe / momentum already handled by CSS
    //     (scroll-snap-type + -webkit-overflow-scrolling: touch) ---
    track.addEventListener('scroll', dismissHint, { passive: true });

    // --- keyboard access: left/right arrows when the track is focused ---
    track.addEventListener('keydown', (e) => {
        const card = track.querySelector('.product-card');
        const step = card ? card.getBoundingClientRect().width + 16 : 260;
        if (e.key === 'ArrowRight') {
            track.scrollLeft += step;
            dismissHint();
        } else if (e.key === 'ArrowLeft') {
            track.scrollLeft -= step;
            dismissHint();
        }
    });
}

/* =========================================================
   4. "VIEW ALL" CATEGORY MODAL
========================================================= */
const categoryModal = document.getElementById('category-modal');
const categoryModalClose = document.getElementById('category-modal-close-btn');
const categoryModalTitle = document.getElementById('category-modal-title');
const categoryModalTagline = document.getElementById('category-modal-tagline');
const categoryModalGrid = document.getElementById('category-modal-grid');

function openCategoryModal(categoryId) {
    const category = PRODUCT_CATALOG.find(c => c.id === categoryId);
    if (!category) return;

    categoryModalTitle.textContent = category.name;
    categoryModalTagline.textContent = category.tagline || '';
    categoryModalGrid.innerHTML = '';
    category.products.forEach(p => categoryModalGrid.appendChild(renderProductCard(p)));

    categoryModal.style.display = 'flex';
}

categoryModalClose.addEventListener('click', () => {
    categoryModal.style.display = 'none';
});

/* =========================================================
   5. NOTIFICATIONS
========================================================= */
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notifications-container');
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    const icon = getNotificationIcon(type);
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">
            <p class="notification-message">${message}</p>
        </div>
    `;

    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

function getNotificationIcon(type) {
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    return icons[type] || icons.info;
}

/* =========================================================
   6. CART + SIZE SELECTION + PREVIEW MODAL
   Listeners are delegated on the document since product cards
   now live in three places: the main carousels, the "View All"
   modal grid, and (implicitly) any future rendering surface.
========================================================= */
let isSignedUp = false;
let currentUser = null;
let cartItems = [];
let pendingCartItem = null;
let currentCard = null;

const modal = document.getElementById('preview-modal');
const closeBtn = document.querySelector('#preview-modal .close-btn');
const previewCartBtn = document.getElementById('preview-cart-btn');
const cartCountEl = document.getElementById('cart-count');
const cartIcon = document.getElementById('cart-icon');

const contactBtn = document.getElementById('contact-btn');
const contactModal = document.getElementById('contact-modal');
const contactCloseBtn = document.getElementById('contact-close-btn');

const searchToggleBtn = document.getElementById('search-toggle-btn');
const searchPanel = document.getElementById('search-panel');
const productSearchInput = document.getElementById('product-search');
const categoryToggleGroup = document.getElementById('category-toggle-group');
const searchNoResults = document.getElementById('search-no-results');
let activeCategoryFilter = 'all';

function selectSize(card, chip) {
    card.dataset.selectedSize = chip.dataset.size;
    card.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const measurementEl = card.querySelector('.size-measurement');
    measurementEl.textContent = chip.dataset.details;
    measurementEl.classList.add('show');

    const block = card.querySelector('.size-block');
    block.classList.remove('size-alert');
}

function flashSizePrompt(card) {
    const gridBlock = card.querySelector('.size-block');
    if (gridBlock) {
        gridBlock.classList.add('size-alert');
        setTimeout(() => gridBlock.classList.remove('size-alert'), 900);
    }
    if (modal.style.display === 'flex') {
        const modalBlock = document.getElementById('preview-size-block');
        if (modalBlock) {
            modalBlock.classList.add('size-alert');
            setTimeout(() => modalBlock.classList.remove('size-alert'), 900);
        }
    }
}

// Delegate on the whole document body so this works for cards rendered
// inside category carousels AND inside the "View All" modal grid.
document.body.addEventListener('click', (e) => {
    const viewAllBtn = e.target.closest('.view-all-btn');
    if (viewAllBtn) {
        openCategoryModal(viewAllBtn.dataset.category);
        return;
    }

    const sizeChip = e.target.closest('.size-chip');
    const addBtn = e.target.closest('.add-to-cart-btn');
    const card = e.target.closest('.product-card');
    if (!card) return;

    if (sizeChip) {
        e.stopPropagation();
        selectSize(card, sizeChip);
        return;
    }

    if (addBtn) {
        e.stopPropagation();
        attemptAddToCart(card);
        return;
    }

    openPreviewModal(card);
});

function openPreviewModal(card) {
    currentCard = card;

    document.getElementById('preview-title').textContent = card.dataset.product;
    document.getElementById('preview-description').textContent = card.dataset.description;
    document.getElementById('preview-price').textContent = `Price: $${card.dataset.price}`;
    document.getElementById('preview-image').src = card.dataset.image;

    const sizeType = card.dataset.sizetype;
    const chart = SIZE_CHARTS[sizeType] || SIZE_CHARTS.accessory;
    document.getElementById('preview-size-label').textContent = chart.label;

    const row = document.getElementById('preview-size-row');
    row.innerHTML = sizeChipsMarkup(sizeType);

    const measurementEl = document.getElementById('preview-size-measurement');
    const selected = card.dataset.selectedSize;
    if (selected) {
        const chip = row.querySelector(`.size-chip[data-size="${selected}"]`);
        if (chip) {
            chip.classList.add('active');
            measurementEl.textContent = chip.dataset.details;
            measurementEl.classList.add('show');
        }
    } else {
        measurementEl.textContent = 'Tap a size to see measurements';
        measurementEl.classList.remove('show');
    }
    document.getElementById('preview-size-block').classList.remove('size-alert');

    modal.style.display = 'flex';
}

document.getElementById('preview-size-row').addEventListener('click', (e) => {
    const chip = e.target.closest('.size-chip');
    if (!chip || !currentCard) return;

    currentCard.dataset.selectedSize = chip.dataset.size;

    currentCard.querySelectorAll('.size-chip').forEach(c => c.classList.remove('active'));
    const gridChip = currentCard.querySelector(`.size-chip[data-size="${chip.dataset.size}"]`);
    if (gridChip) gridChip.classList.add('active');
    const gridMeasurement = currentCard.querySelector('.size-measurement');
    if (gridMeasurement) {
        gridMeasurement.textContent = chip.dataset.details;
        gridMeasurement.classList.add('show');
    }

    document.getElementById('preview-size-row').querySelectorAll('.size-chip').forEach(c => c.classList.toggle('active', c === chip));
    const modalMeasurement = document.getElementById('preview-size-measurement');
    modalMeasurement.textContent = chip.dataset.details;
    modalMeasurement.classList.add('show');
    document.getElementById('preview-size-block').classList.remove('size-alert');
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
    if (e.target === contactModal) contactModal.style.display = 'none';
    if (e.target === categoryModal) categoryModal.style.display = 'none';

    const panelIsOpen = !searchPanel.hasAttribute('hidden');
    const clickedInsidePanel = searchPanel.contains(e.target);
    const clickedToggleBtn = searchToggleBtn.contains(e.target);
    if (panelIsOpen && !clickedInsidePanel && !clickedToggleBtn) {
        closeSearchPanel();
    }
});

window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    modal.style.display = 'none';
    contactModal.style.display = 'none';
    categoryModal.style.display = 'none';
    closeSearchPanel();
    closeDrawer();
});

previewCartBtn.addEventListener('click', () => {
    if (currentCard) attemptAddToCart(currentCard, { closeModalAfter: true });
});

function attemptAddToCart(card, { closeModalAfter = false } = {}) {
    const size = card.dataset.selectedSize;
    if (!size) {
        showNotification('Please select a size before adding to cart.', 'warning');
        flashSizePrompt(card);
        return;
    }

    const name = card.dataset.product;
    const price = card.dataset.price;

    if (!isSignedUp) {
        pendingCartItem = { name, price, size };
        modal.style.display = 'none';
        document.getElementById('signup').scrollIntoView({ behavior: 'smooth' });
        showNotification(`Sign up below and we'll add ${name} (size ${size}) to your cart automatically!`, 'warning');
        return;
    }

    cartItems.push({ name, price, size, id: Date.now() });
    updateCartCount();
    showNotification(`${name} (size ${size}) added to cart!`, 'success');
    if (closeModalAfter) modal.style.display = 'none';
}

function updateCartCount() {
    cartCountEl.textContent = cartItems.length;
    // Small bounce whenever the count changes, so the cart icon feels alive.
    cartCountEl.classList.remove('pulse');
    // Force reflow so the animation can be re-triggered on rapid adds.
    void cartCountEl.offsetWidth;
    cartCountEl.classList.add('pulse');
}

cartIcon.addEventListener('click', () => {
    if (cartItems.length === 0) {
        showNotification('Your cart is empty!', 'info');
        return;
    }
    let total = 0;
    cartItems.forEach(item => total += parseFloat(item.price));
    showCartModal(total);
});

function showCartModal(total) {
    const cartModal = document.createElement('div');
    cartModal.className = 'cart-modal';

    let itemsHTML = '';
    cartItems.forEach((item) => {
        itemsHTML += `
            <div class="cart-item" data-id="${item.id}">
                <span>${item.name} <span class="cart-item-size">(Size ${item.size})</span></span>
                <span class="cart-item-right" style="display:flex; align-items:center; gap:10px;">
                    $${item.price}
                    <button type="button" class="cart-item-remove" data-id="${item.id}" aria-label="Remove ${item.name} from cart" style="background:none;border:none;cursor:pointer;font-size:16px;color:#999;">&times;</button>
                </span>
            </div>`;
    });

    cartModal.innerHTML = `
        <div class="cart-modal-content">
            <div class="cart-modal-header">
                <h3>Your Cart</h3>
                <span class="cart-close-btn">&times;</span>
            </div>
            <div class="cart-items">${itemsHTML}</div>
            <div class="cart-total"><strong>Total: $${total.toFixed(2)}</strong></div>
            <button class="cart-checkout-btn ripple-btn">Proceed to Checkout</button>
        </div>
    `;

    document.body.appendChild(cartModal);

    cartModal.querySelector('.cart-close-btn').addEventListener('click', () => {
        cartModal.classList.remove('show');
        setTimeout(() => cartModal.remove(), 300);
    });

    cartModal.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('.cart-item-remove');
        if (!removeBtn) return;

        const id = Number(removeBtn.dataset.id);
        removeFromCart(id);
        removeBtn.closest('.cart-item').remove();

        if (cartItems.length === 0) {
            cartModal.classList.remove('show');
            setTimeout(() => cartModal.remove(), 300);
            showNotification('Your cart is empty!', 'info');
            return;
        }

        let newTotal = 0;
        cartItems.forEach(item => newTotal += parseFloat(item.price));
        cartModal.querySelector('.cart-total').innerHTML = `<strong>Total: $${newTotal.toFixed(2)}</strong>`;
    });

    cartModal.querySelector('.cart-checkout-btn').addEventListener('click', async () => {
        if (cartItems.length === 0) {
            showNotification('Your cart is empty!', 'warning');
            return;
        }

        let checkoutTotal = 0;
        cartItems.forEach(item => checkoutTotal += parseFloat(item.price));

        const itemName = cartItems.length === 1
            ? `${cartItems[0].name} (Size ${cartItems[0].size})`
            : `Order — ${cartItems.length} items`;

        cartModal.classList.remove('show');
        setTimeout(() => cartModal.remove(), 300);

        await startPayment(checkoutTotal, itemName);
    });

    setTimeout(() => cartModal.classList.add('show'), 10);
}

function removeFromCart(id) {
    cartItems = cartItems.filter(item => item.id !== id);
    updateCartCount();
    showNotification('Item removed from cart.', 'info', 1500);
}

// --- contact modal ---
contactBtn.addEventListener('click', () => {
    contactModal.style.display = 'flex';
});
contactCloseBtn.addEventListener('click', () => {
    contactModal.style.display = 'none';
});

/* =========================================================
   7. HEADER SEARCH / CATEGORY FILTER
========================================================= */
function openSearchPanel() {
    searchPanel.removeAttribute('hidden');
    searchToggleBtn.setAttribute('aria-expanded', 'true');
    productSearchInput.focus();
}

function closeSearchPanel() {
    searchPanel.setAttribute('hidden', '');
    searchToggleBtn.setAttribute('aria-expanded', 'false');
}

searchToggleBtn.addEventListener('click', () => {
    if (searchPanel.hasAttribute('hidden')) {
        openSearchPanel();
    } else {
        closeSearchPanel();
    }
});

productSearchInput.addEventListener('input', applyFilters);

categoryToggleGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-toggle-btn');
    if (!btn) return;
    activeCategoryFilter = btn.dataset.category;
    categoryToggleGroup.querySelectorAll('.category-toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
    applyFilters();
});

function applyFilters() {
    const term = productSearchInput.value.trim().toLowerCase();
    const isFiltering = term !== '' || activeCategoryFilter !== 'all';
    let totalVisible = 0;

    document.querySelectorAll('.category-section').forEach(section => {
        const categoryId = section.id.replace('category-', '');
        const matchesCategory = activeCategoryFilter === 'all' || categoryId === activeCategoryFilter;

        let visibleInSection = 0;
        section.querySelectorAll('.product-card').forEach(card => {
            const matchesTerm = !term || card.dataset.product.toLowerCase().includes(term);
            const show = matchesCategory && matchesTerm;
            card.classList.toggle('is-filtered-out', !show);
            if (show) visibleInSection++;
        });

        section.classList.toggle('is-filtered-out', visibleInSection === 0);
        totalVisible += visibleInSection;
    });

    document.querySelectorAll('.ad-banner').forEach(banner => {
        banner.classList.toggle('is-hidden-by-filter', isFiltering)
    });

    searchNoResults.hidden = totalVisible !== 0;
}

/* =========================================================
   8. MOBILE DRAWER NAVIGATION
========================================================= */
const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileDrawer = document.getElementById('mobile-drawer');
const drawerOverlay = document.getElementById('drawer-overlay');
const drawerCloseBtn = document.getElementById('drawer-close-btn');

function openDrawer() {
    mobileDrawer.classList.add('open');
    drawerOverlay.hidden = false;
    requestAnimationFrame(() => drawerOverlay.classList.add('show'));
    mobileDrawer.setAttribute('aria-hidden', 'false');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open');
}

function closeDrawer() {
    mobileDrawer.classList.remove('open');
    drawerOverlay.classList.remove('show');
    mobileDrawer.setAttribute('aria-hidden', 'true');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
    setTimeout(() => { drawerOverlay.hidden = true; }, 300);
}

hamburgerBtn.addEventListener('click', () => {
    if (mobileDrawer.classList.contains('open')) {
        closeDrawer();
    } else {
        openDrawer();
    }
});

drawerCloseBtn.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

// Drawer links: real anchors navigate + close the drawer; the placeholder
// items (Orders, Wishlist, About) don't have a page yet, so they just
// surface a friendly notification instead of doing nothing.
mobileDrawer.addEventListener('click', (e) => {
    const link = e.target.closest('.drawer-link');
    if (!link) return;

    const action = link.dataset.action;
    if (action === 'search') {
        e.preventDefault();
        closeDrawer();
        openSearchPanel();
        return;
    }
    if (action === 'cart') {
        e.preventDefault();
        closeDrawer();
        cartIcon.click();
        return;
    }
    if (action === 'contact') {
        e.preventDefault();
        closeDrawer();
        contactBtn.click();
        return;
    }
    if (action === 'orders' || action === 'wishlist' || action === 'about') {
        e.preventDefault();
        closeDrawer();
        showNotification("This page isn't available yet — check back soon!", 'info');
        return;
    }

    closeDrawer();
});

/* =========================================================
   9. SIGN UP / LOG IN (Supabase Auth)
========================================================= */
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSignupBtn = document.getElementById('auth-signup-btn');
const authLoginBtn = document.getElementById('auth-login-btn');
const authLogoutBtn = document.getElementById('auth-logout-btn');
const authStatus = document.getElementById('auth-status');

function setLoggedIn(email) {
    isSignedUp = true;
    authEmailInput.style.display = 'none';
    authPasswordInput.style.display = 'none';
    authSignupBtn.style.display = 'none';
    authLoginBtn.style.display = 'none';
    authLogoutBtn.style.display = 'inline-block';
    authStatus.textContent = `Signed in as ${email}`;
}

function setLoggedOut() {
    isSignedUp = false;
    currentUser = null;
    authEmailInput.style.display = 'inline-block';
    authPasswordInput.style.display = 'inline-block';
    authSignupBtn.style.display = 'inline-block';
    authLoginBtn.style.display = 'inline-block';
    authLogoutBtn.style.display = 'none';
    authStatus.textContent = '';
    authEmailInput.value = '';
    authPasswordInput.value = '';
}

authSignupBtn.addEventListener('click', async () => {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;
    if (!email || !password) { showNotification('Enter email and password.', 'warning'); return; }

    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) { showNotification(error.message, 'error'); return; }
    if (data.session) {
        showNotification('Account created — you are logged in!', 'success');
    } else {
        showNotification('Check your email to confirm your account.', 'info', 6000);
    }
});

authLoginBtn.addEventListener('click', async () => {
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;
    if (!email || !password) { showNotification('Enter email and password.', 'warning'); return; }

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { showNotification(error.message, 'error'); return; }
    showNotification(`Welcome back, ${data.user.email}!`, 'success');
});

authLogoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    showNotification('Logged out.', 'info');
});

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        isSignedUp = true;
        currentUser = session.user;
        setLoggedIn(session.user.email);
        if (pendingCartItem) {
            cartItems.push({ ...pendingCartItem, id: Date.now() });
            updateCartCount();
            showNotification(`${pendingCartItem.name} (size ${pendingCartItem.size}) added to cart!`, 'success');
            pendingCartItem = null;
        }
    }
    if (event === 'SIGNED_OUT') {
        setLoggedOut();
        document.getElementById('signup').scrollIntoView({ behavior: 'smooth' });
    }
});

// Restore session on page load. (Note: this used to run twice, once here
// and once in a duplicate block that called undefined functions — that
// duplicate has been removed.)
supabaseClient.auth.getSession().then(({ data }) => {
    if (data.session) {
        isSignedUp = true;
        currentUser = data.session.user;
        setLoggedIn(data.session.user.email);
    }
});

/* =========================================================
   10. CHECKOUT (PayFast handoff)
========================================================= */
async function startPayment(amount, itemName) {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
        showNotification('Please log in before checking out.', 'warning');
        document.getElementById('signup').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    showNotification('Redirecting you to PayFast…', 'info');

    let res;
    try {
        res = await fetch('/api/payments/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amount, item_name: itemName }),
        });
    } catch (err) {
        console.error('Network error reaching /api/payments/initiate:', err);
        showNotification('Could not reach the payment server.', 'error');
        return;
    }

    if (!res.ok) {
        const errText = await res.text();
        console.error('Payment initiation failed:', res.status, errText);
        showNotification('Could not start checkout. Please try again.', 'error');
        return;
    }

    const { paymentUrl, paymentData } = await res.json();

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentUrl;

    Object.entries(paymentData).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) return;
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
}

/* =========================================================
   11. MISC: cursor glow, ripple buttons, scroll-reveal
========================================================= */
// cursor glow — signup section only
const signupSection = document.getElementById('signup');
const cursorGlow = document.getElementById('cursor-glow');

document.addEventListener('mousemove', (e) => {
    const rect = signupSection.getBoundingClientRect();
    const inside = e.clientY >= rect.top && e.clientY <= rect.bottom;
    cursorGlow.style.opacity = inside ? '1' : '0';
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
});

// reveal password toggle
document.getElementById('auth-reveal-btn').addEventListener('click', () => {
    const input = document.getElementById('auth-password');
    input.type = input.type === 'password' ? 'text' : 'password';
});

// Subtle ripple on any button marked .ripple-btn — kept deliberately quiet
// (short duration, low opacity) per the "premium, not flashy" direction.
document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('.ripple-btn');
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
});

// Category sections fade in as they enter the viewport.
const scrollRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            scrollRevealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

/* =========================================================
   INITIAL LOAD
========================================================= */
(async () => {
    document.getElementById('footer-year').textContent = new Date().getFullYear();

    const root = document.getElementById('catalog-root');
    root.innerHTML = '<p class="catalog-loading">Loading products…</p>';

    const ok = await loadCatalogFromSupabase();

    if (!ok) {
        root.innerHTML = `
            <div class="catalog-error">
                <p>Could not load products right now.</p>
                <button type="button" class="btn primary" id="catalog-retry-btn">Try Again</button>
            </div>`;
        document.getElementById('catalog-retry-btn').addEventListener('click', () => location.reload());
        return;
    }

    renderCategoryNav();
    renderCategoryToggles();
    renderCatalog();
})();