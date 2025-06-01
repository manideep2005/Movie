document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    
    if (email && !sessionStorage.getItem('dashboardLoaded')) {
        sessionStorage.setItem('dashboardLoaded', 'true');
        window.location.reload(true);
    }
    
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            document.documentElement.setAttribute('data-theme', this.value);
        });
    });
});