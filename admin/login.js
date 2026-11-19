const form = document.querySelector('#login-form');
const errorNode = document.querySelector('#login-error');

form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    errorNode.hidden = true;
    button.disabled = true;
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ email, password })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Sign in failed.');
        window.location.assign('/admin');
    } catch (error) {
        errorNode.textContent = error.message;
        errorNode.hidden = false;
        form.elements.password.value = '';
        form.elements.password.focus();
    } finally {
        button.disabled = false;
    }
});
