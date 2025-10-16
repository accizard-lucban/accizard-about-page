// AcciZard Landing Page JavaScript
console.log('Script.js loaded successfully');

// Mobile Navigation
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing News Manager...');
    
    // Mobile navigation toggle
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (navToggle && navLinks) {
        console.log('NavToggle found:');
        console.log('▸', navToggle);
        console.log('NavLinks found:');
        console.log('▸', navLinks);
        
        navToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
        
        console.log('Mobile navigation elements found, setting up event listeners...');
        console.log('Mobile navigation setup complete! ✓');
    }
});

// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Close mobile menu if open
                const navLinksElement = document.getElementById('navLinks');
                const navToggle = document.getElementById('navToggle');
                if (navLinksElement && navToggle) {
                    navLinksElement.classList.remove('active');
                    navToggle.classList.remove('active');
                }
            }
        });
    });
});

// AOS Animation initialization
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            once: true,
            offset: 100
        });
    }
});

// FAQ Toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const header = item.querySelector('.faq-header');
        const answer = item.querySelector('.faq-answer');
        const icon = item.querySelector('.faq-icon');
        
        if (header && answer && icon) {
            header.addEventListener('click', function() {
                const isActive = item.classList.contains('active');
                
                // Close all other FAQ items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        const otherAnswer = otherItem.querySelector('.faq-answer');
                        const otherIcon = otherItem.querySelector('.faq-icon');
                        if (otherAnswer && otherIcon) {
                            otherAnswer.style.maxHeight = null;
                            otherIcon.textContent = '+';
                        }
                    }
                });
                
                // Toggle current item
                if (isActive) {
                    item.classList.remove('active');
                    answer.style.maxHeight = null;
                    icon.textContent = '+';
                } else {
                    item.classList.add('active');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    icon.textContent = '×';
                }
            });
        }
    });
});

// Video card functionality
document.addEventListener('DOMContentLoaded', function() {
    const videoCards = document.querySelectorAll('.video-card');
    
    videoCards.forEach(card => {
        card.addEventListener('click', function() {
            const videoSrc = this.getAttribute('data-video');
            const playBtn = this.querySelector('.play-btn');
            
            if (videoSrc && playBtn) {
                // Create modal for video
                const modal = document.createElement('div');
                modal.className = 'video-modal';
                modal.innerHTML = `
                    <div class="video-modal-content">
                        <span class="video-close">&times;</span>
                        <video controls autoplay>
                            <source src="${videoSrc}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                `;
                
                // Add modal styles
                const style = document.createElement('style');
                style.textContent = `
                    .video-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.9);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                    }
                    .video-modal-content {
                        position: relative;
                        max-width: 90%;
                        max-height: 90%;
                    }
                    .video-close {
                        position: absolute;
                        top: -40px;
                        right: 0;
                        color: white;
                        font-size: 30px;
                        cursor: pointer;
                        z-index: 1001;
                    }
                    .video-modal video {
                        width: 100%;
                        height: auto;
                        max-height: 80vh;
                    }
                `;
                document.head.appendChild(style);
                document.body.appendChild(modal);
                
                // Close modal functionality
                const closeBtn = modal.querySelector('.video-close');
                closeBtn.addEventListener('click', function() {
                    document.body.removeChild(modal);
                    document.head.removeChild(style);
                });
                
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        document.body.removeChild(modal);
                        document.head.removeChild(style);
                    }
                });
            }
        });
    });
});

console.log('Script.js initialization complete');


