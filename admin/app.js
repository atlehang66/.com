const state = {
    products: [],
    categories: [],
    brands: [],
    inventory: [],
    orders: [],
    customers: [],
    sales: []
};

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));
const money = (value, currency = 'USD') => new Intl.NumberFormat(undefined, {
    style: 'currency', currency, maximumFractionDigits: 2
}).format(Number(value) || 0);
const date = value => value ? new Date(value).toLocaleDateString() : '—';

async function api(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin'
    });
    if (response.status === 401 && url.startsWith('/api/admin/')) {
        window.location.assign('/admin/login');
        throw new Error('Your session expired. Sign in again.');
    }
    if (response.status === 204) return null;
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
    return result;
}

function toast(message) {
    const node = $('#toast');
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 3500);
}

function setRows(id, rows, emptyId) {
    const body = $(`#${id}`);
    body.innerHTML = rows || '';
    if (emptyId) $(`#${emptyId}`).hidden = Boolean(rows);
}

function showPanel(view) {
    const panel = document.querySelector(`[data-panel="${view}"]`);
    if (!panel) return;
    document.querySelectorAll('.admin-view').forEach(section => { section.hidden = section !== panel; });
    document.querySelectorAll('.admin-nav-item').forEach(button => {
        button.classList.toggle('is-active', button.dataset.view === view);
    });
    $('#page-title').textContent = view === 'overview' ? 'Overview' : view[0].toUpperCase() + view.slice(1);
    $('#admin-sidebar').classList.remove('is-open');
    $('#sidebar-toggle').setAttribute('aria-expanded', 'false');
    $('#sidebar-toggle').setAttribute('aria-label', 'Open admin menu');
}

function renderOrders(rows, target) {
    const content = rows.map(order => `<tr>
        <td><strong>${escapeHtml(order.orderNumber)}</strong></td>
        <td>${escapeHtml(order.customer || 'Guest')}<br><span class="muted-cell">${escapeHtml(order.email || '')}</span></td>
        <td>${escapeHtml(date(order.createdAt))}</td>
        <td><span class="status-pill ${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></td>
        <td>${escapeHtml(money(order.total, order.currency))}</td>
        ${target === 'orders' ? `<td><div class="row-actions"><select class="row-select" data-order-status="${Number(order.id)}" aria-label="Status for ${escapeHtml(order.orderNumber)}">
            ${['pending', 'paid', 'fulfilled', 'cancelled', 'refunded'].map(status => `<option value="${status}" ${status === order.status ? 'selected' : ''}>${status}</option>`).join('')}
        </select><button class="small-button" type="button" data-action="save-order" data-id="${Number(order.id)}">Save</button></div></td>` : ''}
    </tr>`).join('');
    setRows(target === 'orders' ? 'orders-body' : 'recent-orders-body', content,
        target === 'orders' ? 'orders-empty' : 'recent-orders-empty');
}

function renderProducts() {
    const query = $('#product-search').value.trim().toLowerCase();
    const filtered = state.products.filter(product =>
        [product.title, product.categoryName, product.brandName].join(' ').toLowerCase().includes(query));
    setRows('products-body', filtered.map(product => `<tr>
        <td><strong>${escapeHtml(product.title)}</strong></td>
        <td>${escapeHtml(product.categoryName)}</td>
        <td>${escapeHtml(product.brandName || '—')}</td>
        <td>${escapeHtml(money(product.price))}</td>
        <td><span class="status-pill ${escapeHtml(product.status)}">${escapeHtml(product.status)}</span></td>
        <td><div class="row-actions">
            <button class="small-button" type="button" data-action="edit-product" data-id="${Number(product.id)}">Edit</button>
            <button class="small-button danger" type="button" data-action="delete-product" data-id="${Number(product.id)}">Delete</button>
        </div></td>
    </tr>`).join(''), 'products-empty');
}

function renderCategories() {
    setRows('categories-body', state.categories.map(category => `<tr data-category-row="${Number(category.id)}">
        <td><input class="row-input" data-field="name" aria-label="Category name" maxlength="120" value="${escapeHtml(category.name)}"></td>
        <td><input class="row-input" data-field="tagline" aria-label="Category tagline" maxlength="255" value="${escapeHtml(category.tagline)}"></td>
        <td>${Number(category.productCount)}</td>
        <td><input class="row-input" data-field="sortOrder" type="number" min="0" aria-label="Category position" value="${Number(category.sortOrder)}"></td>
        <td><input class="row-check" data-field="active" type="checkbox" aria-label="Category active" ${Boolean(category.active) ? 'checked' : ''}></td>
        <td><div class="row-actions">
            <button class="small-button" type="button" data-action="save-category" data-id="${Number(category.id)}">Save</button>
            <button class="small-button danger" type="button" data-action="delete-category" data-id="${Number(category.id)}" ${Number(category.productCount) ? 'disabled title="Move or delete its products before removing this category"' : ''}>Delete</button>
        </div></td>
    </tr>`).join(''), null);
}

function renderBrands() {
    setRows('brands-body', state.brands.map(brand => `<tr data-brand-row="${Number(brand.id)}">
        <td><input class="row-input" data-field="name" aria-label="Brand name" maxlength="120" value="${escapeHtml(brand.name)}"></td>
        <td>${Number(brand.productCount)}</td>
        <td><input class="row-check" data-field="active" type="checkbox" aria-label="Brand active" ${Boolean(brand.active) ? 'checked' : ''}></td>
        <td><div class="row-actions">
            <button class="small-button" type="button" data-action="save-brand" data-id="${Number(brand.id)}">Save</button>
            <button class="small-button danger" type="button" data-action="delete-brand" data-id="${Number(brand.id)}">Delete</button>
        </div></td>
    </tr>`).join(''), 'brands-empty');
}

function renderInventory() {
    setRows('inventory-body', state.inventory.map(item => `<tr>
        <td><strong>${escapeHtml(item.product)}</strong>${item.brand ? `<br><span class="muted-cell">${escapeHtml(item.brand)}</span>` : ''}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.size)}</td>
        <td><input class="row-input" data-stock-id="${Number(item.id)}" type="number" min="0" max="2147483647" value="${item.quantity === null ? '' : Number(item.quantity)}" placeholder="Not tracked" aria-label="Stock for ${escapeHtml(item.product)} size ${escapeHtml(item.size)}"></td>
        <td><button class="small-button" type="button" data-action="save-stock" data-id="${Number(item.id)}">Save</button></td>
    </tr>`).join(''), 'inventory-empty');
}

function renderCustomers() {
    setRows('customers-body', state.customers.map(customer => `<tr>
        <td><strong>${escapeHtml(customer.name)}</strong></td><td>${escapeHtml(customer.email)}</td>
        <td>${escapeHtml(customer.phone || '—')}</td><td>${Number(customer.orderCount)}</td>
        <td>${escapeHtml(money(customer.spend))}</td>
    </tr>`).join(''), 'customers-empty');
}

function renderSales() {
    setRows('sales-body', state.sales.map(month => `<tr>
        <td><strong>${escapeHtml(month.month)}</strong></td><td>${Number(month.orders)}</td>
        <td>${escapeHtml(money(month.revenue))}</td>
    </tr>`).join(''), 'sales-empty');
}

function populateProductSelects() {
    const form = $('#product-form');
    const categorySelect = form.elements.categoryId;
    const brandSelect = form.elements.brandId;
    categorySelect.innerHTML = state.categories.filter(category => Boolean(category.active))
        .map(category => `<option value="${Number(category.id)}">${escapeHtml(category.name)}</option>`).join('');
    brandSelect.innerHTML = `<option value="">No brand</option>` + state.brands
        .filter(brand => Boolean(brand.active))
        .map(brand => `<option value="${Number(brand.id)}">${escapeHtml(brand.name)}</option>`).join('');
}

function renderSummary(summary, settings) {
    $('#metric-products').textContent = summary.products;
    $('#metric-orders').textContent = summary.orders;
    $('#metric-customers').textContent = summary.customers;
    $('#metric-revenue').textContent = money(summary.revenue);
    $('#brand-sections-setting').checked = settings.brandSectionsEnabled;
}

async function refresh() {
    const [me, summary, settings, products, categories, brands, inventory, orders, customers, sales] = await Promise.all([
        api('/api/admin/me'),
        api('/api/admin/summary'),
        api('/api/admin/settings'),
        api('/api/admin/products'),
        api('/api/admin/categories'),
        api('/api/admin/brands'),
        api('/api/admin/inventory'),
        api('/api/admin/orders'),
        api('/api/admin/customers'),
        api('/api/admin/sales')
    ]);
    $('#sidebar-email').textContent = me.email;
    state.products = products;
    state.categories = categories;
    state.brands = brands;
    state.inventory = inventory;
    state.orders = orders;
    state.customers = customers;
    state.sales = sales;
    renderSummary(summary, settings);
    renderOrders(orders.slice(0, 5), 'recent');
    renderOrders(orders, 'orders');
    renderProducts();
    renderCategories();
    renderBrands();
    renderInventory();
    renderCustomers();
    renderSales();
    populateProductSelects();
}

function openProduct(product) {
    const form = $('#product-form');
    form.reset();
    form.elements.id.value = product ? product.id : '';
    form.elements.title.value = product ? product.title : '';
    form.elements.description.value = product ? product.description : '';
    form.elements.price.value = product ? product.price : '';
    form.elements.imageUrl.value = product ? product.imageUrl : '';
    form.elements.sizeType.value = product ? product.sizeType : 'apparel';
    form.elements.status.value = product ? product.status : 'active';
    form.elements.sortOrder.value = product ? product.sortOrder : 0;
    populateProductSelects();
    if (product && !Array.from(form.elements.categoryId.options).some(option => option.value === String(product.categoryId))) {
        form.elements.categoryId.insertAdjacentHTML('beforeend',
            `<option value="${Number(product.categoryId)}">${escapeHtml(product.categoryName)} (inactive)</option>`);
    }
    form.elements.categoryId.value = product ? product.categoryId : form.elements.categoryId.options[0]?.value || '';
    if (product && product.brandId && !Array.from(form.elements.brandId.options).some(option => option.value === String(product.brandId))) {
        form.elements.brandId.insertAdjacentHTML('beforeend',
            `<option value="${Number(product.brandId)}">${escapeHtml(product.brandName)} (inactive)</option>`);
    }
    form.elements.brandId.value = product && product.brandId ? product.brandId : '';
    $('#product-dialog-title').textContent = product ? 'Edit product' : 'Add product';
    $('#product-form-error').hidden = true;
    $('#product-dialog').showModal();
}

function rowPayload(row, fields) {
    const payload = {};
    for (const field of fields) {
        const element = row.querySelector(`[data-field="${field}"]`);
        payload[field] = element.type === 'checkbox'
            ? element.checked
            : field === 'sortOrder'
                ? Number(element.value)
                : element.value.trim();
    }
    return payload;
}

async function onTableAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    try {
        if (action === 'edit-product') return openProduct(state.products.find(item => item.id === id));
        if (action === 'delete-product') {
            if (!window.confirm('Delete this product? Its saved order history will remain.')) return;
            await api(`/api/admin/products/${id}`, { method: 'DELETE' });
        } else if (action === 'save-category') {
            const row = document.querySelector(`[data-category-row="${id}"]`);
            const category = state.categories.find(item => item.id === id);
            const active = row.querySelector('[data-field="active"]').checked;
            if (!active && category.productCount && !window.confirm('Deactivating this category hides its products from the storefront. Continue?')) return;
            await api(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify({
                ...rowPayload(row, ['name', 'tagline', 'sortOrder', 'active'])
            }) });
        } else if (action === 'delete-category') {
            if (!window.confirm('Delete this category?')) return;
            await api(`/api/admin/categories/${id}`, { method: 'DELETE' });
        } else if (action === 'save-brand') {
            const row = document.querySelector(`[data-brand-row="${id}"]`);
            await api(`/api/admin/brands/${id}`, { method: 'PUT', body: JSON.stringify({
                ...rowPayload(row, ['name', 'active'])
            }) });
        } else if (action === 'delete-brand') {
            if (!window.confirm('Delete this brand? Its products will become unassigned.')) return;
            await api(`/api/admin/brands/${id}`, { method: 'DELETE' });
        } else if (action === 'save-stock') {
            const input = document.querySelector(`[data-stock-id="${id}"]`);
            const quantity = input.value === '' ? null : Number(input.value);
            if (quantity !== null && (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647)) {
                throw new Error('Stock must be a non-negative whole number.');
            }
            await api(`/api/admin/inventory/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
        } else if (action === 'save-order') {
            const status = document.querySelector(`[data-order-status="${id}"]`).value;
            const order = state.orders.find(item => item.id === id);
            if (['paid', 'fulfilled'].includes(status) && !['paid', 'fulfilled'].includes(order.status) &&
                !window.confirm('This prototype does not verify payment. Mark this order as paid or fulfilled anyway?')) return;
            await api(`/api/admin/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
        }
        await refresh();
        toast('Changes saved.');
    } catch (error) {
        toast(error.message);
    }
}

document.querySelectorAll('.admin-nav-item').forEach(button => button.addEventListener('click', () => showPanel(button.dataset.view)));
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => showPanel(button.dataset.go)));
$('#sidebar-toggle').addEventListener('click', () => {
    const sidebar = $('#admin-sidebar');
    const open = sidebar.classList.toggle('is-open');
    $('#sidebar-toggle').setAttribute('aria-expanded', String(open));
    $('#sidebar-toggle').setAttribute('aria-label', open ? 'Close admin menu' : 'Open admin menu');
});
$('#logout-button').addEventListener('click', async () => {
    try {
        await api('/api/auth/logout', { method: 'POST' });
        window.location.assign('/admin/login');
    } catch (error) {
        toast(error.message);
    }
});
$('#product-search').addEventListener('input', renderProducts);
$('#add-product-button').addEventListener('click', () => openProduct(null));
$('#product-dialog-close').addEventListener('click', () => $('#product-dialog').close());
$('#product-cancel').addEventListener('click', () => $('#product-dialog').close());
$('#products-body').addEventListener('click', onTableAction);
$('#categories-body').addEventListener('click', onTableAction);
$('#brands-body').addEventListener('click', onTableAction);
$('#inventory-body').addEventListener('click', onTableAction);
$('#orders-body').addEventListener('click', onTableAction);

$('#product-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    data.price = Number(data.price);
    data.categoryId = Number(data.categoryId);
    data.brandId = data.brandId ? Number(data.brandId) : null;
    data.sortOrder = Number(data.sortOrder || 0);
    const id = data.id;
    delete data.id;
    const errorNode = $('#product-form-error');
    errorNode.hidden = true;
    try {
        await api(id ? `/api/admin/products/${id}` : '/api/admin/products', {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(data)
        });
        $('#product-dialog').close();
        await refresh();
        toast(id ? 'Product updated.' : 'Product added.');
    } catch (error) {
        errorNode.textContent = error.message;
        errorNode.hidden = false;
    }
});

$('#category-form').addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.sortOrder = Number(data.sortOrder || 0);
    try {
        await api('/api/admin/categories', { method: 'POST', body: JSON.stringify(data) });
        event.currentTarget.reset();
        event.currentTarget.elements.sortOrder.value = 0;
        await refresh();
        toast('Category added.');
    } catch (error) {
        toast(error.message);
    }
});

$('#brand-form').addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
        await api('/api/admin/brands', { method: 'POST', body: JSON.stringify(data) });
        event.currentTarget.reset();
        await refresh();
        toast('Brand added.');
    } catch (error) {
        toast(error.message);
    }
});

$('#brand-sections-setting').addEventListener('change', async event => {
    const checkbox = event.currentTarget;
    checkbox.disabled = true;
    try {
        await api('/api/admin/settings', {
            method: 'PATCH',
            body: JSON.stringify({ brandSectionsEnabled: checkbox.checked })
        });
        toast('Storefront display setting saved.');
    } catch (error) {
        checkbox.checked = !checkbox.checked;
        toast(error.message);
    } finally {
        checkbox.disabled = false;
    }
});

refresh().catch(error => {
    if (!error.message.includes('session expired')) toast(error.message);
});
