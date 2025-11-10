import { logout } from '../utils/auth.js';
import { router } from '../router.js';

export class Sidebar {
    static render(activePage) {
        return `
            <aside class="sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-logo">슈가데코 CMS</div>
                </div>

                <nav class="sidebar-nav">
                    <ul class="nav-menu">
                        <li class="nav-item">
                            <a href="/products" class="nav-link ${activePage === 'products' ? 'active' : ''}" data-route="/products">
                                Cafe24 상품
                            </a>
                        </li>
                        <li class="nav-item">
                            <a href="/backgrounds" class="nav-link ${activePage === 'backgrounds' ? 'active' : ''}" data-route="/backgrounds">
                                배경 이미지
                            </a>
                        </li>
                    </ul>
                </nav>

                <div class="sidebar-actions">
                    <a href="#" class="nav-link" id="logoutBtn">
                        로그아웃
                    </a>
                </div>
            </aside>
        `;
    }
    
    static attachEvents() {
        // 네비게이션 링크 이벤트
        document.querySelectorAll('.nav-link[data-route]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = e.currentTarget.getAttribute('data-route');
                router.navigate(route);
            });
        });
        
        // 로그아웃 이벤트
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
                router.navigate('/login');
            });
        }
    }
}