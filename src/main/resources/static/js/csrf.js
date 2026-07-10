(function() {
    // Helper to get cookie by name
    function getCookie(name) {
        let matches = document.cookie.match(new RegExp(
            "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    }

    // Intercept global fetch
    const originalFetch = window.fetch;
    window.fetch = async function() {
        let [resource, config] = arguments;
        
        // If config is not provided, methods default to GET
        if (config && config.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method.toUpperCase())) {
            const token = getCookie('XSRF-TOKEN');
            if (token) {
                config.headers = config.headers || {};
                
                // Handle different ways headers might be passed
                if (config.headers instanceof Headers) {
                    config.headers.append('X-XSRF-TOKEN', token);
                } else if (Array.isArray(config.headers)) {
                    config.headers.push(['X-XSRF-TOKEN', token]);
                } else {
                    config.headers['X-XSRF-TOKEN'] = token;
                }
            }
        }
        return originalFetch(resource, config);
    };
})();
