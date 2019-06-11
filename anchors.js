// create section links next to each heading of certain type
function createAnchors() {
    const headers = document.querySelectorAll('h3');
    for (const header of headers) {
        // find closest parent element with id
        let element = header;
        while (!element.id && element !== document.body)
            element = element.parentElement;
        const id = element.id;
        if (!id)
            continue;

        // create link object
        const link = document.createElement('a');
        link.classList.add('anchor');
        link.innerHTML = '<i class="fas fa-link fa-sm"></i>';
        link.href = '#' + id;
        header.appendChild(link);
    }
}

// glow section when user navigates to it
function onHashChange() {
    const id = window.location.hash.replace('#', '');
    const element = document.getElementById(id);
    if (!element)
        return;

    // start css glow animation
    element.setAttribute('data-glow', 'true');
    window.setTimeout(() => element.removeAttribute('data-glow'), 2000);
}

window.addEventListener('load', createAnchors);
window.addEventListener('load', onHashChange);
window.addEventListener('hashchange', onHashChange);
