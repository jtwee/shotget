module.exports = () => {
    window.lazyLoadInstance && window.lazyLoadInstance.loadAll();
    const cookieBanner = document.querySelector('#banner-acceptCookies');
    cookieBanner && cookieBanner.dispatchEvent(new Event('click', { bubbles: true }));
};
