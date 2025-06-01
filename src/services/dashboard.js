// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Function to fetch and display user bookings
    function fetchUserBookings() {
        const ticketsContainer = document.querySelector('.dashboard-card');
        if (!ticketsContainer) return;
        
        // Get email from URL or use stored email
        const urlParams = new URLSearchParams(window.location.search);
        const email = urlParams.get('email');
        
        if (email) {
            // If email is in URL, refresh the page with the latest bookings
            fetch(`/dashboard?email=${encodeURIComponent(email)}`)
                .then(response => {
                    if (response.ok) {
                        window.location.reload();
                    }
                })
                .catch(error => console.error('Error fetching bookings:', error));
        }
    }
    
    // Fetch user bookings
    fetchUserBookings();
    
    // Handle theme changes
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            document.documentElement.setAttribute('data-theme', this.value);
        });
    });
    
    // Handle preferences form submission
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(preferencesForm);
            const preferences = {
                theme: formData.get('theme'),
                notifications: formData.get('notifications') === 'on',
                language: formData.get('language'),
                email: document.getElementById('emailInput').value
            };
            
            try {
                const saveButton = preferencesForm.querySelector('button[type="submit"]');
                const originalText = saveButton.innerHTML;
                saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                saveButton.disabled = true;
                
                const response = await fetch('/save-preferences', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(preferences)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast('Preferences saved successfully!', 'success');
                } else {
                    showToast('Failed to save preferences: ' + (data.error || 'Unknown error'), 'error');
                }
                
                saveButton.innerHTML = originalText;
                saveButton.disabled = false;
            } catch (error) {
                console.error('Error saving preferences:', error);
                showToast('An error occurred while saving preferences', 'error');
            }
        });
    }
    
    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // For demo purposes, just redirect to home
            window.location.href = '/';
        });
    }
    
    // Toast notification function
    function showToast(message, type = 'info') {
        // Check if toast container exists, if not create it
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toastId = 'toast-' + Date.now();
        const toastHTML = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header ${type === 'error' ? 'bg-danger text-white' : type === 'success' ? 'bg-success text-white' : 'bg-primary text-white'}">
                    <strong class="me-auto">${type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notification'}</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        // Initialize and show the toast
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
        toast.show();
        
        // Remove toast from DOM after it's hidden
        toastElement.addEventListener('hidden.bs.toast', function() {
            toastElement.remove();
        });
    }
});